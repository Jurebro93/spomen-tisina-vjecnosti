// Admin-only Minimax/invoice operations: test connection, retry, resend, process pending.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { adminClient, corsHeaders, getSettings, logInvoice, processInvoice, sendInvoiceEmail } from "../_shared/invoices.ts";
import { isMinimaxConfigured, testConnection } from "../_shared/minimax.ts";

const log = (step: string, details?: unknown) =>
  console.log(`[MINIMAX-ADMIN] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Neautorizirano" }, 401);

    const admin = adminClient();
    const { data: userData, error: userError } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !userData.user) return json({ error: "Neautorizirano" }, 401);

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Samo administratori" }, 403);

    const { action, invoice_id } = await req.json();
    const settings = await getSettings(admin);
    const organisationId = settings?.minimax_organisation_id;

    if (action === "status") {
      if (!isMinimaxConfigured(organisationId)) return json({ status: "not_configured" });
      try {
        const result = await testConnection(organisationId);
        const orgRows = Array.isArray((result.orgs as { Rows?: unknown })?.Rows)
          ? (result.orgs as { Rows: Record<string, any>[] }).Rows
          : [];
        return json({
          status: "connected",
          organisation_id: result.organisationId,
          organisations: orgRows.map((o) => ({
            id: o.Organisation?.ID ?? o.OrganisationId ?? o.ID ?? null,
            name: o.Organisation?.Name ?? o.Name ?? null,
          })),
        });
      } catch (error) {
        log("Connection error", { message: String(error) });
        return json({ status: "error", message: String(error).slice(0, 300) });
      }
    }

    if (action === "test_connection") {
      if (!isMinimaxConfigured(organisationId)) {
        return json({ ok: false, status: "not_configured", message: "Minimax credentials nisu postavljeni u Supabase Secrets." });
      }
      try {
        await testConnection(organisationId);
        return json({ ok: true, message: "Minimax connection successful" });
      } catch (error) {
        return json({ ok: false, status: "error", message: String(error).slice(0, 300) });
      }
    }

    if (action === "retry") {
      if (!invoice_id) return json({ error: "Missing invoice_id" }, 400);
      await logInvoice(admin, invoice_id, "retry", "started", `by ${userData.user.email}`);
      const result = await processInvoice(admin, invoice_id);
      return json(result);
    }

    if (action === "resend_email") {
      if (!invoice_id) return json({ error: "Missing invoice_id" }, 400);
      const { data: invoice } = await admin.from("invoices").select("*").eq("id", invoice_id).maybeSingle();
      if (!invoice) return json({ error: "Račun nije nađen" }, 404);
      if (invoice.invoice_status !== "issued") return json({ error: "Račun još nije izdan" }, 400);
      await sendInvoiceEmail(admin, invoice, null, invoice.minimax_invoice_number);
      return json({ ok: true });
    }

    if (action === "process_pending") {
      const { data: pending } = await admin
        .from("invoices")
        .select("id")
        .eq("stripe_livemode", true)
        .in("invoice_status", ["pending", "failed", "manual_required", "processing"])
        .order("created_at", { ascending: true })
        .limit(50);

      let issued = 0;
      let failed = 0;
      for (const row of pending ?? []) {
        const result = await processInvoice(admin, row.id);
        if (result.ok) issued += 1;
        else failed += 1;
      }
      return json({ processed: (pending ?? []).length, issued, failed });
    }

    return json({ error: "Nepoznata akcija" }, 400);
  } catch (error) {
    log("ERROR", { message: String(error) });
    return json({ error: String(error).slice(0, 300) }, 500);
  }
});
