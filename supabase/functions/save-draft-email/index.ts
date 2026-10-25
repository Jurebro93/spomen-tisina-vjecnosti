// Memorial drafts of guests (anonymous sessions). Two actions:
// - "save": the owner leaves an e-mail; it is stored in memorial_draft_contacts (service role only)
//   and a link back to the draft is sent right away, at most once per 10 minutes.
// - "claim": the e-mailed link was opened in another browser (new guest session); with the link's
//   token the draft moves to that session. Only drafts still owned by a guest move; drafts of a
//   registered account stay put and the owner simply logs in.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isMailConfigured, sendMail } from "../_shared/mail.ts";
import { emailButton, emailLayout, emailNote, emailParagraph, escapeHtml, SITE } from "../_shared/emailLayout.ts";

const RESEND_AFTER_MS = 10 * 60_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

const newToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const draftLink = (memorialId: string, token: string) =>
  `${SITE}/kreiraj-memorijal?nastavi=${encodeURIComponent(memorialId)}&k=${encodeURIComponent(token)}`;

const linkHtml = (name: string, link: string) => emailLayout({
  preheader: "Nastavite memorijal kad budete spremni, i na drugom uređaju.",
  title: "Poveznica na vaš memorijal",
  body: [
    emailParagraph(`Poštovani,<br>ovo je poveznica na digitalni memorijal${name ? ` za <strong>${escapeHtml(name)}</strong>` : ""} koji ste započeli. Sve što ste upisali je spremljeno.`),
    emailButton(link, "Nastavite memorijal"),
    emailNote("Poveznica otvara vaš nacrt na bilo kojem uređaju, zato je ne prosljeđujte drugima."),
  ].join(""),
  reason: "Primili ste ovaj e-mail jer ste na osmrtnica.com.hr zatražili poveznicu na nacrt memorijala. Ako to niste bili vi, zanemarite ga.",
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metoda nije podržana" }, 405);

  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ ok: false, code: "unauthorized" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false },
    });
    const { data: callerData, error: callerError } = await admin.auth.getUser(token);
    const caller = callerData?.user;
    if (callerError || !caller) return json({ ok: false, code: "unauthorized" }, 401);

    const body = await req.json();
    const memorialId = String(body.memorial_id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(memorialId)) return json({ ok: false, code: "invalid" }, 400);

    const { data: memorial } = await admin.from("memorials")
      .select("id, owner_id, status, paid, obituaries(ime, prezime)")
      .eq("id", memorialId).maybeSingle();
    if (!memorial) return json({ ok: false, code: "not_found" }, 404);
    const isOpenDraft = memorial.status === "draft" && !memorial.paid;

    if (body.action === "claim") {
      const resumeToken = String(body.token ?? "");
      if (memorial.owner_id === caller.id) return json({ ok: true });
      const { data: contact } = await admin.from("memorial_draft_contacts")
        .select("resume_token").eq("memorial_id", memorialId).maybeSingle();
      if (!contact || !resumeToken || !safeEqual(resumeToken, contact.resume_token)) return json({ ok: false, code: "invalid_token" });
      if (!isOpenDraft) return json({ ok: false, code: "not_draft" });
      const { data: owner } = await admin.auth.admin.getUserById(memorial.owner_id);
      if (owner?.user && !owner.user.is_anonymous) return json({ ok: false, code: "has_account" });

      const previousOwner = memorial.owner_id;
      const { error: moveError } = await admin.from("memorials")
        .update({ owner_id: caller.id }).eq("id", memorialId).eq("owner_id", previousOwner);
      if (moveError) throw moveError;
      await admin.from("memorial_managers").update({ user_id: caller.id })
        .eq("memorial_id", memorialId).eq("user_id", previousOwner);
      return json({ ok: true });
    }

    // "save"
    if (memorial.owner_id !== caller.id) return json({ ok: false, code: "forbidden" }, 403);
    if (!isOpenDraft) return json({ ok: false, code: "not_draft" });
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 255) return json({ ok: false, code: "invalid_email" }, 400);
    if (!isMailConfigured()) return json({ ok: false, code: "mail_unavailable" }, 500);

    const { data: existing } = await admin.from("memorial_draft_contacts")
      .select("resume_token, sent_at").eq("memorial_id", memorialId).maybeSingle();
    if (existing?.sent_at && Date.now() - new Date(existing.sent_at).getTime() < RESEND_AFTER_MS) {
      return json({ ok: false, code: "too_soon" });
    }
    const resumeToken = existing?.resume_token ?? newToken();
    const { error: saveError } = await admin.from("memorial_draft_contacts").upsert({
      memorial_id: memorialId, email, resume_token: resumeToken, updated_at: new Date().toISOString(),
    });
    if (saveError) throw saveError;

    const ob = (memorial as { obituaries?: { ime?: string; prezime?: string } | null }).obituaries;
    const name = [ob?.ime, ob?.prezime].filter(Boolean).join(" ").trim();
    await sendMail({ to: email, subject: "Poveznica na vaš digitalni memorijal", html: linkHtml(name, draftLink(memorialId, resumeToken)) });
    await admin.from("memorial_draft_contacts").update({ sent_at: new Date().toISOString() }).eq("memorial_id", memorialId);
    return json({ ok: true });
  } catch (error) {
    console.error("[SAVE-DRAFT-EMAIL]", error instanceof Error ? error.message : String(error));
    return json({ ok: false, code: "error" }, 500);
  }
});
