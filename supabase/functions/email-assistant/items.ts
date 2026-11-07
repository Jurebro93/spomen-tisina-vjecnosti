// What a sender owns on the site, and the only changes the assistant may make to it.
// Rule from the site owner (2026-11-07): any data of a memorial, obituary, candle or memory may be changed by
// e-mail, but only when the mail comes from the address that created that item. Payment, refunds and deletion
// are never touched. Ownership and the allowed fields are enforced here, not left to the AI.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type ItemType = "memorial" | "memorial_person" | "obituary" | "candle" | "memorial_candle" | "memory";

type FieldKind = "text" | "date" | "time" | "bool" | "list" | "visibility";

type ItemSpec = { table: string; label: string; fields: Record<string, FieldKind> };

export const ITEM_SPECS: Record<ItemType, ItemSpec> = {
  memorial: {
    table: "memorials",
    label: "digitalni memorijal",
    fields: {
      life_story: "text", quote: "text", relationship: "text",
      allow_candles: "bool", allow_tributes: "bool", tributes_require_approval: "bool", visibility: "visibility",
    },
  },
  // The person a memorial is about (stored as an unpublished obituaries row).
  memorial_person: {
    table: "obituaries",
    label: "podaci o osobi na memorijalu",
    fields: {
      ime: "text", prezime: "text", datum_rodenja: "date", datum_smrti: "date", mjesto_rodenja: "text",
      mjesto_smrti: "text", groblje: "text", profesija: "text", podnaslov: "text", biografija: "text",
    },
  },
  obituary: {
    table: "obituaries",
    label: "osmrtnica",
    fields: {
      ime: "text", prezime: "text", datum_rodenja: "date", datum_smrti: "date", datum_ukopa: "date",
      vrijeme_ukopa: "time", mjesto_rodenja: "text", mjesto_smrti: "text", groblje: "text",
      mjesna_zajednica: "text", profesija: "text", podnaslov: "text", biografija: "text", ozalosceni: "list",
      kontakt_osoba_ime: "text", kontakt_osoba_telefon: "text",
    },
  },
  candle: {
    table: "virtual_candles",
    label: "svijeća uz osmrtnicu",
    fields: { zapalio_ime: "text", pokojnik_ime: "text", pokojnik_prezime: "text", poruka: "text" },
  },
  memorial_candle: {
    table: "memorial_candles",
    label: "svijeća na memorijalu",
    fields: { visitor_name: "text", message: "text" },
  },
  memory: {
    table: "memorial_tributes",
    label: "sjećanje na memorijalu",
    fields: { author_name: "text", title: "text", message: "text", relationship: "text" },
  },
};

export type OwnedItem = { type: ItemType; id: string; summary: string; data: Record<string, unknown> };

const pick = (row: Record<string, unknown>, fields: string[]) =>
  Object.fromEntries(fields.map((f) => [f, row[f] ?? null]));

const short = (v: unknown, n = 400) => {
  const s = v == null ? "" : String(v);
  return s.length > n ? `${s.slice(0, n)}…` : s;
};

/** Everything created with this e-mail address (newest first, a few of each kind). */
export async function loadOwnedItems(db: SupabaseClient, email: string): Promise<OwnedItem[]> {
  const out: OwnedItem[] = [];
  const e = email.toLowerCase();
  const site = "https://osmrtnica.com.hr";

  const { data: profiles } = await db.from("profiles").select("id").ilike("email", e).limit(3);
  const ownerIds = (profiles ?? []).map((p) => p.id);
  if (ownerIds.length) {
    const { data: memorials } = await db.from("memorials")
      .select("id, slug, status, deceased_id, " + Object.keys(ITEM_SPECS.memorial.fields).join(", "))
      .in("owner_id", ownerIds).is("archived_at", null).order("created_at", { ascending: false }).limit(10);
    for (const m of (memorials ?? []) as unknown as Record<string, unknown>[]) {
      const { data: person } = await db.from("obituaries")
        .select("id, active, kontakt_osoba_email, " + Object.keys(ITEM_SPECS.memorial_person.fields).join(", "))
        .eq("id", m.deceased_id as string).maybeSingle();
      const p = person as unknown as Record<string, unknown> | null;
      const name = p ? `${p.ime} ${p.prezime}` : "";
      out.push({
        type: "memorial", id: m.id as string,
        summary: `Memorijal za ${name} (${m.status}), ${site}/memorijal/${m.slug}`,
        data: { ...pick(m, Object.keys(ITEM_SPECS.memorial.fields)), life_story: short(m.life_story) },
      });
      // A memorial can also point at a public obituary someone else posted: then the person data belongs to
      // that obituary's author, not to the memorial owner.
      if (p && (!p.active || String(p.kontakt_osoba_email ?? "").toLowerCase() === e)) {
        out.push({
          type: "memorial_person", id: p.id as string,
          summary: `Podaci o osobi na memorijalu ${site}/memorijal/${m.slug}`,
          data: { ...pick(p, Object.keys(ITEM_SPECS.memorial_person.fields)), biografija: short(p.biografija) },
        });
      }
    }
  }

  const { data: obits } = await db.from("obituaries")
    .select("id, slug, active, " + Object.keys(ITEM_SPECS.obituary.fields).join(", "))
    .ilike("kontakt_osoba_email", e).order("created_at", { ascending: false }).limit(10);
  for (const o of (obits ?? []) as unknown as Record<string, unknown>[]) {
    if (out.some((i) => i.id === o.id)) continue;
    out.push({
      type: "obituary", id: o.id as string,
      summary: `Osmrtnica ${o.ime} ${o.prezime} (${o.active ? "objavljena" : "čeka odobrenje"})${o.slug ? `, ${site}/osmrtnica/${o.slug}` : ""}`,
      data: { ...pick(o, Object.keys(ITEM_SPECS.obituary.fields)), biografija: short(o.biografija) },
    });
  }

  const { data: candles } = await db.from("virtual_candles")
    .select("id, paid, expires_at, " + Object.keys(ITEM_SPECS.candle.fields).join(", "))
    .ilike("zapalio_email", e).order("created_at", { ascending: false }).limit(10);
  for (const c of (candles ?? []) as unknown as Record<string, unknown>[]) {
    out.push({
      type: "candle", id: c.id as string,
      summary: `Svijeća za ${c.pokojnik_ime} ${c.pokojnik_prezime} (gori do ${String(c.expires_at).slice(0, 10)})`,
      data: pick(c, Object.keys(ITEM_SPECS.candle.fields)),
    });
  }

  const { data: mcandles } = await db.from("memorial_candles")
    .select("id, memorial_id, status, " + Object.keys(ITEM_SPECS.memorial_candle.fields).join(", "))
    .ilike("visitor_email", e).order("created_at", { ascending: false }).limit(10);
  for (const c of (mcandles ?? []) as unknown as Record<string, unknown>[]) {
    out.push({
      type: "memorial_candle", id: c.id as string, summary: `Svijeća na memorijalu (${c.status})`,
      data: pick(c, Object.keys(ITEM_SPECS.memorial_candle.fields)),
    });
  }

  const { data: memories } = await db.from("memorial_tributes")
    .select("id, memorial_id, status, " + Object.keys(ITEM_SPECS.memory.fields).join(", "))
    .ilike("author_email", e).order("created_at", { ascending: false }).limit(10);
  for (const t of (memories ?? []) as unknown as Record<string, unknown>[]) {
    out.push({
      type: "memory", id: t.id as string, summary: `Sjećanje "${t.title ?? ""}" (${t.status})`,
      data: { ...pick(t, Object.keys(ITEM_SPECS.memory.fields)), message: short(t.message) },
    });
  }
  return out;
}

export type Change = { field: string; value: string | null };

/** Checks one requested change against the allowed fields; returns the value to store or an error. */
export function validateChange(type: ItemType, c: Change): { ok: true; value: unknown } | { ok: false; error: string } {
  const kind = ITEM_SPECS[type].fields[c.field];
  if (!kind) return { ok: false, error: `Polje "${c.field}" se ne smije mijenjati mailom.` };
  const v = c.value == null ? null : String(c.value).trim();
  if (v === null || v === "") {
    if (kind === "bool" || kind === "visibility" || ["ime", "prezime", "zapalio_ime", "pokojnik_ime", "pokojnik_prezime", "author_name", "message"].includes(c.field)) {
      return { ok: false, error: `Polje "${c.field}" ne smije ostati prazno.` };
    }
    return { ok: true, value: null };
  }
  if (v.length > 20000) return { ok: false, error: "Tekst je predug." };
  switch (kind) {
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))
        ? { ok: true, value: v } : { ok: false, error: `Datum mora biti u obliku GGGG-MM-DD (${c.field}).` };
    case "time":
      return /^\d{1,2}:\d{2}$/.test(v) ? { ok: true, value: v } : { ok: false, error: "Vrijeme mora biti u obliku HH:MM." };
    case "bool":
      if (v === "true" || v === "false") return { ok: true, value: v === "true" };
      return { ok: false, error: "Vrijednost mora biti true ili false." };
    case "visibility":
      return ["public", "private", "unlisted"].includes(v)
        ? { ok: true, value: v } : { ok: false, error: "Vidljivost mora biti public, private ili unlisted." };
    case "list":
      return { ok: true, value: v.split(/\n|;/).map((s) => s.trim()).filter(Boolean) };
    default:
      return { ok: true, value: v };
  }
}
