import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "npm:zod@3.23.8";
import { callVisionJson, corsHeaders, GatewayHttpError, jsonResponse, requireAdmin } from "../_shared/famousPortraits.ts";

const BodySchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  birth_date: z.string().max(10).optional().nullable(),
  death_date: z.string().max(10).optional().nullable(),
  birth_place: z.string().max(120).optional().nullable(),
  death_place: z.string().max(120).optional().nullable(),
  profession: z.string().max(120).optional().nullable(),
  notes: z.string().max(1500).optional().nullable(),
  section: z.enum(["all", "biography", "events", "quote", "tributes"]).default("all"),
});

const today = () => new Date().toISOString().slice(0, 10);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const ctx = await requireAdmin(req);
  if (ctx instanceof Response) return ctx;

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ error: "Neispravni podaci u formi." }, 400);
  const b = parsed.data;
  const fullName = `${b.first_name} ${b.last_name}`;

  const known = [
    b.birth_date && `datum rođenja: ${b.birth_date}`,
    b.death_date && `datum smrti: ${b.death_date}`,
    b.birth_place && `mjesto rođenja: ${b.birth_place}`,
    b.death_place && `mjesto smrti: ${b.death_place}`,
    b.profession && `zanimanje: ${b.profession}`,
  ].filter(Boolean).join("; ");

  const prompt = `Ti si urednik hrvatskog portala digitalnih memorijala. Pripremi sadržaj memorijala za preminulu poznatu osobu: ${fullName}.
${known ? `Podaci koje je admin potvrdio (koristi ih točno takve): ${known}.` : ""}
${b.notes ? `Napomene admina: ${b.notes}` : ""}
Sekcija za izradu: ${b.section}.

PRAVILA:
- Piši na hrvatskom standardnom jeziku, dostojanstvenim i toplim tonom, bez HTML-a i bez markdowna.
- Navodi samo činjenice za koje si siguran. Ako nisi siguran u datum ili mjesto, vrati null i stavi naziv polja u "uncertain".
- Datumi u formatu YYYY-MM-DD, nikad nakon ${today()}; datum smrti ne smije biti prije rođenja.
- "quote" je kratka misao u spomen (1–2 rečenice), NE izmišljena izjava pripisana osobi.
- "biography": 3–5 tematskih cjelina. Svaka cjelina počinje podnaslovom u zasebnom retku oblika "## Podnaslov" (npr. "## Djetinjstvo i školovanje", "## Životno djelo", "## Nasljeđe"), a ispod 1–2 kratka odlomka (3–4 rečenice). Odlomke i cjeline odvajaj praznim retkom. Ključne pojmove, godine i djela istakni s **dvostrukim zvjezdicama** (najviše 2–3 po odlomku). Osim ## i ** ne koristi drugi markdown ni HTML.
- "events": do 10 važnih životnih događaja kronološki (year cijeli broj, title kratko, description 1–2 rečenice). Uključi samo događaje s pouzdano poznatom godinom. Nepoznate godine ne izmišljaj: takav događaj izostavi i navedi u uncertain.
- "tributes": 2–3 kratka sjećanja štovatelja (author_name izmišljeno hrvatsko ime i prezime, relationship npr. "Štovatelj", message 2–4 rečenice), gramatički rod usklađen s imenom.
- Ako osobu ne prepoznaješ ili nije preminula, postavi "person_known": false i objasni u "warning".
- KRITIČNO: Ako je osoba i dalje živa ili nemaš pouzdan podatak o smrti, vrati "death_date": null, dodaj "death_date" u "uncertain" i u "warning" napiši da osoba nije preminula. NIKAKO ne izmišljaj datum smrti.

Vrati ISKLJUČIVO JSON objekt:
{"person_known":true,"warning":null,"birth_date":null,"death_date":null,"birth_place":null,"death_place":null,"profession":null,"quote":"","biography":"","events":[{"year":1950,"title":"","description":""}],"tributes":[{"author_name":"","relationship":"","message":""}],"uncertain":[]}`;

  try {
    const result = await callVisionJson<Record<string, unknown>>(prompt, []);
    const td = today();
    for (const key of ["birth_date", "death_date"]) {
      const v = result[key];
      if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v) || v > td) result[key] = null;
    }
    if (result.birth_date && result.death_date && String(result.death_date) < String(result.birth_date)) {
      result.death_date = null;
    }
    // Osoba bez pouzdanog datuma smrti smatra se živom – ne izrađuj sadržaj.
    if (!result.death_date) {
      return jsonResponse({
        error: `Prema dostupnim podacima ${fullName} nije preminula osoba ili datum smrti nije poznat. Memorijal se ne izrađuje za žive osobe.`,
        person_alive: true,
      }, 422);
    }
    if (Array.isArray(result.events)) {
      result.events = (result.events as Array<{ year?: number }>)
        .filter((e) => e && typeof e === "object" && Number.isInteger(e.year) && Number(e.year) >= 1000 && Number(e.year) <= new Date().getFullYear())
        .sort((a, c) => Number(a.year ?? 0) - Number(c.year ?? 0));
    }
    return jsonResponse(result);
  } catch (error) {
    const status = error instanceof GatewayHttpError ? error.status : 500;
    const message = status === 402
      ? "Nema dovoljno AI kredita. Nadopunite kredite u postavkama radnog prostora."
      : status === 429
        ? "Previše zahtjeva. Pričekajte trenutak pa pokušajte ponovno."
        : error instanceof Error ? error.message : "Izrada teksta nije uspjela.";
    return jsonResponse({ error: message }, status);
  }
});
