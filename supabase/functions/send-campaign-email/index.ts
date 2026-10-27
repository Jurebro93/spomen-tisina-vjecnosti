// One-off campaign e-mails to people who left their address (newsletter, guides, memorial drafts).
// Called by an operator with a one-time x-campaign-token inserted into email_campaign_tokens by SQL.
// mode "test" sends one copy with a [Proba] subject; mode "all" sends to every recipient once
// (email_campaign_sends remembers who already got it) and skips buyers and test addresses.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isMailConfigured, sendMail } from "../_shared/mail.ts";
import { emailButton, emailLayout, emailNote, emailParagraph, SITE } from "../_shared/emailLayout.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const TEST_RE = /test|example\.|\+svisveti|kuponclaude|^seoexperiment/i;
const REASON =
  "Primili ste ovaj e-mail jer ste se na osmrtnica.com.hr prijavili za vodič, novosti ili započeli memorijal. Odjaviti se možete odgovorom na ovaj e-mail.";

const link = (content: string) =>
  `${SITE}/kreiraj-memorijal?kod=SVISVETI50&utm_source=email&utm_medium=email&utm_campaign=svisveti_2026&utm_content=${content}`;

type Campaign = { subject: string; html: string };

const CAMPAIGNS: Record<string, Campaign> = {
  svisveti_e1: {
    subject: "Uoči Svih svetih",
    html: emailLayout({
      preheader: "Nekoliko riječi za dane kad se sjećamo svojih.",
      title: "Uoči Svih svetih",
      body: [
        emailParagraph("Dobar dan,"),
        emailParagraph(
          "ovih dana mnogi od nas obilaze groblja, pale svijeće i na trenutak zastanu uz imena onih koje su voljeli. Svi sveti i Dušni dan podsjete nas koliko nam nedostaju, ali i koliko su nam toga ostavili: navike, rečenice koje i danas ponavljamo, recepte, priče koje se pričaju za stolom.",
        ),
        emailParagraph(
          "Te priče često žive samo u sjećanju nekolicine ljudi. Zato postoji digitalni memorijal: jedna mirna stranica na kojoj obitelj može zapisati tko je ta osoba bila, dodati fotografije i podijeliti poveznicu s rodbinom, i onom koja živi daleko.",
        ),
        emailParagraph(
          "Ako ste o tome već razmišljali, ovi su dani možda dobar trenutak. Dovoljno je upisati ime i nekoliko rečenica, a sve ostalo možete dopuniti kad budete spremni.",
        ),
        emailButton(link("e1"), "Započnite memorijal"),
        emailNote("Do 2. studenoga memorijal stoji 19,50 € umjesto 39 €, jednokratno. Popust se na stranici sam primjenjuje."),
        emailParagraph("Želimo vam mirne i tople dane sjećanja."),
      ].join(""),
      reason: REASON,
    }),
  },
};

const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });

const emails = (rows: { email: string | null }[] | null) =>
  (rows ?? []).map((r) => (r.email ?? "").trim().toLowerCase()).filter((e) => EMAIL_RE.test(e));

const recipients = async (db: ReturnType<typeof admin>) => {
  const [news, ebook, drafts, paid] = await Promise.all([
    db.from("newsletter_users").select("email").eq("active", true),
    db.from("ebook_signups").select("email"),
    db.from("memorial_draft_contacts").select("email"),
    db.from("memorial_orders").select("email:customer_email").eq("status", "paid"),
  ]);
  const err = news.error ?? ebook.error ?? drafts.error ?? paid.error;
  if (err) throw err;
  const buyers = new Set(emails(paid.data));
  const all = new Set([...emails(news.data), ...emails(ebook.data), ...emails(drafts.data)]);
  return [...all].filter((e) => !buyers.has(e) && !TEST_RE.test(e));
};

Deno.serve(async (req) => {
  const token = req.headers.get("x-campaign-token") ?? "";
  if (req.method !== "POST" || token.length < 24) return json({ error: "forbidden" }, 403);
  if (!isMailConfigured()) return json({ error: "SMTP is not configured" }, 500);

  const { campaign, mode, test_to, dry_run, limit } = await req.json().catch(() => ({}));
  const content = CAMPAIGNS[campaign as string];
  if (!content) return json({ error: "unknown campaign" }, 400);

  const db = admin();
  const { data: grant } = await db.from("email_campaign_tokens").delete().eq("token", token).eq("campaign", campaign)
    .gt("expires_at", new Date().toISOString()).select("token").maybeSingle();
  if (!grant) return json({ error: "forbidden" }, 403);

  if (mode === "test") {
    if (!EMAIL_RE.test(test_to ?? "")) return json({ error: "test_to required" }, 400);
    await sendMail({ to: test_to, subject: `[Proba] ${content.subject}`, html: content.html });
    return json({ sent: 1, to: test_to });
  }
  if (mode !== "all") return json({ error: "mode must be test or all" }, 400);

  const list = await recipients(db);
  const { data: done, error } = await db.from("email_campaign_sends").select("email").eq("campaign", campaign).not("sent_at", "is", null);
  if (error) return json({ error: error.message }, 500);
  const already = new Set(emails(done));
  // Sent in batches (limit) so one call stays well inside the function time limit.
  const todo = list.filter((e) => !already.has(e)).slice(0, Math.min(Number(limit) || 40, 60));
  if (dry_run) return json({ recipients: list.length, already_sent: already.size, to_send: todo.length });

  let sent = 0;
  const failed: string[] = [];
  for (const email of todo) {
    try {
      await sendMail({ to: email, subject: content.subject, html: content.html });
      await db.from("email_campaign_sends").upsert({ campaign, email, sent_at: new Date().toISOString(), error: null });
      sent++;
    } catch (e) {
      await db.from("email_campaign_sends").upsert({ campaign, email, error: String(e).slice(0, 300) });
      failed.push(email);
    }
  }
  return json({ recipients: list.length, already_sent: already.size, sent, failed: failed.length, remaining: list.length - already.size - sent });
});
