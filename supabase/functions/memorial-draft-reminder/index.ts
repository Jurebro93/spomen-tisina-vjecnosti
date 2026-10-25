// Scheduled (hourly) reminder for unfinished memorial drafts. Protected by a Vault secret.
// At most two e-mails per draft: the first 3 h to 7 days after it was created, the second 3 to 10 days after it
// was created (and at least 2 days after the first). They go to the owner's account e-mail, or for guests to the
// e-mail they left for the draft (memorial_draft_contacts). Drafts without any e-mail stay unmarked, so they are
// reminded once an e-mail is added.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isMailConfigured, sendMail } from "../_shared/mail.ts";
import { emailButton, emailLayout, emailParagraph, escapeHtml, SITE } from "../_shared/emailLayout.ts";

const adminClient = () =>
  createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });

const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

const HOUR = 3600_000;
const DAY = 24 * HOUR;

type Pass = {
  column: 'draft_reminder_sent_at' | 'draft_reminder2_sent_at';
  afterMs: number;
  untilMs: number;
  subject: string;
  html: (name: string, link: string) => string;
};
// A guest who just got the link e-mail (save-draft-email) is not reminded again the same day.
const QUIET_AFTER_LINK_MS = 20 * 3600_000;

const reminderHtml = (name: string, link: string) => emailLayout({
  preheader: "Sve što ste upisali je spremljeno.",
  title: "Vaš memorijal čeka da ga dovršite",
  body: [
    emailParagraph(`Poštovani,<br>započeli ste digitalni memorijal${name ? ` za <strong>${escapeHtml(name)}</strong>` : ""}, ali još nije objavljen. Sve što ste upisali je spremljeno.`),
    emailParagraph("Memorijal možete dovršiti kad god budete spremni: dodajte fotografije i priču, pa ga objavite za obitelj i prijatelje."),
    emailButton(link, "Dovršite memorijal"),
  ].join(""),
  reason: "Ako memorijal više ne želite izraditi, slobodno zanemarite ovu poruku. O ovoj skici poslat ćemo još samo jedan podsjetnik.",
});

const secondReminderHtml = (name: string, link: string) => emailLayout({
  preheader: "Vaša skica je i dalje spremljena.",
  title: "Memorijal vas još čeka",
  body: [
    emailParagraph(`Poštovani,<br>prije nekoliko dana započeli ste digitalni memorijal${name ? ` za <strong>${escapeHtml(name)}</strong>` : ""}. Sve što ste upisali i dalje je spremljeno.`),
    emailParagraph("Ne morate sve napisati odjednom: memorijal možete objaviti i s nekoliko rečenica i jednom fotografijom, a dopuniti ga kasnije."),
    emailButton(link, "Nastavite memorijal"),
  ].join(""),
  reason: "Ovo je zadnja poruka o ovoj skici. Ako memorijal više ne želite izraditi, slobodno je zanemarite.",
});

const PASSES: Pass[] = [
  { column: "draft_reminder_sent_at", afterMs: 3 * HOUR, untilMs: 7 * DAY, subject: "Vaš digitalni memorijal čeka da ga dovršite", html: reminderHtml },
  { column: "draft_reminder2_sent_at", afterMs: 3 * DAY, untilMs: 10 * DAY, subject: "Vaš memorijal je i dalje spremljen", html: secondReminderHtml },
];
// The second reminder never follows the first one by less than this.
const MIN_GAP_MS = 2 * DAY;

Deno.serve(async (req) => {
  const provided = req.headers.get("x-reminder-secret") ?? "";
  const admin = adminClient();
  const { data: expected, error: secretError } = await admin.rpc("memorial_reminder_secret");
  if (secretError || typeof expected !== "string" || expected.length < 32 || !safeEqual(provided, expected)) {
    return new Response("forbidden", { status: 403 });
  }
  if (!isMailConfigured()) return new Response("mail not configured", { status: 500 });

  const now = Date.now();
  const results: Array<{ memorial: string; pass: number; status: string }> = [];
  for (const [index, pass] of PASSES.entries()) {
    let query = admin.from("memorials")
      .select("id, owner_id, deceased_id, obituaries(ime, prezime)")
      .eq("status", "draft")
      .eq("paid", false)
      .is(pass.column, null)
      .lte("created_at", new Date(now - pass.afterMs).toISOString())
      .gte("created_at", new Date(now - pass.untilMs).toISOString());
    if (index > 0) query = query.lte("draft_reminder_sent_at", new Date(now - MIN_GAP_MS).toISOString());
    const { data: drafts, error } = await query.order("created_at", { ascending: false }).limit(200);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

    const ids = (drafts ?? []).map((m) => m.id);
    const { data: contactRows } = ids.length
      ? await admin.from("memorial_draft_contacts").select("memorial_id, email, resume_token, sent_at").in("memorial_id", ids)
      : { data: [] };
    const contacts = new Map((contactRows ?? []).map((c) => [c.memorial_id as string, c]));

    for (const m of drafts ?? []) {
      const { data: owner } = await admin.auth.admin.getUserById(m.owner_id);
      const accountEmail = owner?.user && !owner.user.is_anonymous ? owner.user.email : null;
      const contact = contacts.get(m.id);
      const email = accountEmail ?? contact?.email ?? null;
      // No e-mail yet: leave the draft unmarked so a later e-mail still gets the reminder.
      if (!email) { results.push({ memorial: m.id, pass: index + 1, status: "no_email_yet" }); continue; }
      if (!accountEmail && contact?.sent_at && now - new Date(contact.sent_at).getTime() < QUIET_AFTER_LINK_MS) {
        results.push({ memorial: m.id, pass: index + 1, status: "link_sent_recently" });
        continue;
      }
      const link = accountEmail || !contact
        ? `${SITE}/moji-memorijali`
        : `${SITE}/kreiraj-memorijal?nastavi=${encodeURIComponent(m.id)}&k=${encodeURIComponent(contact.resume_token)}`;

      // Claim the draft first so an overlapping run never sends twice.
      const { data: claimed } = await admin.from("memorials")
        .update({ [pass.column]: new Date().toISOString() })
        .eq("id", m.id).is(pass.column, null).select("id").maybeSingle();
      if (!claimed) continue;

      const ob = (m as { obituaries?: { ime?: string; prezime?: string } | null }).obituaries;
      const name = [ob?.ime, ob?.prezime].filter(Boolean).join(" ").trim();
      try {
        await sendMail({ to: email, subject: pass.subject, html: pass.html(name, link) });
        results.push({ memorial: m.id, pass: index + 1, status: "sent" });
      } catch (e) {
        // Release the claim so the next hourly run retries.
        await admin.from("memorials").update({ [pass.column]: null }).eq("id", m.id);
        results.push({ memorial: m.id, pass: index + 1, status: `failed: ${String(e).slice(0, 80)}` });
      }
    }
  }
  return new Response(JSON.stringify({ processed: results.length, results }), { headers: { "Content-Type": "application/json" } });
});
