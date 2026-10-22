// Free guides (see GUIDES below): stores the
// e-mail (ebook_signups + newsletter_users), issues the one-time 30% memorial code the guides
// promise (once per address, shared with the discount popup via discount_signups) and e-mails
// the download link.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isMailConfigured, sendMail } from "../_shared/mail.ts";
import { emailButton, emailLayout, emailParagraph, SITE } from "../_shared/emailLayout.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const DISCOUNT = 30;

type GuideId = "kad-izgubite-voljenu-osobu" | "obiteljska-mirovina" | "smrt-u-inozemstvu" | "digitalna-ostavstina";
const GUIDES: Record<GuideId, { title: string; pdf: string; cover: string; pages: string; intro: string; memorialNote: string }> = {
  "kad-izgubite-voljenu-osobu": {
    title: "Kad izgubite voljenu osobu",
    pdf: "/vodic/kad-izgubite-voljenu-osobu.pdf",
    cover: "/vodic/naslovnica.jpg",
    pages: "24 stranice",
    intro: "Vodič je kronološki: krenite od prvih 24 sata i idite dalje tek kad budete spremni. Kontrolne liste na kraju možete ispisati i podijeliti obitelji.",
    memorialNote: "Na zadnjoj stranici vodiča spominjemo digitalni memorijal.",
  },
  "obiteljska-mirovina": {
    title: "Obiteljska mirovina korak po korak",
    pdf: "/vodic/obiteljska-mirovina/obiteljska-mirovina-korak-po-korak.pdf",
    cover: "/vodic/obiteljska-mirovina/naslovnica.jpg",
    pages: "14 stranica",
    intro: "Ako ste udovica ili udovac s vlastitom mirovinom, počnite od poglavlja 5. Najvažnije je zahtjev HZMO-u predati u roku od šest mjeseci od smrti, a kontrolni popis dokumenata na kraju možete ispisati.",
    memorialNote: "U vodiču spominjemo i digitalni memorijal.",
  },
  "smrt-u-inozemstvu": {
    title: "Smrt u inozemstvu",
    pdf: "/vodic/smrt-u-inozemstvu/smrt-u-inozemstvu.pdf",
    cover: "/vodic/smrt-u-inozemstvu/naslovnica.jpg",
    pages: "18 stranica",
    intro: "Ako se to upravo dogodilo, počnite od poglavlja 1, Prva tri sata. Kontrolni popis dokumenata i tablicu za kontakte na kraju možete ispisati i podijeliti s obitelji u Hrvatskoj.",
    memorialNote: "U vodiču spominjemo i digitalni memorijal, mjesto gdje se rodbina iz svih država okuplja na jednom linku.",
  },
  "digitalna-ostavstina": {
    title: "Digitalna ostavština",
    pdf: "/vodic/digitalna-ostavstina/digitalna-ostavstina.pdf",
    cover: "/vodic/digitalna-ostavstina/naslovnica.jpg",
    pages: "16 stranica",
    intro: "Prije nego što išta ugasite, pročitajte poglavlja 1 i 2: mobitel pokojnika i čuvanje fotografija i poruka. Obrazac za vlastitu digitalnu ostavštinu nalazi se na kraju.",
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
  const body = [
    emailParagraph("Hvala vam. Vodič možete preuzeti klikom na gumb. Poveznica ostaje u ovom e-mailu ako vam zatreba kasnije ili ga želite proslijediti obitelji."),
    emailButton(`${SITE}${g.pdf}`, `Preuzmite vodič (PDF, ${g.pages})`),
    emailParagraph(g.intro),
    code ? `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;background:#f8f3e7;border:1px solid #c9a24a;border-radius:6px">
  <tr><td style="padding:22px 20px;text-align:center">
    <p style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.5;color:#2b2b2b">${g.memorialNote} Ako ga jednom poželite izraditi, ovo je vaš kod za <strong>${DISCOUNT} % popusta</strong> (vrijedi za jednu kupnju):</p>
    <p style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:26px;font-weight:bold;letter-spacing:3px;color:#111111">${code}</p>
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#555555">Upišite ga u polje „Promo kod“ pri plaćanju na <a href="${SITE}/digitalni-memorijal/" style="color:#8a6a1f">osmrtnica.com.hr/digitalni-memorijal</a>.</p>
  </td></tr>
</table>` : "",
  ].join("");
  return emailLayout({
    preheader: code ? `Poveznica za preuzimanje i vaš kod za ${DISCOUNT} % popusta.` : "Poveznica za preuzimanje vodiča.",
    title: `Vaš vodič „${g.title}“`,
    image: { src: `${SITE}${g.cover}`, alt: `Naslovnica vodiča „${g.title}“`, width: 220 },
    body,
    reason: "Primili ste ovaj e-mail jer ste na osmrtnica.com.hr zatražili vodič. Povremeno ćemo vam poslati još praktičnih savjeta; odjaviti se možete odgovorom na ovaj e-mail.",
  });
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
  const guide: GuideId = typeof body.guide === "string" && Object.hasOwn(GUIDES, body.guide) ? body.guide as GuideId : "kad-izgubite-voljenu-osobu";
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
