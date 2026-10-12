import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const PORTRAIT_BUCKET = "obituary-photos";
export const IMAGE_MODEL = "openai/gpt-image-2.5-sunburst";
export const VISION_MODEL = "openai/gpt-6-astra";
export const GATEWAY_BASE_URL = "https://ai.gateway.lovable.dev/v1";

export type AdminContext = {
  admin: SupabaseClient;
  userId: string;
};

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export async function requireAdmin(req: Request): Promise<AdminContext | Response> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return jsonResponse({ error: "Neautorizirani korisnik." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Supabase nije ispravno konfiguriran." }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return jsonResponse({ error: "Prijava je istekla." }, 401);

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: data.user.id,
    _role: "admin",
  });
  if (roleError || !isAdmin) return jsonResponse({ error: "Ova radnja dostupna je samo administratorima." }, 403);
  return { admin, userId: data.user.id };
}

export function stripHtml(value?: string | null) {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function licenseAllowsEdits(licenseName?: string | null) {
  const normalized = stripHtml(licenseName).toUpperCase().replace(/\s+/g, " ").trim();
  if (!normalized) return false;
  if (normalized.includes("PUBLIC DOMAIN") || normalized === "PD" || normalized.startsWith("CC0")) return true;
  if (normalized.includes("-NC") || normalized.includes("-ND")) return false;
  return /^CC BY(?:-SA)?(?: |$)/.test(normalized);
}

export function extensionForMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export async function fetchImageBytes(url: string, maxBytes = 8 * 1024 * 1024) {
  const response = await fetch(url, {
    headers: { "User-Agent": "OsmrtnicaMemorialPortraits/1.0 (https://osmrtnica.com.hr)" },
  });
  if (!response.ok) throw new Error(`Izvorna fotografija nije dostupna (${response.status}).`);
  const mime = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
    throw new Error("Izvor nije podržana JPG, PNG ili WEBP fotografija.");
  }
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > maxBytes) throw new Error("Izvorna fotografija je prevelika.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || bytes.length > maxBytes) throw new Error("Izvorna fotografija je prazna ili prevelika.");
  return { bytes, mime };
}

export function bytesToDataUrl(bytes: Uint8Array, mime: string) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

type GatewayPayload = {
  type?: string;
  delta?: string;
  error?: { message?: string };
  response?: { error?: { message?: string } };
};

export class GatewayHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "GatewayHttpError";
    this.status = status;
  }
}

async function safeGatewayError(response: Response) {
  const raw = await response.text().catch(() => "");
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string }; message?: string };
    return parsed.error?.message || parsed.message || raw || `AI usluga vratila je pogrešku ${response.status}.`;
  } catch {
    return raw || `AI usluga vratila je pogrešku ${response.status}.`;
  }
}

async function readResponsesText(response: Response) {
  if (!response.ok || !response.body) throw new Error(await safeGatewayError(response));
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let text = "";
  let terminalError = "";

  const consumeEvent = (block: string) => {
    for (const line of block.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const payload = JSON.parse(data) as GatewayPayload;
        if (payload.type === "response.output_text.delta" && typeof payload.delta === "string") text += payload.delta;
        if (payload.type === "error" || payload.type === "response.failed") {
          terminalError = payload.error?.message || payload.response?.error?.message || "AI provjera nije uspjela.";
        }
      } catch {
        // Ignore non-JSON keepalive frames.
      }
    }
  };

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += chunk.value.replace(/\r\n/g, "\n");
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      consumeEvent(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");
    }
  }
  if (buffer.trim()) consumeEvent(buffer);
  if (terminalError) throw new Error(terminalError);
  if (!text.trim()) throw new Error("AI provjera nije vratila rezultat.");
  return text.trim();
}

export function parseJsonObject<T>(value: string): T {
  const cleaned = value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI provjera vratila je neispravan rezultat.");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

export async function callVisionJson<T>(prompt: string, imageDataUrls: string[]): Promise<T> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY nije postavljen.");
  const content: Record<string, unknown>[] = [{ type: "input_text", text: prompt }];
  imageDataUrls.forEach((imageUrl, index) => {
    content.push({ type: "input_text", text: `Fotografija ${index + 1}:` });
    content.push({ type: "input_image", image_url: imageUrl });
  });

  const requestBody = JSON.stringify({
    model: VISION_MODEL,
    input: [{ role: "user", content }],
    stream: true,
    store: false,
    reasoning: { effort: "low", summary: "auto" },
    include: ["reasoning.encrypted_content"],
  });
  let response: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) {
      const retryAfter = Number(response?.headers.get("Retry-After") ?? 0);
      const delay = retryAfter > 0 ? Math.min(retryAfter * 1000, 8000) : 1000 * (2 ** (attempt - 1));
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    response = await fetch(`${GATEWAY_BASE_URL}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: requestBody,
    });
    if (response.status !== 429 && response.status < 500) break;
  }
  if (!response) throw new Error("AI provjera nije pokrenuta.");
  if (!response.ok) throw new GatewayHttpError(response.status, await safeGatewayError(response));
  return parseJsonObject<T>(await readResponsesText(response));
}

export async function updateJobProgress(admin: SupabaseClient, jobId: string) {
  const { data: rows } = await admin
    .from("famous_portrait_photos")
    .select("status")
    .eq("job_id", jobId);
  const statuses = (rows ?? []).map((row: { status: string }) => row.status);
  const processed = statuses.filter((status: string) => status === "completed").length;
  const pending = statuses.some((status: string) => ["verified", "processing", "candidate"].includes(status));
  await admin
    .from("famous_portrait_jobs")
    .update({ processed_count: processed, status: pending ? "processing" : "completed" })
    .eq("id", jobId);
}