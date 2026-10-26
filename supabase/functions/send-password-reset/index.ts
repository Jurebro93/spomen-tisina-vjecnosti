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

const isAllowedRedirect = (redirectTo: string) => {
  try {
    const url = new URL(redirectTo);
    if (url.pathname !== "/reset-password") return false;
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
    const redirectTo = String(body.redirectTo ?? "").trim();
    // A guest who made an account at checkout got a generated password; this mail lets them set their own.
    const isNewAccount = body.purpose === "new_account";

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 255) {
      return json({ error: "Neispravna e-mail adresa" }, 400);
    }
    if (!isAllowedRedirect(redirectTo)) {
      return json({ error: "Neispravna destinacija" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    const actionLink = data?.properties?.action_link;
    if (error || !actionLink) {
      // Do not reveal whether the account exists.
      return json({ ok: true });
    }

    await sendMail({
      to: email,
      subject: isNewAccount ? "Vaš račun na osmrtnica.com.hr" : "Nova lozinka – osmrtnica.com.hr",
      html: `
        <div style="font-family:Georgia,'Times New Roman',serif;background:#faf9f7;padding:32px;color:#222">
          <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #ece7dd;border-radius:12px;padding:32px">
            <p style="margin:0 0 4px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#b8944a">osmrtnica.com.hr</p>
            <h1 style="margin:0 0 16px;font-size:22px;color:#1f1f22">${isNewAccount ? "Vaš račun je spreman" : "Promjena lozinke"}</h1>
            <p style="font-size:15px;line-height:1.7;margin:0 0 16px">Poštovani,</p>
            <p style="font-size:15px;line-height:1.7;margin:0 0 16px">
              ${isNewAccount
                ? "memorijal je spremljen na vaš račun s ovom e-mail adresom. Kliknite na gumb ispod i postavite lozinku, pa se kasnije možete prijaviti s bilo kojeg uređaja i urediti memorijal."
                : "zaprimili smo zahtjev za novu lozinku na osmrtnica.com.hr. Kliknite na gumb ispod kako biste postavili novu lozinku."}
            </p>
            <p style="margin:0 0 28px">
              <a href="${actionLink}" style="display:inline-block;background:#b8944a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px">${isNewAccount ? "Postavite lozinku" : "Postavite novu lozinku"}</a>
            </p>
            <p style="font-size:13px;line-height:1.7;color:#6b6b70;margin:0 0 16px">
              ${isNewAccount
                ? "Poveznica vrijedi kratko vrijeme. Kad istekne, na stranici za prijavu kliknite \"Zaboravili ste lozinku?\" i poslat ćemo novu."
                : "Poveznica vrijedi kratko vrijeme. Ako niste zatražili promjenu lozinke, slobodno zanemarite ovu poruku."}
            </p>
            <p style="font-size:15px;line-height:1.7;margin:0">Lijep pozdrav,<br/>osmrtnica.com.hr</p>
          </div>
        </div>
      `,
    });

    return json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[SEND-PASSWORD-RESET]", message);
    return json({ error: "Poveznicu nije bilo moguće poslati" }, 500);
  }
});
