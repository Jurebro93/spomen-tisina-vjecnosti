// Turns the guest session that started a memorial into a real account before checkout,
// so the buyer can log in later and keep editing. Three modes:
// - "create": the guest user itself gets the e-mail and password (same id, nothing to move).
// - "login": the e-mail already has an account; after checking its password, everything
//   the guest created moves to that account.
// - "claim": the caller is already signed in to a real account (e.g. a Google-only user who just
//   set a password through the reset e-mail) and proves the guest session with its refresh token.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
const accountIdForEmail = async (admin: SupabaseClient, email: string) => {
  const pattern = email.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data } = await admin.from("profiles").select("id").ilike("email", pattern).limit(1);
  return (data?.[0]?.id as string | undefined) ?? null;
};

const moveGuestData = async (admin: SupabaseClient, guestId: string, targetId: string) => {
  // A guest has at most a few fresh drafts, so a manager row for the target account
  // on the same memorial can only be the target's own; drop the guest's duplicate.
  const { data: guestMemorials } = await admin.from("memorials").select("id").eq("owner_id", guestId);
  const memorialIds = (guestMemorials ?? []).map((m: { id: string }) => m.id);
  if (memorialIds.length) {
    const { data: existing } = await admin
      .from("memorial_managers")
      .select("memorial_id")
      .eq("user_id", targetId)
      .in("memorial_id", memorialIds);
    const taken = (existing ?? []).map((r: { memorial_id: string }) => r.memorial_id);
    if (taken.length) {
      await admin.from("memorial_managers").delete().eq("user_id", guestId).in("memorial_id", taken);
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
    const { error } = await admin.from(table).update({ [column]: targetId }).eq(column, guestId);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metoda nije podržana" }, 405);

  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ ok: false, code: "unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false },
    });
    const checker = () => createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: callerData, error: callerError } = await admin.auth.getUser(token);
    const caller = callerData?.user;
    if (callerError || !caller) return json({ ok: false, code: "unauthorized" }, 401);

    const body = await req.json();

    if (body.mode === "claim") {
      if (caller.is_anonymous) return json({ ok: false, code: "unauthorized" }, 401);
      const refreshToken = String(body.guest_refresh_token ?? "");
      if (!refreshToken) return json({ ok: false, code: "invalid" }, 400);
      const { data: refreshed } = await checker().auth.refreshSession({ refresh_token: refreshToken });
      const guestUser = refreshed?.user;
      if (!guestUser || !guestUser.is_anonymous) return json({ ok: false, code: "invalid_guest" });
      await moveGuestData(admin, guestUser.id, caller.id);
      return json({ ok: true });
    }

    const guest = caller;
    if (!guest.is_anonymous) return json({ ok: false, code: "not_guest" }, 400);

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
      if (await accountIdForEmail(admin, email)) return json({ ok: false, code: "already_exists" });
      // The e-mail is confirmed here without a link, so an invited admin's address must never be taken this way:
      // claim_admin_role would hand the admin role to whoever typed it. The flag keeps that true for later invites.
      const { data: invited } = await admin.from("admin_users").select("id").ilike("email", email.replace(/[\\%_]/g, (c) => `\\${c}`)).limit(1);
      if (invited?.length) return json({ ok: false, code: "already_exists" });
      const { error } = await admin.auth.admin.updateUserById(guest.id, {
        email,
        password,
        email_confirm: true,
        app_metadata: { converted_guest: true },
      });
      if (error) {
        if (await accountIdForEmail(admin, email)) return json({ ok: false, code: "already_exists" });
        throw error;
      }
      await admin.from("profiles").update({ email }).eq("id", guest.id);
      return json({ ok: true });
    }

    // "login": the password must match the existing account before anything moves.
    const { data: signIn, error: signInError } = await checker().auth.signInWithPassword({ email, password });
    const target = signIn?.user;
    if (signInError || !target) {
      // An account that only ever signed in with Google has no password yet; tell the form so.
      const accountId = await accountIdForEmail(admin, email);
      if (accountId) {
        const { data: account } = await admin.auth.admin.getUserById(accountId);
        const providers = (account?.user?.identities ?? []).map((i) => i.provider);
        if (providers.length && !providers.includes("email")) return json({ ok: false, code: "google_only" });
      }
      return json({ ok: false, code: "wrong_password" });
    }
    if (target.id === guest.id) return json({ ok: true });

    await moveGuestData(admin, guest.id, target.id);
    return json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[CONVERT-GUEST-ACCOUNT]", message);
    return json({ error: "Račun nije bilo moguće spremiti" }, 500);
  }
});
