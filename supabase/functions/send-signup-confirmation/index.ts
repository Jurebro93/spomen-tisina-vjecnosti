import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendMail } from "../_shared/mail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const isAllowedRedirect = (redirectTo: string) => {
  try {
    const url = new URL(redirectTo);
    if (url.username || url.password) return false;
    if (!url.pathname.startsWith("/") || url.pathname.startsWith("//")) return false;
    const host = url.hostname;
    if (host === "localhost" || host === "127.0.0.1") return true;
    if (host === "osmrtnica.com.hr" || host === "www.osmrtnica.com.hr") return true;
    if (host.endsWith(".lovable.app")) return true;
    return false;
  } catch {
    return false;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metoda nije podržana" }, 405);

  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const redirectTo = String(body.redirectTo ?? "").trim();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 255) {
      return json({ ok: false, code: "invalid" }, 400);
    }
    if (password.length < 8 || password.length > 72) {
      return json({ ok: false, code: "invalid" }, 400);
    }
    if (!firstName || !lastName || firstName.length > 60 || lastName.length > 60) {
      return json({ ok: false, code: "invalid" }, 400);
    }
    if (!isAllowedRedirect(redirectTo)) {
      return json({ ok: false, code: "invalid" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        redirectTo,
        data: { first_name: firstName, last_name: lastName },
      },
    });

    const actionLink = data?.properties?.action_link;
    if (error || !actionLink) {
      const message = (error?.message ?? "").toLowerCase();
      if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
        return json({ ok: false, code: "already_exists" });
      }
      console.error("[SEND-SIGNUP-CONFIRMATION]", error?.message ?? "missing action link");
      return json({ error: "Poruku nije bilo moguće poslati" }, 500);
    }

    const href = escapeHtml(actionLink);
    await sendMail({
      to: email,
      subject: "Potvrdite registraciju – osmrtnica.com.hr",
      html: `
        <div style="font-family:Georgia,'Times New Roman',serif;background:#faf9f7;padding:32px;color:#222">
          <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #ece7dd;border-radius:12px;padding:32px">
            <p style="margin:0 0 4px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#b8944a">osmrtnica.com.hr</p>
            <h1 style="margin:0 0 16px;font-size:22px;color:#1f1f22">Potvrdite registraciju</h1>
            <p style="font-size:15px;line-height:1.7;margin:0 0 16px">Poštovani,</p>
            <p style="font-size:15px;line-height:1.7;margin:0 0 16px">
              hvala na registraciji na osmrtnica.com.hr. Kliknite na gumb ispod kako biste potvrdili e-mail adresu i dovršili otvaranje računa.
            </p>
            <p style="margin:0 0 28px">
              <a href="${href}" style="display:inline-block;background:#b8944a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px">Potvrdite e-mail</a>
            </p>
            <p style="font-size:13px;line-height:1.7;color:#6b6b70;margin:0 0 16px">
              Ako niste vi otvorili račun, slobodno zanemarite ovu poruku.
            </p>
            <p style="font-size:15px;line-height:1.7;margin:0">Lijep pozdrav,<br/>osmrtnica.com.hr</p>
          </div>
        </div>
      `,
    });

    return json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[SEND-SIGNUP-CONFIRMATION]", message);
    return json({ error: "Poruku nije bilo moguće poslati" }, 500);
  }
});
