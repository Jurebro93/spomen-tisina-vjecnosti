// Free guide "Kad izgubite voljenu osobu": stores the e-mail (ebook_signups + newsletter_users),
// issues the one-time 30% memorial code the guide's last page promises (once per address,
// shared with the discount popup via discount_signups) and e-mails the download link.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isMailConfigured, sendMail } from "../_shared/mail.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const SITE = "https://osmrtnica.com.hr";
const PDF_PATH = "/vodic/kad-izgubite-voljenu-osobu.pdf";
const DISCOUNT = 30;
const RESEND_AFTER_MS = 24 * 60 * 60 * 1000;

const makeCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return "VODIC30-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
};

const emailHtml = (code: string | null) => `
<div style="font-family:Georgia,serif;max-width:520px;margin:auto;padding:24px;color:#1a1a1a">
  <h1 style="font-size:22px;margin:0 0 12px">Vaš vodič „Kad izgubite voljenu osobu“</h1>
  <p>Hvala vam. Vodič možete preuzeti ovdje, a poveznica ostaje u ovom e-mailu ako vam zatreba kasnije ili ga želite proslijediti obitelji:</p>
  <p><a href="${SITE}${PDF_PATH}" style="display:inline-block;background:#c9a24a;color:#111;padding:12px 20px;text-decoration:none;font-weight:bold">Preuzmite vodič (PDF, 24 stranice)</a></p>
  <p>Vodič je kronološki: krenite od prvih 24 sata i idite dalje tek kad budete spremni. Kontrolne liste na kraju možete ispisati i podijeliti obitelji.</p>
  ${code ? `<p style="margin-top:24px">Na zadnjoj stranici vodiča spominjemo digitalni memorijal. Ako ga jednom poželite izraditi, ovo je vaš kod za ${DISCOUNT}% popusta (vrijedi za jednu kupnju):</p>
  <p style="font-size:22px;font-weight:bold;letter-spacing:2px;background:#f6f1e3;border:1px solid #c9a24a;padding:12px;text-align:center">${code}</p>
  <p>Upišite ga u polje „Promo kod“ pri plaćanju na <a href="${SITE}/digitalni-memorijal/">osmrtnica.com.hr/digitalni-memorijal</a>.</p>` : ""}
  <p style="font-size:12px;color:#666;margin-top:24px">Primili ste ovaj e-mail jer ste na osmrtnica.com.hr zatražili vodič. Povremeno ćemo vam poslati još praktičnih savjeta; odjaviti se možete odgovorom na ovaj e-mail. <a href="${SITE}/politika-privatnosti/">Politika privatnosti</a></p>
</div>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { email?: unknown; placement?: unknown; landingUrl?: unknown };
  try { body = await req.json(); } catch { return json({ error: "Neispravan zahtjev." }, 400); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return json({ error: "Upišite ispravnu e-mail adresu." }, 400);
  }
  const placement = typeof body.placement === "string" ? body.placement.replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "unknown" : "unknown";
  const landingUrl = typeof body.landingUrl === "string" ? body.landingUrl.slice(0, 500) : null;

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = new Date();

  const { data: existing } = await admin.from("ebook_signups")
    .select("id, downloads, promo_code, email_sent_at").eq("email", email).maybeSingle();

  let rowId: string;
  let promoCode: string | null = existing?.promo_code ?? null;
  if (existing) {
    rowId = existing.id;
    await admin.from("ebook_signups")
      .update({ downloads: existing.downloads + 1, last_requested_at: now.toISOString() }).eq("id", rowId);
    // Don't let the form be used to flood someone's inbox.
    if (existing.email_sent_at && now.getTime() - new Date(existing.email_sent_at).getTime() < RESEND_AFTER_MS) {
      return json({ pdf: PDF_PATH, emailSent: false, repeat: true });
    }
  } else {
    const { data: row, error } = await admin.from("ebook_signups")
      .insert({ email, placement, landing_url: landingUrl }).select("id").single();
    if (error) {
      console.error(error);
      return json({ error: "Prijavu trenutačno nije moguće spremiti." }, 500);
    }
    rowId = row.id;
    await admin.from("newsletter_users").upsert({ email, active: true }, { onConflict: "email", ignoreDuplicates: true });

    // One discount code per address, whether it came from the popup or the guide.
    const { data: claimed } = await admin.from("discount_signups").select("id").eq("email", email).maybeSingle();
    if (!claimed) {
      for (let i = 0; i < 5 && !promoCode; i++) {
        const { data, error: promoErr } = await admin.from("promo_codes").insert({
          code: makeCode(), discount_type: "percentage", discount_value: DISCOUNT,
          product_type: "memorial", active: true, max_uses: 1, max_uses_per_user: 1,
        }).select("id, code").single();
        if (!promoErr) {
          const { error: dsErr } = await admin.from("discount_signups").insert({
            email, source: "ebook", promo_code_id: data.id, promo_code: data.code, newsletter_opt_in: true,
          });
          if (dsErr) { await admin.from("promo_codes").delete().eq("id", data.id); break; }
          promoCode = data.code;
        } else if (promoErr.code !== "23505") { console.error(promoErr); break; }
      }
      if (promoCode) await admin.from("ebook_signups").update({ promo_code: promoCode }).eq("id", rowId);
    }
  }

  let emailSent = false;
  if (isMailConfigured()) {
    try {
      await sendMail({ to: email, subject: "Vaš vodič: Kad izgubite voljenu osobu", html: emailHtml(promoCode) });
      emailSent = true;
      await admin.from("ebook_signups").update({ email_sent_at: now.toISOString(), email_error: null }).eq("id", rowId);
    } catch (e) {
      console.error("mail failed", e);
      await admin.from("ebook_signups").update({ email_error: String(e).slice(0, 500) }).eq("id", rowId);
    }
  } else {
    await admin.from("ebook_signups").update({ email_error: "SMTP not configured" }).eq("id", rowId);
  }

  return json({ pdf: PDF_PATH, emailSent });
});
