// Scheduled (hourly) reminder for unfinished memorial drafts. Protected by a Vault secret.
// Sends one e-mail per draft, 24 h to 7 days after it was created, to registered owners only (guests have no e-mail yet).
import { adminClient } from "../_shared/invoices.ts";
import { isMailConfigured, sendMail } from "../_shared/mail.ts";

const SITE = "https://osmrtnica.com.hr";

const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const reminderHtml = (name: string) => `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1f1f1f;line-height:1.6">
  <p>Poštovani,</p>
  <p>započeli ste digitalni memorijal${name ? ` za <strong>${escapeHtml(name)}</strong>` : ""}, ali još nije objavljen. Sve što ste upisali je spremljeno.</p>
  <p>Memorijal možete dovršiti kad god budete spremni: dodajte fotografije i priču, pa ga objavite za obitelj i prijatelje.</p>
  <p style="margin:28px 0">
    <a href="${SITE}/moji-memorijali" style="background:#1f1f1f;color:#d4af37;padding:12px 22px;text-decoration:none;font-weight:bold">Dovršite memorijal</a>
  </p>
  <p style="color:#666;font-size:13px">Ako memorijal više ne želite izraditi, slobodno zanemarite ovu poruku. Drugu poruku o istoj skici nećemo slati.</p>
  <p>Osmrtnica.com.hr</p>
</div>`;

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
    .lte("created_at", new Date(now - 24 * 3600_000).toISOString())
    .gte("created_at", new Date(now - 7 * 24 * 3600_000).toISOString())
    .limit(50);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const results: Array<{ memorial: string; status: string }> = [];
  for (const m of drafts ?? []) {
    // Claim the draft first so an overlapping run never sends twice.
    const { data: claimed } = await admin.from("memorials")
      .update({ draft_reminder_sent_at: new Date().toISOString() })
      .eq("id", m.id).is("draft_reminder_sent_at", null).select("id").maybeSingle();
    if (!claimed) continue;

    const { data: owner } = await admin.auth.admin.getUserById(m.owner_id);
    const email = owner?.user && !owner.user.is_anonymous ? owner.user.email : null;
    if (!email) { results.push({ memorial: m.id, status: "skipped_no_email" }); continue; }

    const ob = (m as { obituaries?: { ime?: string; prezime?: string } | null }).obituaries;
    const name = [ob?.ime, ob?.prezime].filter(Boolean).join(" ").trim();
    try {
      await sendMail({ to: email, subject: "Vaš digitalni memorijal čeka da ga dovršite", html: reminderHtml(name) });
      results.push({ memorial: m.id, status: "sent" });
    } catch (e) {
      // Release the claim so the next hourly run retries.
      await admin.from("memorials").update({ draft_reminder_sent_at: null }).eq("id", m.id);
      results.push({ memorial: m.id, status: `failed: ${String(e).slice(0, 80)}` });
    }
  }
  return new Response(JSON.stringify({ processed: results.length, results }), { headers: { "Content-Type": "application/json" } });
});
