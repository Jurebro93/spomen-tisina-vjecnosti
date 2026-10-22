// Free guides ("Kad izgubite voljenu osobu", "Obiteljska mirovina korak po korak"): stores the
// e-mail (ebook_signups + newsletter_users), issues the one-time 30% memorial code the guides
// promise (once per address, shared with the discount popup via discount_signups) and e-mails
// the download link.
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
const DISCOUNT = 30;

type GuideId = "kad-izgubite-voljenu-osobu" | "obiteljska-mirovina";
const GUIDES: Record<GuideId, { title: string; pdf: string; pages: string; intro: string; memorialNote: string }> = {
  "kad-izgubite-voljenu-osobu": {
    title: "Kad izgubite voljenu osobu",
    pdf: "/vodic/kad-izgubite-voljenu-osobu.pdf",
    pages: "24 stranice",
    intro: "Vodič je kronološki: krenite od prvih 24 sata i idite dalje tek kad budete spremni. Kontrolne liste na kraju možete ispisati i podijeliti obitelji.",
    memorialNote: "Na zadnjoj stranici vodiča spominjemo digitalni memorijal.",
  },
  "obiteljska-mirovina": {
    title: "Obiteljska mirovina korak po korak",
    pdf: "/vodic/obiteljska-mirovina/obiteljska-mirovina-korak-po-korak.pdf",
    pages: "14 stranica",
    intro: "Ako ste udovica ili udovac s vlastitom mirovinom, počnite od poglavlja 5. Najvažnije je zahtjev HZMO-u predati u roku od šest mjeseci od smrti, a kontrolni popis dokumenata na kraju možete ispisati.",
    memorialNote: "U vodiču spominjemo i digitalni memorijal.",
  },
};
const RESEND_AFTER_MS = 24 * 60 * 60 * 1000;

const makeCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return "VODIC30-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
};

const emailHtml = (guide: GuideId, code: string | null) => {
  const g = GUIDES[guide];
  return `
<div style="font-family:Georgia,serif;max-width:520px;margin:auto;padding:24px;color:#1a1a1a">
  <h1 style="font-size:22px;margin:0 0 12px">Vaš vodič „${g.title}“</h1>
  <p>Hvala vam. Vodič možete preuzeti ovdje, a poveznica ostaje u ovom e-mailu ako vam zatreba kasnije ili ga želite proslijediti obitelji:</p>
  <p><a href="${SITE}${g.pdf}" style="display:inline-block;background:#c9a24a;color:#111;padding:12px 20px;text-decoration:none;font-weight:bold">Preuzmite vodič (PDF, ${g.pages})</a></p>
  <p>${g.intro}</p>
  ${code ? `<p style="margin-top:24px">${g.memorialNote} Ako ga jednom poželite izraditi, ovo je vaš kod za ${DISCOUNT}% popusta (vrijedi za jednu kupnju):</p>
  <p style="font-size:22px;font-weight:bold;letter-spacing:2px;background:#f6f1e3;border:1px solid #c9a24a;padding:12px;text-align:center">${code}</p>
  <p>Upišite ga u polje „Promo kod“ pri plaćanju na <a href="${SITE}/digitalni-memorijal/">osmrtnica.com.hr/digitalni-memorijal</a>.</p>` : ""}
  <p style="font-size:12px;color:#666;margin-top:24px">Primili ste ovaj e-mail jer ste na osmrtnica.com.hr zatražili vodič. Povremeno ćemo vam poslati još praktičnih savjeta; odjaviti se možete odgovorom na ovaj e-mail. <a href="${SITE}/politika-privatnosti/">Politika privatnosti</a></p>
</div>`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { email?: unknown; placement?: unknown; landingUrl?: unknown; guide?: unknown };
  try { body = await req.json(); } catch { return json({ error: "Neispravan zahtjev." }, 400); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return json({ error: "Upišite ispravnu e-mail adresu." }, 400);
  }
  const placement = typeof body.placement === "string" ? body.placement.replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "unknown" : "unknown";
  const landingUrl = typeof body.landingUrl === "string" ? body.landingUrl.slice(0, 500) : null;
  // Older clients don't send a guide; they only know the first one.
  const guide: GuideId = body.guide === "obiteljska-mirovina" ? "obiteljska-mirovina" : "kad-izgubite-voljenu-osobu";
  const pdf = GUIDES[guide].pdf;

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = new Date();

  const { data: existing } = await admin.from("ebook_signups")
    .select("id, downloads, promo_code, email_sent_at").eq("email", email).eq("guide", guide).maybeSingle();

  let rowId: string;
  let promoCode: string | null = existing?.promo_code ?? null;
  if (existing) {
    rowId = existing.id;
    await admin.from("ebook_signups")
      .update({ downloads: existing.downloads + 1, last_requested_at: now.toISOString() }).eq("id", rowId);
    // Don't let the form be used to flood someone's inbox.
    if (existing.email_sent_at && now.getTime() - new Date(existing.email_sent_at).getTime() < RESEND_AFTER_MS) {
      return json({ pdf, emailSent: false, repeat: true });
    }
  } else {
    const { data: row, error } = await admin.from("ebook_signups")
      .insert({ email, guide, placement, landing_url: landingUrl }).select("id").single();
    if (error) {
      console.error(error);
      return json({ error: "Prijavu trenutačno nije moguće spremiti." }, 500);
    }
    rowId = row.id;
    await admin.from("newsletter_users").upsert({ email, active: true }, { onConflict: "email", ignoreDuplicates: true });

    // One discount code per address, whether it came from the popup or the guide.
    // An address that already has a code (other guide or the popup) gets the same code again.
    const { data: claimed } = await admin.from("discount_signups").select("id, promo_code_id").eq("email", email).maybeSingle();
    if (claimed) {
      // Only repeat it while it can still be used.
      const { data: promo } = claimed.promo_code_id
        ? await admin.from("promo_codes").select("code, active, max_uses, current_uses").eq("id", claimed.promo_code_id).maybeSingle()
        : { data: null };
      promoCode = promo?.active && (promo.max_uses === null || (promo.current_uses ?? 0) < promo.max_uses) ? promo.code : null;
      if (promoCode) await admin.from("ebook_signups").update({ promo_code: promoCode }).eq("id", rowId);
    } else {
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
      await sendMail({ to: email, subject: `Vaš vodič: ${GUIDES[guide].title}`, html: emailHtml(guide, promoCode) });
      emailSent = true;
      await admin.from("ebook_signups").update({ email_sent_at: now.toISOString(), email_error: null }).eq("id", rowId);
    } catch (e) {
      console.error("mail failed", e);
      await admin.from("ebook_signups").update({ email_error: String(e).slice(0, 500) }).eq("id", rowId);
    }
  } else {
    await admin.from("ebook_signups").update({ email_error: "SMTP not configured" }).eq("id", rowId);
  }

  return json({ pdf, emailSent });
});
