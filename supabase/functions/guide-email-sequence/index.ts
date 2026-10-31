// Three follow-up e-mails after a free-guide signup (the guide e-mail from claim-ebook is mail 0):
//   1. two days later: one practical point from the guide they downloaded (no selling)
//   2. five days later: what a digital memorial is, the example memorial, how making one works
//   3. ten days later: their unused 30 % code, valid for 14 more days from this e-mail
// Only signups with ebook_signups.sequence_started_at set take part; the column has no default until the
// sequence is enabled (supabase/manual/guide-email-sequence-enable.sql), so nothing is sent before that.
// Buyers, unsubscribed and test addresses are skipped; each address gets each mail at most once
// (email_campaign_sends) and at most one mail per run. Opens and clicks go through email-track.
//
// POST (x-sequence-secret header = Vault GUIDE_SEQUENCE_SECRET):
//   {"mode":"run"}                         send what is due (the daily cron job)
//   {"mode":"run","dry_run":true}          list what would be sent, send nothing
//   {"mode":"test","test_to":"a@b.hr"}     one [Proba] copy of every mail and guide variant to that address
//   {"mode":"unsubscribe","r":"<rid>"}     no secret; sent by the confirm button on osmrtnica.com.hr/odjava?r=<rid>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isMailConfigured, sendMail } from "../_shared/mail.ts";
import { emailButton, emailLayout, emailNote, emailParagraph, escapeHtml, SITE } from "../_shared/emailLayout.ts";
import { isSeasonalPromoRunning, SEASONAL_PROMO, seasonalPriceFor } from "../_shared/seasonalPromo.ts";

const DAY = 24 * 3600_000;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const TEST_RE = /test|example\.|\+svisveti|kuponclaude|^seoexperiment/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FN_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1`;
const TRACK = `${FN_URL}/email-track`;
const PRICE = 39;
const DISCOUNT = 30;
const CODE_VALID_DAYS = 14;
// A signup older than this when the sequence would start is not mailed (safety net for old rows).
const MAX_START_AGE_MS = 45 * DAY;

type GuideId = "kad-izgubite-voljenu-osobu" | "obiteljska-mirovina" | "smrt-u-inozemstvu" | "digitalna-ostavstina";
const GUIDE_IDS: GuideId[] = ["kad-izgubite-voljenu-osobu", "obiteljska-mirovina", "smrt-u-inozemstvu", "digitalna-ostavstina"];

// Every fact below is taken from the guide's own PDF (public/vodic/...), October 2026 edition.
export const GUIDE_TIPS: Record<GuideId, { title: string; pdf: string; subject: string; heading: string; paragraphs: string[] }> = {
  "kad-izgubite-voljenu-osobu": {
    title: "Kad izgubite voljenu osobu",
    pdf: "/vodic/kad-izgubite-voljenu-osobu.pdf",
    subject: "Što iz vodiča može pričekati, a što ne",
    heading: "Što može pričekati, a što ne",
    paragraphs: [
      "Banke, odjave i većina papira mogu pričekati i nekoliko tjedana bez ikakve štete. Ne morate sve riješiti odmah.",
      "Jedan rok ipak se isplati zapamtiti: zahtjev za obiteljsku mirovinu predajte u roku od 6 mjeseci od smrti. Tada mirovina pripada od dana kada su ispunjeni uvjeti. Sve o tome je u poglavlju 5, a kontrolne liste na kraju vodiča možete ispisati.",
    ],
  },
  "obiteljska-mirovina": {
    title: "Obiteljska mirovina korak po korak",
    pdf: "/vodic/obiteljska-mirovina/obiteljska-mirovina-korak-po-korak.pdf",
    subject: "Rok od 6 mjeseci za obiteljsku mirovinu",
    heading: "Rok od 6 mjeseci",
    paragraphs: [
      "Zahtjev HZMO-u predajte u roku od 6 mjeseci od smrti. Tada mirovina pripada od dana kada su ispunjeni uvjeti. Ako ga predate kasnije, mirovinu dobivate najviše 6 mjeseci unatrag.",
      "Popis dokumenata koje trebate ponijeti nalazi se na kraju vodiča i možete ga ispisati.",
    ],
  },
  "smrt-u-inozemstvu": {
    title: "Smrt u inozemstvu",
    pdf: "/vodic/smrt-u-inozemstvu/smrt-u-inozemstvu.pdf",
    subject: "Prvi korak kad netko umre u inozemstvu",
    heading: "Prvi korak je u državi u kojoj je osoba umrla",
    paragraphs: [
      "Smrt se prvo prijavljuje u državi u kojoj je nastupila. Tamo dobivate izvadak iz matice umrlih koji vam treba za sve ostalo.",
      "Za prijevoz tijela u Hrvatsku treba sprovodnica hrvatskog veleposlanstva ili konzulata, a najčešće je uz vašu punomoć ishodi pogrebnik. Ne potpisujte ništa bez pisane ponude s ukupnom cijenom.",
    ],
  },
  "digitalna-ostavstina": {
    title: "Digitalna ostavština",
    pdf: "/vodic/digitalna-ostavstina/digitalna-ostavstina.pdf",
    subject: "Prije nego što išta ugasite",
    heading: "Prije nego što išta ugasite",
    paragraphs: [
      "Zatvoren račun rijetko se može vratiti, a s njim nestaju fotografije i poruke. Zato najprije spremite fotografije, videe, razgovore i glasovne poruke, a tek onda šaljite zahtjeve za brisanje. Hitne su samo pretplate koje troše novac.",
      "WhatsApp u pravilu briše račun koji je neaktivan 120 dana, pa razgovore vrijedi izvesti na vrijeme. Upute su u poglavljima 2 i 6.",
    ],
  },
};

const eur = (n: number) => `${n.toFixed(2).replace(".", ",").replace(",00", "")} €`;
const MONTHS = ["siječnja", "veljače", "ožujka", "travnja", "svibnja", "lipnja", "srpnja", "kolovoza", "rujna", "listopada", "studenoga", "prosinca"];
const dateHr = (ms: number) => {
  const d = new Date(new Date(ms).toLocaleString("en-US", { timeZone: "Europe/Zagreb" }));
  return `${d.getDate()}. ${MONTHS[d.getMonth()]}`;
};

type Ctx = { guide: GuideId; code: string | null; codeUntil: number | null; rid: string; utmCampaign: string; now: number };

const link = (path: string, ctx: Ctx, content: string, extra = "") =>
  `${SITE}${path}${path.includes("?") ? "&amp;" : "?"}${extra}utm_source=email&amp;utm_medium=email&amp;utm_campaign=${ctx.utmCampaign}&amp;utm_content=${content}`;

const reason = (ctx: Ctx) =>
  `Primili ste ovaj e-mail jer ste na osmrtnica.com.hr preuzeli besplatni vodič. O memorijalu vam šaljemo najviše tri ovakve poruke. <a href="${SITE}/odjava?r=${ctx.rid}" style="color:#777777">Odjavite se</a>.`;

const priceSentence = (ctx: Ctx) => {
  if (isSeasonalPromoRunning(ctx.now)) {
    return `Memorijal se plaća jednom, bez pretplate. Do ${SEASONAL_PROMO.untilLabel} (${SEASONAL_PROMO.occasion}) stoji ${eur(seasonalPriceFor(PRICE))} za sve, a nakon toga ${eur(PRICE)}${ctx.code ? `, odnosno ${eur(PRICE * (100 - DISCOUNT) / 100)} s vašim kodom` : ""}.`;
  }
  return `Memorijal se plaća jednom, bez pretplate: ${eur(PRICE)}${ctx.code ? `, a s kodom iz vodiča ${eur(PRICE * (100 - DISCOUNT) / 100)}` : ""}.`;
};

type Mail = { subject: string; html: (ctx: Ctx) => string; needsCode?: boolean };

export const MAILS: Mail[] = [
  {
    subject: "", // per guide, see subjectFor
    html: (ctx) => {
      const g = GUIDE_TIPS[ctx.guide];
      return emailLayout({
        preheader: "Jedna stvar iz vodiča koju je dobro znati na vrijeme.",
        title: g.heading,
        body: [
          emailParagraph("Dobar dan,"),
          emailParagraph(`nedavno ste preuzeli naš vodič „${escapeHtml(g.title)}“. Ako ga još niste stigli otvoriti, ovo je dio koji obitelji najčešće trebaju.`),
          ...g.paragraphs.map(emailParagraph),
          emailButton(link(g.pdf, ctx, "m1"), "Otvorite vodič"),
          emailParagraph("Ako imate pitanje na koje vodič ne odgovara, možete odgovoriti na ovaj e-mail."),
        ].join(""),
        reason: reason(ctx),
      });
    },
  },
  {
    subject: "Kako izgleda digitalni memorijal",
    html: (ctx) => emailLayout({
      preheader: "Primjer stranice i kako se izrađuje, bez obveze.",
      title: "Jedno mjesto za priču i fotografije",
      body: [
        emailParagraph("Dobar dan,"),
        emailParagraph("u vodiču spominjemo digitalni memorijal. Evo ukratko što je to, pa sami procijenite je li za vašu obitelj."),
        emailParagraph("To je stranica posvećena jednoj osobi: životna priča, fotografije, važni datumi i poruke koje ostave rodbina i prijatelji. Poveznicu pošaljete obitelji, i onima koji žive daleko. Birate hoće li stranica biti javna, dostupna samo preko poveznice ili privatna."),
        emailButton(link("/memorijal-primjer/obiteljske-uspomene", ctx, "m2_primjer"), "Pogledajte primjer memorijala"),
        emailParagraph("Izrada počinje imenom osobe. Osmrtnica ni točan datum nisu potrebni, a memorijal može biti i za nekoga tko je umro prije mnogo godina. Zatim dodate nekoliko rečenica i fotografije. Ako ne znate kako početi, stranica iz upisanih podataka pripremi prijedlog teksta koji mijenjate svojim riječima. Na kraju vidite kako će memorijal izgledati i tek tada plaćate. Kasnije ga možete dopunjavati."),
        emailParagraph(`${priceSentence(ctx)} <a href="${link("/kreiraj-memorijal", ctx, "m2_kreni", ctx.code ? `kod=${encodeURIComponent(ctx.code)}&amp;` : "")}" style="color:#8a6a1f">Započnite memorijal</a>`),
        emailNote("Primjer je ogledni memorijal koji smo složili da se vidi izgled stranice, ne pripada stvarnoj obitelji."),
      ].join(""),
      reason: reason(ctx),
    }),
  },
  {
    subject: `Vaš kod za ${DISCOUNT} % popusta na memorijal`,
    needsCode: true,
    html: (ctx) => emailLayout({
      preheader: `Kod iz vodiča još nije iskorišten i vrijedi do ${dateHr(ctx.codeUntil ?? ctx.now)}.`,
      title: "Kod iz vodiča još nije iskorišten",
      body: [
        emailParagraph("Dobar dan,"),
        emailParagraph(`uz vodič ste dobili kod za ${DISCOUNT} % popusta na digitalni memorijal. Još ga niste iskoristili, a vrijedi do <strong>${dateHr(ctx.codeUntil ?? ctx.now)}</strong>.`),
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;background:#f8f3e7;border:1px solid #c9a24a;border-radius:6px">
  <tr><td style="padding:20px;text-align:center">
    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:26px;font-weight:bold;letter-spacing:3px;color:#111111">${escapeHtml(ctx.code ?? "")}</p>
  </td></tr>
</table>`,
        emailParagraph(priceSentence(ctx)),
        emailParagraph("Kod se na stranici sam upiše kad otvorite poveznicu ispod. Možete početi samo s imenom i jednom fotografijom, sve je spremljeno pa memorijal možete dovršiti drugi dan."),
        emailButton(link("/kreiraj-memorijal", ctx, "m3", `kod=${encodeURIComponent(ctx.code ?? "")}&amp;`), "Započnite memorijal"),
        emailParagraph("Ovo je zadnja poruka iz ove serije. Ako zapnete pri izradi, odgovorite na ovaj e-mail i pomoći ćemo vam."),
      ].join(""),
      reason: reason(ctx),
    }),
  },
];
// Days after the signup each mail is due, and the minimum gap after the previous mail.
const DUE_AFTER_DAYS = [2, 5, 10];
const MIN_GAP_DAYS = [0, 2, 3];
const campaignOf = (i: number) => `vodic_niz_${i + 1}`;
const subjectFor = (i: number, guide: GuideId) => (i === 0 ? GUIDE_TIPS[guide].subject : MAILS[i].subject);

// Links to the site go through the click redirect; the pixel goes last so a blocked image changes nothing visible.
const tracked = (html: string, rid: string) =>
  html
    .replace(/href="(https:\/\/osmrtnica\.com\.hr[^"]*)"/g, (_, url: string) =>
      `href="${TRACK}?r=${rid}&amp;k=c&amp;u=${encodeURIComponent(url.replace(/&amp;/g, "&"))}"`)
    .replace("</body>", `<img src="${TRACK}?r=${rid}&amp;k=o" width="1" height="1" alt="" style="border:0"></body>`);

const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
type Db = ReturnType<typeof admin>;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

// The unsubscribe link opens osmrtnica.com.hr/odjava (functions can't serve HTML pages), which asks for a
// confirm click and then posts {mode:"unsubscribe", r}. The rid identifies one send row, so no address is in the link.
const unsubscribe = async (req: Request, db: Db, rid: unknown) => {
  if (typeof rid !== "string" || !UUID_RE.test(rid)) return json({ error: "invalid" }, 400);
  const { data: row } = await db.from("email_campaign_sends").select("email").eq("rid", rid).maybeSingle();
  if (!row) return json({ error: "invalid" }, 404);
  const { error } = await db.from("newsletter_users").upsert({ email: row.email, active: false }, { onConflict: "email" });
  if (error) return json({ error: "failed" }, 500);
  await db.from("email_campaign_events").insert({ rid, kind: "unsubscribe", url: null, user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300) })
    .then(() => undefined, () => undefined);
  return json({ ok: true });
};

const lower = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/** The address's usable 30 % code (from any guide or the popup), or null. */
const usableCode = async (db: Db, codes: string[], now: number) => {
  if (!codes.length) return null;
  const { data } = await db.from("promo_codes").select("id, code, active, expires_at, max_uses, current_uses").in("code", codes);
  return (data ?? []).find((p) => p.active && (p.max_uses === null || (p.current_uses ?? 0) < p.max_uses) &&
    (!p.expires_at || new Date(p.expires_at).getTime() > now)) ?? null;
};

const run = async (db: Db, dryRun: boolean, limit: number) => {
  const now = Date.now();
  const [signups, sends, paid, unsub] = await Promise.all([
    db.from("ebook_signups").select("email, guide, promo_code, created_at, sequence_started_at").not("sequence_started_at", "is", null).neq("placement", "test"),
    db.from("email_campaign_sends").select("campaign, email, sent_at").like("campaign", "vodic_niz_%"),
    db.from("memorial_orders").select("email:customer_email").eq("status", "paid"),
    db.from("newsletter_users").select("email").eq("active", false),
  ]);
  const err = signups.error ?? sends.error ?? paid.error ?? unsub.error;
  if (err) return json({ error: err.message }, 500);

  const skip = new Set([...(paid.data ?? []).map((r) => lower(r.email)), ...(unsub.data ?? []).map((r) => lower(r.email))]);
  const sent = new Map<string, number>(); // `${campaign}|${email}` -> sent ms
  for (const s of sends.data ?? []) if (s.sent_at) sent.set(`${s.campaign}|${lower(s.email)}`, new Date(s.sent_at).getTime());

  // One sequence per address: anchored on its first signup in the sequence, about the guide of that signup.
  const people = new Map<string, { guide: GuideId; start: number; created: number; codes: string[] }>();
  for (const s of signups.data ?? []) {
    const email = lower(s.email);
    if (!EMAIL_RE.test(email) || TEST_RE.test(email)) continue;
    const start = new Date(s.sequence_started_at!).getTime();
    const p = people.get(email);
    const code = s.promo_code ? [s.promo_code] : [];
    if (!p || start < p.start) {
      people.set(email, { guide: (GUIDE_IDS.includes(s.guide as GuideId) ? s.guide : GUIDE_IDS[0]) as GuideId, start, created: new Date(s.created_at).getTime(), codes: [...(p?.codes ?? []), ...code] });
    } else p.codes.push(...code);
  }

  const due: Array<{ email: string; mail: number; guide: GuideId; codes: string[] }> = [];
  for (const [email, p] of people) {
    if (skip.has(email)) continue;
    if (p.start - p.created > MAX_START_AGE_MS) continue;
    for (let i = 0; i < MAILS.length; i++) {
      if (sent.has(`${campaignOf(i)}|${email}`)) continue;
      const prev = i > 0 ? sent.get(`${campaignOf(i - 1)}|${email}`) : undefined;
      if (i > 0 && prev === undefined) break;
      if (now < p.start + DUE_AFTER_DAYS[i] * DAY) break;
      if (prev !== undefined && now < prev + MIN_GAP_DAYS[i] * DAY) break;
      due.push({ email, mail: i, guide: p.guide, codes: p.codes });
      break; // at most one mail per address per run
    }
  }

  const todo = due.slice(0, limit);
  if (dryRun) return json({ people: people.size, due: due.length, would_send: todo.map((d) => ({ mail: d.mail + 1, guide: d.guide, email: d.email.replace(/^(.{2}).*@/, "$1…@") })) });

  const results: Array<{ mail: number; status: string }> = [];
  for (const d of todo) {
    const campaign = campaignOf(d.mail);
    let code: string | null = null;
    let codeUntil: number | null = null;
    const promo = await usableCode(db, d.codes, now);
    if (MAILS[d.mail].needsCode) {
      // No usable code (used, expired or never issued): the last mail has nothing to offer, so it is skipped for good.
      if (!promo) {
        await db.from("email_campaign_sends").upsert({ campaign, email: d.email, sent_at: new Date().toISOString(), error: "skipped: no usable code" });
        results.push({ mail: d.mail + 1, status: "skipped_no_code" });
        continue;
      }
      codeUntil = promo.expires_at ? new Date(promo.expires_at).getTime() : now + CODE_VALID_DAYS * DAY;
    }
    code = promo?.code ?? null;
    try {
      const { data: row, error: rowError } = await db.from("email_campaign_sends")
        .upsert({ campaign, email: d.email, error: null }, { onConflict: "campaign,email" }).select("rid").single();
      if (rowError || !row) throw rowError ?? new Error("no send row");
      const ctx: Ctx = { guide: d.guide, code, codeUntil, rid: row.rid, utmCampaign: "vodic_niz", now };
      await sendMail({ to: d.email, subject: subjectFor(d.mail, d.guide), html: tracked(MAILS[d.mail].html(ctx), row.rid) });
      await db.from("email_campaign_sends").upsert({ campaign, email: d.email, sent_at: new Date().toISOString(), error: null });
      // The deadline in mail 3 becomes real only once the mail has gone out.
      if (MAILS[d.mail].needsCode && promo && !promo.expires_at) {
        await db.from("promo_codes").update({ expires_at: new Date(codeUntil!).toISOString() }).eq("id", promo.id).is("expires_at", null);
      }
      results.push({ mail: d.mail + 1, status: "sent" });
    } catch (e) {
      await db.from("email_campaign_sends").upsert({ campaign, email: d.email, error: String(e).slice(0, 300) });
      results.push({ mail: d.mail + 1, status: `failed: ${String(e).slice(0, 80)}` });
    }
  }
  return json({ people: people.size, due: due.length, results });
};

// Every mail and every guide variant of mail 1, with an example code and links tagged as a test.
const test = async (to: string) => {
  const now = Date.now();
  const base = { code: "VODIC30-PRIMJR", codeUntil: now + CODE_VALID_DAYS * DAY, rid: crypto.randomUUID(), utmCampaign: "test_vodic_niz", now };
  const list: Array<{ subject: string; html: string }> = [];
  for (const guide of GUIDE_IDS) {
    list.push({ subject: `[Proba 1/3, ${GUIDE_TIPS[guide].title}] ${subjectFor(0, guide)}`, html: MAILS[0].html({ ...base, guide }) });
  }
  for (let i = 1; i < MAILS.length; i++) {
    list.push({ subject: `[Proba ${i + 1}/3] ${subjectFor(i, GUIDE_IDS[0])}`, html: MAILS[i].html({ ...base, guide: GUIDE_IDS[0] }) });
  }
  for (const m of list) await sendMail({ to, subject: m.subject, html: m.html });
  return json({ sent: list.length, to });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const db = admin();
  const body = await req.json().catch(() => ({}));
  if (body.mode === "unsubscribe") return unsubscribe(req, db, body.r);

  const provided = req.headers.get("x-sequence-secret") ?? "";
  const { data: expected, error } = await db.rpc("guide_sequence_secret");
  if (error || typeof expected !== "string" || expected.length < 32 || !safeEqual(provided, expected)) {
    return json({ error: "forbidden" }, 403);
  }
  if (!isMailConfigured()) return json({ error: "SMTP is not configured" }, 500);
  if (body.mode === "test") {
    if (!EMAIL_RE.test(body.test_to ?? "")) return json({ error: "test_to required" }, 400);
    return test(body.test_to);
  }
  if (body.mode === "run") return run(db, body.dry_run === true, Math.min(Number(body.limit) || 40, 60));
  return json({ error: "mode must be run or test" }, 400);
});
