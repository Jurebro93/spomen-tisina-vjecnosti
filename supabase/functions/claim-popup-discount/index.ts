import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isMailConfigured, sendMail } from "../_shared/mail.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const DISCOUNT = 15;
const SITE = "https://osmrtnica.com.hr";

const makeCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return "POPUST15-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
};

const emailHtml = (code: string) => `
<div style="font-family:Georgia,serif;max-width:520px;margin:auto;padding:24px;color:#1a1a1a">
  <h1 style="font-size:22px;margin:0 0 12px">Tvojih 15% popusta je spremno!</h1>
  <p>Hvala na prijavi. Tvoj jedinstveni kod za 15% popusta na izradu digitalnog memorijala:</p>
  <p style="font-size:24px;font-weight:bold;letter-spacing:2px;background:#f6f1e3;border:1px solid #c9a24a;padding:12px;text-align:center">${code}</p>
  <p>Kod vrijedi za jednu kupnju digitalnog memorijala i ne zbraja se s drugim promo kodovima. Upiši ga u polje „Promo kod" pri plaćanju.</p>
  <p><a href="${SITE}/digitalni-memorijal/" style="display:inline-block;background:#c9a24a;color:#111;padding:12px 20px;text-decoration:none;font-weight:bold">Izradi digitalni memorijal</a></p>
  <p style="font-size:12px;color:#666">E-mail adresu koristimo za slanje koda za popust. <a href="${SITE}/politika-privatnosti/">Politika privatnosti</a></p>
</div>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { email?: unknown; newsletter?: unknown };
  try { body = await req.json(); } catch { return json({ error: "Neispravan zahtjev." }, 400); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const newsletter = body.newsletter === true;
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return json({ error: "Upiši ispravnu e-mail adresu." }, 400);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: existing } = await admin.from("discount_signups").select("id").eq("email", email).maybeSingle();
  if (existing) {
    return json({ error: "Za ovu e-mail adresu kod za popust već je izdan. Provjeri svoj sandučić.", code: "already_claimed" }, 409);
  }

  // Unique code, one use, memorial only.
  let promo: { id: string; code: string } | null = null;
  for (let i = 0; i < 5 && !promo; i++) {
    const { data, error } = await admin.from("promo_codes").insert({
      code: makeCode(), discount_type: "percentage", discount_value: DISCOUNT,
      product_type: "memorial", active: true, max_uses: 1, max_uses_per_user: 1,
    }).select("id, code").single();
    if (!error) promo = data;
    else if (error.code !== "23505") { console.error(error); return json({ error: "Kod trenutno nije moguće izdati." }, 500); }
  }
  if (!promo) return json({ error: "Kod trenutno nije moguće izdati." }, 500);

  const { data: signup, error: signErr } = await admin.from("discount_signups").insert({
    email, source: "popup", promo_code_id: promo.id, promo_code: promo.code, newsletter_opt_in: newsletter,
  }).select("id").single();
  if (signErr) {
    await admin.from("promo_codes").delete().eq("id", promo.id);
    if (signErr.code === "23505") return json({ error: "Za ovu e-mail adresu kod za popust već je izdan.", code: "already_claimed" }, 409);
    console.error(signErr);
    return json({ error: "Prijavu nije moguće spremiti." }, 500);
  }

  if (newsletter) {
    await admin.from("newsletter_users").upsert({ email, active: true }, { onConflict: "email", ignoreDuplicates: true });
  }

  let emailSent = false;
  if (isMailConfigured()) {
    try {
      await sendMail({ to: email, subject: "Tvoj kod za 15% popusta — Digitalni memorijal", html: emailHtml(promo.code) });
      emailSent = true;
      await admin.from("discount_signups").update({ email_sent_at: new Date().toISOString() }).eq("id", signup.id);
    } catch (e) {
      console.error("mail failed", e);
      await admin.from("discount_signups").update({ email_error: String(e).slice(0, 500) }).eq("id", signup.id);
    }
  } else {
    await admin.from("discount_signups").update({ email_error: "SMTP not configured" }).eq("id", signup.id);
  }

  return json({ code: promo.code, emailSent });
});
