// Turns the guest session that started a memorial into a real account before checkout,
// so the buyer can log in later and keep editing. Two modes:
// - "create": the guest user itself gets the e-mail and password (same id, nothing to move).
// - "login": the e-mail already has an account; after checking its password, everything
//   the guest created moves to that account.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Auth answers a taken e-mail with a generic "Error updating user", so look it up in profiles
// (filled from auth.users for every account, Google ones included).
const emailTaken = async (admin: ReturnType<typeof createClient>, email: string) => {
  const pattern = email.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data } = await admin.from("profiles").select("id").ilike("email", pattern).limit(1);
  return Boolean(data?.length);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metoda nije podržana" }, 405);

  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ ok: false, code: "unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false },
    });

    const { data: guestData, error: guestError } = await admin.auth.getUser(token);
    const guest = guestData?.user;
    if (guestError || !guest) return json({ ok: false, code: "unauthorized" }, 401);
    if (!guest.is_anonymous) return json({ ok: false, code: "not_guest" }, 400);

    const body = await req.json();
    const mode = body.mode === "login" ? "login" : "create";
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 255) {
      return json({ ok: false, code: "invalid" }, 400);
    }
    if (password.length < 8 || password.length > 72) {
      return json({ ok: false, code: "invalid" }, 400);
    }

    if (mode === "create") {
      if (await emailTaken(admin, email)) return json({ ok: false, code: "already_exists" });
      const { error } = await admin.auth.admin.updateUserById(guest.id, {
        email,
        password,
        email_confirm: true,
      });
      if (error) {
        if (await emailTaken(admin, email)) return json({ ok: false, code: "already_exists" });
        throw error;
      }
      await admin.from("profiles").update({ email }).eq("id", guest.id);
      return json({ ok: true });
    }

    // "login": the password must match the existing account before anything moves.
    const checker = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signIn, error: signInError } = await checker.auth.signInWithPassword({ email, password });
    const target = signIn?.user;
    if (signInError || !target) return json({ ok: false, code: "wrong_password" });
    if (target.id === guest.id) return json({ ok: true });

    // A guest has at most a few fresh drafts, so a manager row for the target account
    // on the same memorial can only be the target's own; drop the guest's duplicate.
    const { data: guestMemorials } = await admin.from("memorials").select("id").eq("owner_id", guest.id);
    const memorialIds = (guestMemorials ?? []).map((m: { id: string }) => m.id);
    if (memorialIds.length) {
      const { data: existing } = await admin
        .from("memorial_managers")
        .select("memorial_id")
        .eq("user_id", target.id)
        .in("memorial_id", memorialIds);
      const taken = (existing ?? []).map((r: { memorial_id: string }) => r.memorial_id);
      if (taken.length) {
        await admin.from("memorial_managers").delete().eq("user_id", guest.id).in("memorial_id", taken);
      }
    }

    const moves: Array<[string, string]> = [
      ["memorials", "owner_id"],
      ["memorial_managers", "user_id"],
      ["billing_details", "user_id"],
      ["memorial_orders", "user_id"],
      ["invoices", "user_id"],
      ["memorial_audit_log", "user_id"],
    ];
    for (const [table, column] of moves) {
      const { error } = await admin.from(table).update({ [column]: target.id }).eq(column, guest.id);
      if (error) throw new Error(`${table}: ${error.message}`);
    }
    return json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[CONVERT-GUEST-ACCOUNT]", message);
    return json({ error: "Račun nije bilo moguće spremiti" }, 500);
  }
});
