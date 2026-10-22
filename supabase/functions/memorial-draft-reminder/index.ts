// Scheduled (hourly) reminder for unfinished memorial drafts. Protected by a Vault secret.
// Sends one e-mail per draft, 3 h to 7 days after it was created: to the owner's account e-mail, or for guests to the
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

const REMIND_AFTER_MS = 3 * 3600_000;
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
  reason: "Ako memorijal više ne želite izraditi, slobodno zanemarite ovu poruku. Drugu poruku o istoj skici nećemo slati.",
});

Deno.serve(async (req) => {
  const provided = req.headers.get("x-reminder-secret") ?? "";
  const admin = adminClient();
  const { data: expected, error: secretError } = await admin.rpc("memorial_reminder_secret");
  if (secretError || typeof expected !== "string" || expected.length < 32 || !safeEqual(provided, expected)) {
    return new Response("forbidden", { status: 403 });
  }
  if (!isMailConfigured()) return new Response("mail not configured", { status: 500 });

  const now = Date.now();
  const { data: drafts, error } = await admin.from("memorials")
    .select("id, owner_id, deceased_id, obituaries(ime, prezime)")
    .eq("status", "draft")
    .eq("paid", false)
    .is("draft_reminder_sent_at", null)
    .lte("created_at", new Date(now - REMIND_AFTER_MS).toISOString())
    .gte("created_at", new Date(now - 7 * 24 * 3600_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const ids = (drafts ?? []).map((m) => m.id);
  const { data: contactRows } = ids.length
    ? await admin.from("memorial_draft_contacts").select("memorial_id, email, resume_token, sent_at").in("memorial_id", ids)
    : { data: [] };
  const contacts = new Map((contactRows ?? []).map((c) => [c.memorial_id as string, c]));

  const results: Array<{ memorial: string; status: string }> = [];
  for (const m of drafts ?? []) {
    const { data: owner } = await admin.auth.admin.getUserById(m.owner_id);
    const accountEmail = owner?.user && !owner.user.is_anonymous ? owner.user.email : null;
    const contact = contacts.get(m.id);
    const email = accountEmail ?? contact?.email ?? null;
    // No e-mail yet: leave the draft unmarked so a later e-mail still gets the reminder.
    if (!email) { results.push({ memorial: m.id, status: "no_email_yet" }); continue; }
    if (!accountEmail && contact?.sent_at && now - new Date(contact.sent_at).getTime() < QUIET_AFTER_LINK_MS) {
      results.push({ memorial: m.id, status: "link_sent_recently" });
      continue;
    }
    const link = accountEmail || !contact
      ? `${SITE}/moji-memorijali`
      : `${SITE}/kreiraj-memorijal?nastavi=${encodeURIComponent(m.id)}&k=${encodeURIComponent(contact.resume_token)}`;

    // Claim the draft first so an overlapping run never sends twice.
    const { data: claimed } = await admin.from("memorials")
      .update({ draft_reminder_sent_at: new Date().toISOString() })
      .eq("id", m.id).is("draft_reminder_sent_at", null).select("id").maybeSingle();
    if (!claimed) continue;

    const ob = (m as { obituaries?: { ime?: string; prezime?: string } | null }).obituaries;
    const name = [ob?.ime, ob?.prezime].filter(Boolean).join(" ").trim();
    try {
      await sendMail({ to: email, subject: "Vaš digitalni memorijal čeka da ga dovršite", html: reminderHtml(name, link) });
      results.push({ memorial: m.id, status: "sent" });
    } catch (e) {
      // Release the claim so the next hourly run retries.
      await admin.from("memorials").update({ draft_reminder_sent_at: null }).eq("id", m.id);
      results.push({ memorial: m.id, status: `failed: ${String(e).slice(0, 80)}` });
    }
  }
  return new Response(JSON.stringify({ processed: results.length, results }), { headers: { "Content-Type": "application/json" } });
});
