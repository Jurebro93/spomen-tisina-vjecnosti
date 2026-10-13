import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "npm:zod@3.23.8";
import {
  bytesToDataUrl,
  callVisionJson,
  corsHeaders,
  GATEWAY_BASE_URL,
  IMAGE_MODEL,
  jsonResponse,
  PORTRAIT_BUCKET,
  requireAdmin,
  updateJobProgress,
} from "../_shared/famousPortraits.ts";

const BodySchema = z.object({ photo_id: z.string().uuid() });

const EDIT_PROMPT = `Izradi dostojanstveni memorijalni portret iz ove stvarne izvorne fotografije.

IZ IZVORA UZMI SAMO LICE I GLAVU OSOBE I SAČUVAJ IH POTPUNO VJERNO:
- lice, identitet i dob točno kao na izvornoj fotografiji
- ne pomlađuj, ne uljepšavaj i ne zaglađuj kožu
- sačuvaj bore, kosu, oblik glave i sve karakteristične crte
- zadrži izraz lica i smjer pogleda
- ne generiraj novo lice i ne spajaj obilježja s drugim osobama

SVE OSTALO IZMISLI NANOVO:
- nova, elegantna odjeća primjerena razdoblju i životu osobe (npr. tamno odijelo, košulja, sako, haljina)
- nova pozadina: mekana, topla, zamućena studijska ili prigodna scena prikladna za memorijalnu stranicu
- profesionalno, toplo portretno osvjetljenje
- kut gledanja: blago promijeni položaj glave i kamere (npr. tričetvrtinski pogled ili lagano okrenuta glava), ali lice mora ostati jasno vidljivo i prepoznatljivo
- kadar: portret od glave do prsa, osoba centrirana, dovoljno prostora iznad glave
Rezultat mora izgledati kao kvalitetna, realistična portretna fotografija iste osobe, bez teksta i okvira.`;

type ImageEvent = { type?: string; b64_json?: string; error?: { message?: string }; storage_path?: string };
type PreservationResult = { preserved?: boolean; confidence?: number; reason?: string };

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function gatewayRequest(apiKey: string, source: Uint8Array, mime: string) {
  const createRequest = () => {
    const form = new FormData();
    form.append("model", IMAGE_MODEL);
    form.append("prompt", EDIT_PROMPT);
    form.append("image", new File([source], `source.${mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg"}`, { type: mime }));
    form.append("size", "1024x1280");
    form.append("quality", "high");
    form.append("output_format", "png");
    form.append("stream", "true");
    form.append("partial_images", "1");
    return form;
  };

  let response: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) {
      const retryAfter = Number(response?.headers.get("Retry-After") ?? 0);
      const delay = retryAfter > 0 ? Math.min(retryAfter * 1000, 8000) : 1000 * (2 ** (attempt - 1));
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    response = await fetch(`${GATEWAY_BASE_URL}/images/edits`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: createRequest(),
    });
    if (response.status !== 429 && response.status < 500) break;
  }
  return response as Response;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Metoda nije podržana." }, 405);

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  let parsed;
  try {
    parsed = BodySchema.safeParse(await req.json());
  } catch {
    return jsonResponse({ error: "Neispravan zahtjev." }, 400);
  }
  if (!parsed.success) return jsonResponse({ error: "Fotografija nije odabrana." }, 400);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return jsonResponse({ error: "LOVABLE_API_KEY nije postavljen." }, 500);
  const { admin } = auth;
  const { data: photo, error: photoError } = await admin
    .from("famous_portrait_photos")
    .select("id, job_id, source_storage_path, mime_type, status")
    .eq("id", parsed.data.photo_id)
    .maybeSingle();
  if (photoError || !photo) return jsonResponse({ error: "Fotografija nije pronađena." }, 404);
  if (!photo.source_storage_path) return jsonResponse({ error: "Izvorna fotografija nije spremljena." }, 400);

  const { data: sourceBlob, error: downloadError } = await admin.storage.from(PORTRAIT_BUCKET).download(photo.source_storage_path);
  if (downloadError || !sourceBlob) return jsonResponse({ error: "Izvornu fotografiju nije moguće učitati." }, 500);
  const source = new Uint8Array(await sourceBlob.arrayBuffer());
  if (!source.length || source.length > 8 * 1024 * 1024) return jsonResponse({ error: "Izvorna fotografija je prazna ili prevelika." }, 400);

  await admin.from("famous_portrait_photos").update({ status: "processing", error_message: null }).eq("id", photo.id);
  await admin.from("famous_portrait_jobs").update({ status: "processing" }).eq("id", photo.job_id);

  const upstream = await gatewayRequest(apiKey, source, photo.mime_type || sourceBlob.type || "image/jpeg");
  if (!upstream.ok || !upstream.body) {
    const raw = await upstream.text().catch(() => "");
    let message = raw || `Uređivanje nije uspjelo (${upstream.status}).`;
    try {
      const body = JSON.parse(raw) as { error?: { message?: string }; message?: string };
      message = body.error?.message || body.message || message;
    } catch {
      // Keep safe upstream text.
    }
    await admin.from("famous_portrait_photos").update({ status: "failed", error_message: message.slice(0, 1000) }).eq("id", photo.id);
    await updateJobProgress(admin, photo.job_id);
    return jsonResponse({ error: message }, upstream.status);
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let finalized = false;
  const editedPath = `portraits/${photo.job_id}/${photo.id}/edited.png`;

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    async transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true }).replace(/\r\n/g, "\n");
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        let eventName = "";
        let dataLine = "";
        for (const line of block.split("\n")) {
          if (line.startsWith("event:")) eventName = line.slice(6).trim();
          if (line.startsWith("data:")) dataLine += line.slice(5).trim();
        }
        let outputBlock = block;
        if (dataLine && dataLine !== "[DONE]") {
          try {
            const payload = JSON.parse(dataLine) as ImageEvent;
            const type = eventName || payload.type || "";
            if ((type === "image_edit.completed" || type === "image_generation.completed") && payload.b64_json) {
              const resultBytes = base64ToBytes(payload.b64_json);
              const preservation = await callVisionJson<PreservationResult>(
                "Usporedi dvije fotografije. Prva je izvor, druga novi memorijalni portret. Potvrdi da je lice na drugoj ista osoba " +
                "iste dobi: iste crte lica, bore, oblik glave, kosa i karakteristična obilježja. Pozadina, odjeća, osvjetljenje i kadar " +
                "SMIJU biti potpuno novi. Odbij samo ako lice pripada drugoj osobi, ako je pomlađeno, uljepšano ili zaglađeno. " +
                "Vrati isključivo JSON oblika " +
                '{"preserved":true,"confidence":0.98,"reason":"kratko obrazloženje"}.',
                [
                  bytesToDataUrl(source, photo.mime_type || sourceBlob.type || "image/jpeg"),
                  bytesToDataUrl(resultBytes, "image/png"),
                ],
              );
              if (preservation.preserved !== true || Number(preservation.confidence ?? 0) < 0.82) {
                const message = `Rezultat je odbijen jer nije dovoljno vjerno sačuvao izvornu osobu. ${String(preservation.reason ?? "").trim()}`.trim();
                await admin.from("famous_portrait_photos").update({ status: "failed", error_message: message.slice(0, 1000) }).eq("id", photo.id);
                await updateJobProgress(admin, photo.job_id);
                finalized = true;
                outputBlock = `event: error\ndata: ${JSON.stringify({ type: "error", error: { message } })}`;
                controller.enqueue(encoder.encode(`${outputBlock}\n\n`));
                boundary = buffer.indexOf("\n\n");
                continue;
              }
              const { error: uploadError } = await admin.storage
                .from(PORTRAIT_BUCKET)
                .upload(editedPath, resultBytes, { contentType: "image/png", upsert: true });
              if (uploadError) throw uploadError;
              await admin.from("famous_portrait_photos").update({
                status: "completed",
                edited_storage_path: editedPath,
                edit_preservation_verified: true,
                edit_preservation_confidence: Math.min(1, Math.max(0, Number(preservation.confidence ?? 0))),
                edit_preservation_reason: String(preservation.reason ?? "Izgled osobe sačuvan je prema izvornoj fotografiji.").slice(0, 500),
                error_message: null,
              }).eq("id", photo.id);
              await updateJobProgress(admin, photo.job_id);
              finalized = true;
              payload.storage_path = editedPath;
              outputBlock = `${eventName ? `event: ${eventName}\n` : ""}data: ${JSON.stringify(payload)}`;
            } else if (type === "error") {
              const message = payload.error?.message || "Uređivanje fotografije nije uspjelo.";
              await admin.from("famous_portrait_photos").update({ status: "failed", error_message: message.slice(0, 1000) }).eq("id", photo.id);
              await updateJobProgress(admin, photo.job_id);
              finalized = true;
            }
          } catch (error) {
            if (dataLine.includes("b64_json")) {
              const message = error instanceof Error ? error.message : "Spremanje uređene fotografije nije uspjelo.";
              await admin.from("famous_portrait_photos").update({ status: "failed", error_message: message.slice(0, 1000) }).eq("id", photo.id);
              await updateJobProgress(admin, photo.job_id);
              finalized = true;
              outputBlock = `event: error\ndata: ${JSON.stringify({ type: "error", error: { message } })}`;
            }
          }
        }
        controller.enqueue(encoder.encode(`${outputBlock}\n\n`));
        boundary = buffer.indexOf("\n\n");
      }
    },
    async flush(controller) {
      if (buffer.trim()) controller.enqueue(encoder.encode(buffer));
      if (!finalized) {
        await admin.from("famous_portrait_photos").update({
          status: "failed",
          error_message: "AI obrada završila je bez dovršene fotografije.",
        }).eq("id", photo.id);
        await updateJobProgress(admin, photo.job_id);
      }
    },
  });

  const headers = new Headers(corsHeaders);
  headers.set("Content-Type", upstream.headers.get("Content-Type") ?? "text/event-stream");
  headers.set("Cache-Control", "no-cache");
  const runId = upstream.headers.get("X-Lovable-AIG-Run-ID");
  if (runId) {
    headers.set("X-Lovable-AIG-Run-ID", runId);
    headers.set("Access-Control-Expose-Headers", "X-Lovable-AIG-Run-ID");
  }
  return new Response(upstream.body.pipeThrough(transform), { status: upstream.status, headers });
});