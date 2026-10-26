// "Trebate pomoć s izradom memorijala?" on every step of /kreiraj-memorijal: the visitor leaves an e-mail or a
// phone number and the request lands in the info@ inbox, with the step they were on and the draft, if any.
import { createClient } from "npm:@supabase/supabase-js@2";
import { isMailConfigured, sendMail } from "../_shared/mail.ts";
import { escapeHtml, SITE } from "../_shared/emailLayout.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const INBOX = "info@osmrtnica.com.hr";
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// Digits with optional +, spaces, slashes, dashes and brackets: 8 to 15 digits in all.
const PHONE = /^\+?[\d\s/().-]{8,24}$/;

// Best effort against a script filling the inbox: per instance, at most 5 requests per IP in 10 minutes.
const recent = new Map<string, number[]>();
const tooMany = (ip: string) => {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > 5;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, code: "method" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    // Hidden field: people never fill it, form bots do.
    if (body.website) return json({ ok: true });
    const contact = String(body.contact ?? "").trim().slice(0, 255);
    const isEmail = EMAIL.test(contact);
    const digits = contact.replace(/\D/g, "");
    if (!isEmail && !(PHONE.test(contact) && digits.length >= 8 && digits.length <= 15)) {
      return json({ ok: false, code: "invalid_contact" }, 400);
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (tooMany(ip)) return json({ ok: false, code: "too_many" }, 429);
    if (!isMailConfigured()) return json({ ok: false, code: "mail_unavailable" }, 500);

    const step = String(body.step ?? "").slice(0, 60);
    const note = String(body.note ?? "").trim().slice(0, 1000);
    const memorialId = /^[0-9a-f-]{36}$/i.test(String(body.memorial_id ?? "")) ? String(body.memorial_id) : null;

    let person = String(body.person ?? "").trim().slice(0, 120);
    if (memorialId) {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data } = await admin.from("memorials").select("obituaries(ime, prezime)").eq("id", memorialId).maybeSingle();
      const ob = (data as { obituaries?: { ime?: string; prezime?: string } | null } | null)?.obituaries;
      const name = [ob?.ime, ob?.prezime].filter(Boolean).join(" ");
      if (name) person = name;
    }

    const rows: [string, string][] = [
      [isEmail ? "E-mail" : "Telefon", contact],
      ["Korak", step || "nepoznat"],
      ...(person ? [["Memorijal za", person] as [string, string]] : []),
      ...(memorialId ? [["ID nacrta", memorialId] as [string, string]] : []),
      ...(note ? [["Poruka", note] as [string, string]] : []),
      ["Vrijeme", new Date().toLocaleString("hr-HR", { timeZone: "Europe/Zagreb", dateStyle: "long", timeStyle: "short" })],
    ];
    const table = rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">${escapeHtml(k)}</td><td style="padding:4px 0;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`).join("");
    const action = isEmail
      ? `Odgovorite na ovaj e-mail (odgovor ide izravno posjetitelju).`
      : `Nazovite posjetitelja na <a href="tel:${escapeHtml(contact.replace(/[^\d+]/g, ""))}">${escapeHtml(contact)}</a>.`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:640px"><h2>Netko treba pomoć s izradom memorijala</h2><table>${table}</table><p>${action}</p><p style="color:#666;font-size:13px">Poslano s ${SITE}/kreiraj-memorijal</p></div>`;

    await sendMail({
      to: INBOX,
      subject: `Pomoć s izradom memorijala${person ? `: ${person}` : ""} (${isEmail ? "e-mail" : "telefon"})`,
      html,
      replyTo: isEmail ? contact : undefined,
    });
    return json({ ok: true });
  } catch (e) {
    console.error("[REQUEST-MEMORIAL-HELP]", e instanceof Error ? e.message : String(e));
    return json({ ok: false, code: "error" }, 500);
  }
});
