// Stripe webhook — the single source of truth for successful payments.
// Verifies the signature, activates the memorial, then creates + issues the invoice.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { adminClient, getSettings, logInvoice, processInvoice, upsertInvoiceForSession } from "../_shared/invoices.ts";
import { purchaseEventId, sendPurchaseEvent } from "../_shared/metaCapi.ts";
import { PRODUCT_PRICES, recordPromoUsage } from "../_shared/promo.ts";
import { failureLabelHr, findOrder, recordPaymentEvent, setOrderStatus } from "../_shared/orders.ts";

const log = (step: string, details?: unknown) =>
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");

  const stripeKey = Deno.env.get("STRIPE_LIVE_API_KEY") || Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey) return new Response("STRIPE_LIVE_API_KEY or STRIPE_SECRET_KEY missing", { status: 500 });
  if (!webhookSecret) return new Response("STRIPE_WEBHOOK_SECRET missing", { status: 500 });

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const signature = req.headers.get("stripe-signature");
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature ?? "", webhookSecret);
  } catch (error) {
    log("Signature verification failed", { message: String(error) });
    return new Response("Invalid signature", { status: 400 });
  }

  const admin = adminClient();

  // Webhook delivery log (one row per Stripe event id).
  const { data: prior } = await admin.from("stripe_webhook_log").select("processed_ok").eq("stripe_event_id", event.id).maybeSingle();
  if (!prior) {
    await admin.from("stripe_webhook_log").insert({ stripe_event_id: event.id, event_type: event.type, livemode: event.livemode });
  }

  try {
    try {
      await trackOrder(stripe, admin, event);
    } catch (trackError) {
      log("Order tracking failed", { message: String(trackError) });
      await admin.from("stripe_webhook_log").update({ processed_ok: false, error: `tracking: ${String(trackError)}`.slice(0, 500), processed_at: new Date().toISOString() }).eq("stripe_event_id", event.id);
    }

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid") {
        return new Response(JSON.stringify({ ignored: true }), { status: 200 });
      }

      const memorialId = session.metadata?.memorial_id ?? null;
      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

      // 1) Activate the paid product (never blocked by invoicing).
      if (memorialId) {
        const { data: memorial } = await admin
          .from("memorials")
          .select("id, paid, status, promo_code_id")
          .eq("id", memorialId)
          .maybeSingle();

        // Promo usage (idempotent) — recorded whichever confirmation path runs first.
        const promoCodeId = memorial?.promo_code_id ?? session.metadata?.promo_code_id ?? null;
        if (promoCodeId) {
          const amountPaid = (session.amount_total ?? 0) / 100;
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

        const immediate = session.metadata?.immediate_start !== "false";
        const nowIso = new Date().toISOString();
        const startAt = immediate ? nowIso : new Date(Date.now() + 14 * 86400_000).toISOString();
        if (memorial && !memorial.paid) {
          const { error: updateError } = await admin
            .from("memorials")
            .update({
              paid: true,
              paid_at: nowIso,
              stripe_session_id: session.id,
              stripe_payment_intent_id: paymentIntentId,
              status: immediate ? "published" : "draft",
              published_at: immediate ? nowIso : null,
              scheduled_publish_at: immediate ? null : startAt,
              payment_method: "stripe",
              payment_amount: (session.amount_total ?? 0) / 100,
            })
            .eq("id", memorialId);
          if (!updateError) {
            await admin.from("memorial_audit_log").insert({
              memorial_id: memorialId,
              user_id: session.metadata?.user_id ?? null,
              action: "memorial_paid_and_published",
              entity_type: "stripe_webhook",
            });

            // Meta Conversions API Purchase — only after the payment is paid and the
            // memorial is really marked as paid. Same event_id as the browser pixel.
            try {
              const { data: ord } = await admin.from("memorial_orders").select("id, customer_name, original_amount, discount_amount, promo_code, terms_version, paid_at")
                .eq("stripe_checkout_session_id", session.id).maybeSingle();
              if (ord) {
                await admin.from("memorial_orders").update({ service_start_at: startAt }).eq("id", ord.id);
                const { data: mm } = await admin.from("memorials").select("slug, obituaries:deceased_id(ime, prezime)").eq("id", memorialId).maybeSingle();
                const { sendOrderConfirmation } = await import("../_shared/orderConfirmation.ts");
                await sendOrderConfirmation(admin, {
                  orderId: ord.id, email: session.customer_details?.email ?? session.customer_email ?? "", customerName: ord.customer_name,
                  memorialSlug: mm?.slug ?? null, fullName: mm?.obituaries ? `${(mm.obituaries as any).ime} ${(mm.obituaries as any).prezime}` : "voljenu osobu",
                  originalAmount: Number(ord.original_amount ?? PRODUCT_PRICES.memorial), discountAmount: Number(ord.discount_amount ?? 0),
                  amountPaid: (session.amount_total ?? 0) / 100, promoCode: ord.promo_code, contractAt: nowIso, serviceStartAt: startAt,
                  termsVersion: ord.terms_version ?? session.metadata?.terms_version ?? "—", isFree: false,
                });
              }
            } catch (e) { log("Confirmation email failed", { message: String(e) }); }

            // Marketing (CAPI) only with the buyer's marketing consent.
            if (session.metadata?.marketing_consent === "true") await sendPurchaseEvent({
              eventId: purchaseEventId(session.id),
              eventTime: Math.floor(Date.now() / 1000),
              value: (session.amount_total ?? 0) / 100,
              currency: (session.currency ?? "eur").toUpperCase(),
              contentName: session.metadata?.product_name ?? "Digitalni memorijal",
              contentIds: [memorialId],
              externalId: session.metadata?.user_id ?? null,
            });
          }
        }
      }

      // 2) Invoice record (idempotent) + Minimax issuing.
      const lineDescription = session.metadata?.product_name ?? "Digitalni memorijal";
      const { invoice, created } = await upsertInvoiceForSession(admin, {
        sessionId: session.id,
        paymentIntentId,
        customerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
        livemode: event.livemode,
        amountGross: (session.amount_total ?? 0) / 100,
        currency: session.currency ?? "eur",
        memorialId,
        userId: session.metadata?.user_id ?? null,
        stripeEmail: session.customer_details?.email ?? session.customer_email ?? null,
        productName: lineDescription,
        productDescription: session.metadata?.product_description ?? null,
        paidAt: new Date((session.created ?? Date.now() / 1000) * 1000).toISOString(),
      });

      log("Invoice record", { invoiceId: invoice.id, created });
      const settings = await getSettings(admin);
      if (invoice.invoice_status !== "issued" && settings?.auto_issue !== false) {
        await processInvoice(admin, invoice.id);
      }
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
      if (paymentIntentId) {
        const { data: invoice } = await admin
          .from("invoices")
          .select("id")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .maybeSingle();
        if (invoice) {
          await admin
            .from("invoices")
            .update({
              invoice_status: "refunded",
              stripe_refund_id: charge.refunds?.data?.[0]?.id ?? null,
            })
            .eq("id", invoice.id);
          await logInvoice(admin, invoice.id, "refund_received", "ok", null, paymentIntentId);
        }
      }
    }

    await admin.from("stripe_webhook_log").update({ processed_ok: true, error: null, processed_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id).is("error", null);
    await admin.from("stripe_webhook_log").update({ processed_ok: true, processed_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id).is("processed_ok", null);

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    log("ERROR", { message: String(error) });
    await admin.from("stripe_webhook_log").update({ processed_ok: false, error: String(error).slice(0, 500), processed_at: new Date().toISOString() }).eq("stripe_event_id", event.id);
    // 200 so Stripe does not hammer us; the failure is recorded in invoice_logs.
    await logInvoice(admin, null, "stripe_payment_received", "failed", String(error));
    return new Response(JSON.stringify({ received: true, error: "processing_failed" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }
});

// deno-lint-ignore no-explicit-any
async function orderForPaymentIntent(stripe: Stripe, admin: any, piId: string) {
  let order = await findOrder(admin, { paymentIntentId: piId });
  if (order) return order;
  const sessions = await stripe.checkout.sessions.list({ payment_intent: piId, limit: 1 });
  const s = sessions.data[0];
  if (!s) return null;
  order = await findOrder(admin, { sessionId: s.id });
  if (order && !order.stripe_payment_intent_id) {
    await admin.from("memorial_orders").update({ stripe_payment_intent_id: piId }).eq("id", order.id);
  }
  return order;
}

// deno-lint-ignore no-explicit-any
async function trackOrder(stripe: Stripe, admin: any, event: Stripe.Event) {
  const at = new Date(event.created * 1000).toISOString();
  const base = { stripe_event_id: event.id, livemode: event.livemode, occurred_at: at };
  const t = event.type;

  if (t.startsWith("checkout.session.")) {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.metadata?.type && s.metadata.type !== "memorial") return;
    let order = await findOrder(admin, { sessionId: s.id });
    if (!order && s.metadata?.memorial_id) {
      // Session created before tracking existed — create the order from Stripe data.
      const { data } = await admin.from("memorial_orders").insert({
        memorial_id: s.metadata.memorial_id, user_id: s.metadata.user_id || null,
        customer_email: s.customer_details?.email ?? s.customer_email ?? null, customer_name: s.customer_details?.name ?? null,
        livemode: s.livemode, stripe_checkout_session_id: s.id, original_amount: PRODUCT_PRICES.memorial,
        discount_amount: Math.max(PRODUCT_PRICES.memorial - (s.amount_total ?? 0) / 100, 0),
        promo_code_id: s.metadata.promo_code_id || null, promo_code: s.metadata.promo_code || null,
      }).select("*").single();
      order = data;
    }
    if (!order) return;
    const pi = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? null;
    const amount = (s.amount_total ?? 0) / 100;
    const contact = { customer_email: s.customer_details?.email ?? order.customer_email, customer_name: s.customer_details?.name ?? order.customer_name, stripe_payment_intent_id: pi ?? order.stripe_payment_intent_id };

    if (t === "checkout.session.expired") {
      if (await recordPaymentEvent(admin, { ...base, order_id: order.id, event_type: "checkout_expired", status: "expired" }))
        await setOrderStatus(admin, order, "expired", { expired_at: at });
    } else if (t === "checkout.session.completed" || t === "checkout.session.async_payment_succeeded") {
      if (s.payment_status === "paid") {
        if (await recordPaymentEvent(admin, { ...base, order_id: order.id, event_type: "payment_succeeded", status: "paid", amount })) {
          const patch: Record<string, unknown> = { ...contact, paid_at: order.paid_at ?? at };
          if (!order.paid_at) { patch.amount_paid = amount; patch.attempt_count = (order.attempt_count ?? 0) + 1; }
          if (pi) {
            try {
              const intent = await stripe.paymentIntents.retrieve(pi, { expand: ["latest_charge.balance_transaction"] });
              const charge = intent.latest_charge as Stripe.Charge | null;
              const bt = charge?.balance_transaction as Stripe.BalanceTransaction | null;
              if (charge?.id) patch.stripe_charge_id = charge.id;
              if (bt && typeof bt === "object") patch.stripe_fee = bt.fee / 100;
            } catch (_) { /* fee optional */ }
          }
          await setOrderStatus(admin, order, "paid", patch);
        }
      } else {
        // Async method (e.g. SEPA) — payment still processing.
        if (await recordPaymentEvent(admin, { ...base, order_id: order.id, event_type: "payment_processing", status: "processing", amount }))
          await setOrderStatus(admin, order, "processing", contact);
      }
    } else if (t === "checkout.session.async_payment_failed") {
      if (await recordPaymentEvent(admin, { ...base, order_id: order.id, event_type: "payment_failed", status: "failed", failure_code: "async_payment_failed", failure_message: "Asinkrona naplata nije uspjela" }))
        await setOrderStatus(admin, order, "failed", { failed_attempt_count: (order.failed_attempt_count ?? 0) + 1, attempt_count: (order.attempt_count ?? 0) + 1, last_failure_code: "async_payment_failed", last_failure_message: "Asinkrona naplata nije uspjela" });
    }
    return;
  }

  if (t.startsWith("payment_intent.")) {
    const intent = event.data.object as Stripe.PaymentIntent;
    if (intent.metadata?.type && intent.metadata.type !== "memorial") return;
    const order = await orderForPaymentIntent(stripe, admin, intent.id);
    if (!order) return;
    if (t === "payment_intent.payment_failed") {
      const err = intent.last_payment_error;
      const code = err?.decline_code ?? err?.code ?? null;
      if (await recordPaymentEvent(admin, { ...base, order_id: order.id, event_type: "payment_failed", status: "failed", amount: intent.amount / 100, failure_code: code, failure_message: failureLabelHr(code) }))
        await setOrderStatus(admin, order, "failed", { failed_attempt_count: (order.failed_attempt_count ?? 0) + 1, attempt_count: (order.attempt_count ?? 0) + 1, last_failure_code: code, last_failure_message: failureLabelHr(code) });
    } else if (t === "payment_intent.processing") {
      if (await recordPaymentEvent(admin, { ...base, order_id: order.id, event_type: "payment_processing", status: "processing" }))
        await setOrderStatus(admin, order, "processing");
    } else if (t === "payment_intent.requires_action") {
      if (await recordPaymentEvent(admin, { ...base, order_id: order.id, event_type: "requires_action", status: "requires_action" }))
        await setOrderStatus(admin, order, "requires_action");
    }
    return;
  }

  if (t === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
    if (!pi) return;
    const order = await orderForPaymentIntent(stripe, admin, pi);
    if (!order) return;
    const refunded = charge.amount_refunded / 100;
    const full = charge.refunded || charge.amount_refunded >= charge.amount;
    if (await recordPaymentEvent(admin, { ...base, order_id: order.id, event_type: full ? "refund_full" : "refund_partial", status: full ? "refunded" : "partially_refunded", amount: refunded })) {
      // Use Stripe's cumulative refunded amount so out-of-order delivery can't double count.
      const patch = { amount_refunded: Math.max(Number(order.amount_refunded ?? 0), refunded), refunded_at: at };
      const next = full ? "refunded" : "partially_refunded";
      if (order.status === "disputed") await admin.from("memorial_orders").update(patch).eq("id", order.id);
      else await admin.from("memorial_orders").update({ ...patch, status: next }).eq("id", order.id);
    }
    return;
  }

  if (t === "charge.dispute.created") {
    const dispute = event.data.object as Stripe.Dispute;
    const pi = typeof dispute.payment_intent === "string" ? dispute.payment_intent : null;
    if (!pi) return;
    const order = await orderForPaymentIntent(stripe, admin, pi);
    if (!order) return;
    if (await recordPaymentEvent(admin, { ...base, order_id: order.id, event_type: "dispute_opened", status: "disputed", amount: dispute.amount / 100, failure_code: dispute.reason }))
      await setOrderStatus(admin, order, "disputed", { disputed_at: at });
  }
}
