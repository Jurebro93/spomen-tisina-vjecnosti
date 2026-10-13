import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "npm:zod@3.23.8";
import { corsHeaders, GATEWAY_BASE_URL, IMAGE_MODEL, jsonResponse, PORTRAIT_BUCKET, requireAdmin } from "../_shared/famousPortraits.ts";

const BodySchema = z.object({
  full_name: z.string().trim().min(1).max(200),
  profession: z.string().trim().max(200).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const ctx = await requireAdmin(req);
  if (ctx instanceof Response) return ctx;
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ error: "Ime i prezime su obavezni." }, 400);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return jsonResponse({ error: "AI ključ nije postavljen." }, 500);

  const { full_name, profession } = parsed.data;
  const prompt = `Dostojanstven memorijalni portret osobe ${full_name}${profession ? ` (${profession})` : ""}. Realističan portret glave i ramena, cijela glava u kadru, lice okrenuto prema promatraču, miran i dostojanstven izražaj. Jednostavna tamna, nenametljiva pozadina, toplo studijsko svjetlo. Bez teksta, bez logotipa, bez dodatnih osoba.`;

  const res = await fetch(`${GATEWAY_BASE_URL}/images/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({ model: IMAGE_MODEL, prompt, size: "1024x1536" }),
  });
  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    const msg = res.status === 402 ? "Nema dovoljno AI kredita." : res.status === 429 ? "Previše zahtjeva, pokušajte malo kasnije." : `Izrada slike nije uspjela (${res.status}). ${raw.slice(0, 200)}`;
    return jsonResponse({ error: msg }, res.status);
  }
  const data = await res.json() as { data?: Array<{ b64_json?: string }> };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) return jsonResponse({ error: "AI nije vratio sliku." }, 502);
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const path = `memorials/generated/${crypto.randomUUID()}.png`;
  const { error } = await ctx.admin.storage.from(PORTRAIT_BUCKET).upload(path, bytes, { contentType: "image/png" });
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ storage_path: path });
});
