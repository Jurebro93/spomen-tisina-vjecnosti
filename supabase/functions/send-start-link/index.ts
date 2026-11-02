// "Pošaljite si poveznicu" on the first screen of /kreiraj-memorijal: a visitor without time right now
// leaves an e-mail and gets one link back to the form. No account, no draft yet, so the address is kept
// in memorial_start_links (service role only). At most one mail per address per day and 300 per day overall.
import { isSeasonalPromoRunning } from "../_shared/seasonalPromo.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isMailConfigured, sendMail } from "../_shared/mail.ts";
import { emailButton, emailLayout, emailNote, emailParagraph, SITE } from "../_shared/emailLayout.ts";

const DAY_MS = 24 * 60 * 60_000;
const DAILY_CAP = 300;


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const startLink = `${SITE}/kreiraj-memorijal?utm_source=email&utm_medium=start_link&utm_campaign=start_link`;

const linkHtml = () => emailLayout({
  preheader: "Memorijal možete napraviti kad budete imali mira i vremena.",
  title: "Poveznica za izradu memorijala",
  body: [
    emailParagraph("Poštovani,<br>ovo je poveznica koju ste zatražili za izradu digitalnog memorijala. Za početak su dovoljni ime i prezime osobe, a priču i fotografije možete dodati kasnije."),
    emailButton(startLink, "Započnite memorijal"),
    isSeasonalPromoRunning()
      ? emailNote("Do 2. studenoga (Svi sveti) memorijal stoji 19,50 € umjesto 39 €, a popust se na stranici sam primjenjuje. Plaćate tek kad vidite gotov memorijal.")
      : emailNote("Plaćate tek kad vidite gotov memorijal."),
  ].join(""),
  reason: "Primili ste ovaj e-mail jer ste na osmrtnica.com.hr zatražili poveznicu za izradu memorijala. Nismo vas upisali ni na kakav popis. Ako to niste bili vi, zanemarite ga.",
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metoda nije podržana" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 255) return json({ ok: false, code: "invalid_email" }, 400);
    if (!isMailConfigured()) return json({ ok: false, code: "mail_unavailable" }, 500);

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false },
    });
    const since = new Date(Date.now() - DAY_MS).toISOString();
    const { data: existing } = await admin.from("memorial_start_links").select("sent_at").eq("email", email).maybeSingle();
    if (existing?.sent_at && existing.sent_at > since) return json({ ok: false, code: "too_soon" });
    const { count } = await admin.from("memorial_start_links").select("email", { count: "exact", head: true }).gt("sent_at", since);
    if ((count ?? 0) >= DAILY_CAP) return json({ ok: false, code: "busy" }, 429);

    await sendMail({ to: email, subject: "Poveznica za izradu memorijala", html: linkHtml() });
    const { error } = await admin.from("memorial_start_links").upsert({
      email, sent_at: new Date().toISOString(), campaign: String(body.campaign ?? "").slice(0, 200) || null,
    });
    if (error) throw error;
    return json({ ok: true });
  } catch (error) {
    console.error("[SEND-START-LINK]", error instanceof Error ? error.message : String(error));
    return json({ ok: false, code: "error" }, 500);
  }
});
