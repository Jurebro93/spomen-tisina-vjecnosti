import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "npm:zod@3.23.8";
import { corsHeaders, jsonResponse, requireAdmin } from "../_shared/famousPortraits.ts";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional();
const BodySchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  birth_date: dateStr,
  death_date: dateStr,
  birth_place: z.string().max(120).nullable().optional(),
  death_place: z.string().max(120).nullable().optional(),
  profession: z.string().max(120).nullable().optional(),
  quote: z.string().max(600).nullable().optional(),
  biography: z.string().max(20000).nullable().optional(),
  events: z.array(z.object({ year: z.number().int().min(1000).max(new Date().getFullYear()), title: z.string().min(1).max(200), description: z.string().max(1000).nullable().optional() })).max(30),
  tributes: z.array(z.object({ author_name: z.string().min(1).max(120), relationship: z.string().max(120).nullable().optional(), message: z.string().min(1).max(2000) })).max(10),
  images: z.array(z.object({ storage_path: z.string().min(3).max(400), title: z.string().max(200).nullable().optional(), description: z.string().max(600).nullable().optional(), portrait_photo_id: z.string().uuid().nullable().optional() })).max(12),
  cover_path: z.string().max(400).nullable().optional(),
  publish: z.boolean(),
});

const nz = (v?: string | null) => (v && v.trim() ? v.trim() : null);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const ctx = await requireAdmin(req);
  if (ctx instanceof Response) return ctx;
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ error: "Neispravni podaci: " + JSON.stringify(parsed.error.flatten().fieldErrors) }, 400);
  const b = parsed.data;
  const { admin, userId } = ctx;
  const today = new Date().toISOString().slice(0, 10);
  if (!b.death_date) return jsonResponse({ error: "Datum smrti je obavezan. Memorijal se ne izrađuje za žive osobe.", person_alive: true }, 422);
  if ((b.birth_date && b.birth_date > today) || (b.death_date && b.death_date > today)) return jsonResponse({ error: "Datumi ne smiju biti u budućnosti." }, 400);
  if (b.birth_date && b.death_date && b.death_date < b.birth_date) return jsonResponse({ error: "Datum smrti ne može biti prije rođenja." }, 400);

  // Duplicate check
  let dup = admin.from("obituaries").select("id, memorials!inner(slug)").ilike("ime", b.first_name).ilike("prezime", b.last_name);
  if (b.death_date) dup = dup.eq("datum_smrti", b.death_date);
  const { data: existing } = await dup.limit(1);
  const ex = existing?.[0] as { memorials?: { slug: string }[] | { slug: string } } | undefined;
  if (ex) {
    const m = Array.isArray(ex.memorials) ? ex.memorials[0] : ex.memorials;
    return jsonResponse({ error: "Za ovu osobu već postoji memorijal.", existing_slug: m?.slug }, 409);
  }

  const cover = b.cover_path ?? b.images[0]?.storage_path ?? null;
  const coverUrl = cover ? admin.storage.from("obituary-photos").getPublicUrl(cover).data.publicUrl : null;
  let obituaryId: string | null = null;
  let memorialId: string | null = null;
  try {
    const { data: ob, error: obErr } = await admin.from("obituaries").insert({
      ime: b.first_name, prezime: b.last_name, datum_rodenja: b.birth_date ?? null, datum_smrti: b.death_date ?? null,
      mjesto_rodenja: nz(b.birth_place), mjesto_smrti: nz(b.death_place), profesija: nz(b.profession),
      biografija: nz(b.biography), fotografija_url: coverUrl, active: false, paid: false,
    }).select("id").single();
    if (obErr) throw obErr;
    obituaryId = ob.id;

    const { data: slug, error: slugErr } = await admin.rpc("generate_memorial_slug", { _ime: b.first_name, _prezime: b.last_name, _rodenja: b.birth_date ?? null, _smrti: b.death_date ?? null });
    if (slugErr) throw slugErr;
    const now = new Date().toISOString();
    const { data: mem, error: memErr } = await admin.from("memorials").insert({
      deceased_id: obituaryId, owner_id: userId, slug, quote: nz(b.quote), life_story: nz(b.biography),
      visibility: "public", status: b.publish ? "published" : "draft", published_at: b.publish ? now : null,
      paid: true, paid_at: now, payment_method: "admin", payment_amount: 0, tributes_require_approval: false,
    }).select("id, slug").single();
    if (memErr) throw memErr;
    memorialId = mem.id;

    await admin.from("memorial_managers").insert({ memorial_id: memorialId, user_id: userId, role: "owner" });

    if (b.events.length) {
      const { error } = await admin.from("memorial_life_events").insert(b.events.map((e, i) => ({
        memorial_id: memorialId, event_year: e.year ?? null, title: e.title, description: nz(e.description), sort_order: i,
      })));
      if (error) throw error;
    }
    if (b.tributes.length) {
      const { error } = await admin.from("memorial_tributes").insert(b.tributes.map((t) => ({
        memorial_id: memorialId, author_name: t.author_name, author_email: "uredništvo@osmrtnica.com.hr",
        relationship: nz(t.relationship), message: t.message, status: "approved", consent: true, approved_at: now, approved_by: userId,
      })));
      if (error) throw error;
    }
    {
      // 4–7 candles with random dates from this year; at least one still burning (last 7 days).
      const names = ["Ana", "Marko", "Ivana", "Josip", "Marija", "Tomislav", "Katarina", "Luka", "Petra", "Ante", "Mirela", "Davor", null];
      const msgs = ["Počivaj u miru.", "Hvala na svemu što si nam ostavio.", "Zauvijek u sjećanju.", "S poštovanjem.", "Neka ti je laka zemlja.", null];
      const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
      const nowMs = Date.now();
      const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
      const count = 4 + Math.floor(Math.random() * 4);
      const rows = Array.from({ length: count }, (_, i) => {
        const t = i === 0
          ? nowMs - Math.random() * 5 * 86400000
          : yearStart + Math.random() * (nowMs - yearStart);
        const iso = new Date(t).toISOString();
        return { memorial_id: memorialId, visitor_name: pick(names), message: pick(msgs), status: "approved", created_at: iso, approved_at: iso, approved_by: userId };
      });
      const { error } = await admin.from("memorial_candles").insert(rows);
      if (error) throw error;
    }
    if (b.images.length) {
      const ordered = [...b.images].sort((a, c) => (a.storage_path === cover ? -1 : c.storage_path === cover ? 1 : 0));
      const { error } = await admin.from("memorial_media").insert(ordered.map((img, i) => ({
        memorial_id: memorialId, type: "image", storage_path: img.storage_path, title: nz(img.title) ?? `${b.first_name} ${b.last_name}`,
        description: nz(img.description), sort_order: i, is_cover: img.storage_path === cover,
      })));
      if (error) throw error;
      const ids = b.images.map((i) => i.portrait_photo_id).filter(Boolean) as string[];
      if (ids.length) await admin.from("famous_portrait_photos").update({ memorial_id: memorialId }).in("id", ids);
    }
    return jsonResponse({ memorial_id: memorialId, slug: mem.slug, published: b.publish });
  } catch (error) {
    if (memorialId) await admin.from("memorials").delete().eq("id", memorialId);
    if (obituaryId) await admin.from("obituaries").delete().eq("id", obituaryId);
    const msg = error && typeof error === "object" && "message" in error ? String((error as { message: string }).message) : "Spremanje nije uspjelo.";
    return jsonResponse({ error: msg }, 500);
  }
});
