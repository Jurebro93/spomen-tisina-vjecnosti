import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PRODUCT_PRICES, recordPromoUsage } from "../_shared/promo.ts";
import { getSettings, processInvoice, upsertInvoiceForSession } from "../_shared/invoices.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  console.log(`[VERIFY-MEMORIAL-PAYMENT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_LIVE_API_KEY") || Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_LIVE_API_KEY or STRIPE_SECRET_KEY is not set");

    const { session_id } = await req.json();
    if (!session_id) throw new Error("Missing session_id");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const session = await stripe.checkout.sessions.retrieve(session_id);
    log("Session retrieved", { status: session.payment_status, metadata: session.metadata });

    const memorialId = session.metadata?.memorial_id;
    if (!memorialId) throw new Error("Sesija ne sadrži memorial_id");

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ paid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { data: current } = await admin
      .from("memorials")
      .select("id, slug, status, paid, promo_code_id")
      .eq("id", memorialId)
      .maybeSingle();

    if (!current) throw new Error("Memorijal nije nađen");

    const amountPaid = (session.amount_total ?? 0) / 100;

    let slug = current.slug;
    const immediate = session.metadata?.immediate_start !== "false";
    const scheduledAt = immediate ? null : new Date(Date.now() + 14 * 86400_000).toISOString();
    if (!current.paid) {
      const paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

      const { data: published, error: updateError } = await admin
        .from("memorials")
        .update({
          paid: true,
          paid_at: new Date().toISOString(),
          stripe_session_id: session.id,
          stripe_payment_intent_id: paymentIntentId,
          status: immediate ? "published" : "draft",
          published_at: immediate ? new Date().toISOString() : null,
          scheduled_publish_at: scheduledAt,
          updated_at: new Date().toISOString(),
          payment_method: "stripe",
          payment_amount: amountPaid,
        })
        .eq("id", memorialId)
        .select("slug")
        .single();

      if (updateError) throw new Error(updateError.message);
      slug = published.slug;

      await admin.from("memorial_audit_log").insert({
        memorial_id: memorialId,
        user_id: session.metadata?.user_id ?? null,
        action: "memorial_paid_and_published",
        entity_type: "stripe_session",
      });
    }

    // Promo code usage is recorded once per memorial (unique index keeps it idempotent).
    const promoCodeId = current.promo_code_id ?? session.metadata?.promo_code_id ?? null;
    if (promoCodeId) {
      try {
        await recordPromoUsage(admin, {
          promoCodeId,
          userId: session.metadata?.user_id ?? null,
          orderId: memorialId,
          productType: "memorial",
          originalPrice: PRODUCT_PRICES.memorial,
          discountAmount: Math.max(PRODUCT_PRICES.memorial - amountPaid, 0),
          finalPrice: amountPaid,
        });
      } catch (promoError) {
        log("Promo usage failed", { message: String(promoError) });
      }
    }

    // Order confirmation (sent once, shared with the webhook, whichever confirms the payment first).
    try {
      const { confirmPaidMemorialOrder } = await import("../_shared/orderConfirmation.ts");
      await confirmPaidMemorialOrder(admin, session, memorialId, PRODUCT_PRICES.memorial);
    } catch (confirmationError) {
      log("Confirmation email failed", { message: String(confirmationError) });
    }

    // Invoice record in the admin list (idempotent, shared with the webhook) + Minimax issuing.
    try {
      const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
      const { invoice } = await upsertInvoiceForSession(admin, {
        sessionId: session.id,
        paymentIntentId: pi,
        customerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
        livemode: session.livemode,
        amountGross: amountPaid,
        currency: session.currency ?? "eur",
        memorialId,
        userId: session.metadata?.user_id ?? null,
        stripeEmail: session.customer_details?.email ?? session.customer_email ?? null,
        productName: session.metadata?.product_name ?? "Digitalni memorijal",
        productDescription: session.metadata?.product_description ?? null,
        paidAt: new Date((session.created ?? Date.now() / 1000) * 1000).toISOString(),
      });
      const invoiceSettings = await getSettings(admin);
      if (invoice.invoice_status !== "issued" && invoiceSettings?.auto_issue !== false) await processInvoice(admin, invoice.id);
    } catch (invoiceRecordError) {
      log("Invoice record failed", { message: String(invoiceRecordError) });
    }

    // Send the PDF invoice + thank-you email (best effort, never blocks the response)
    try {
      const invoiceRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-memorial-invoice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ memorial_id: memorialId }),
      });
      log("Invoice email", { status: invoiceRes.status });
    } catch (invoiceError) {
      log("Invoice email failed", { message: String(invoiceError) });
    }



    return new Response(JSON.stringify({
      paid: true,
      slug,
      memorial_id: memorialId,
      // Real amount paid, used for the Meta Pixel Purchase event on the frontend.
      amount: (session.amount_total ?? 0) / 100,
      currency: (session.currency ?? "eur").toUpperCase(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
