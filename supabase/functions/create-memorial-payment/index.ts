import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PRODUCT_PRICES, recordPromoUsage, validatePromoCode } from "../_shared/promo.ts";
import { cleanAttribution } from "../_shared/orders.ts";
import { buildUserData, cleanBrowserIds, cleanEventId, clientFromRequest, PRODUCTION_ORIGINS, sendMetaEvent } from "../_shared/metaCapi.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  console.log(`[CREATE-MEMORIAL-PAYMENT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_LIVE_API_KEY") || Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_LIVE_API_KEY or STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) throw new Error("Missing Authorization header");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: userData, error: userError } = await admin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !userData.user) throw new Error("Neautorizirani korisnik");
    const user = userData.user;

    const { memorial_id, promo_code, attribution, terms_accepted, terms_version, immediate_start, marketing_consent, meta } = await req.json();
    if (terms_accepted !== true || typeof terms_version !== "string" || !terms_version) {
      throw new Error("Za nastavak prihvatite Uvjete korištenja i kupnje.");
    }
    const immediate = immediate_start === true;
    const acceptedAt = new Date().toISOString();
    const consentFields = { terms_version: terms_version.slice(0, 100), terms_accepted_at: acceptedAt, immediate_start_requested: immediate };
    const attr = cleanAttribution(attribution);
    const livemode = stripeKey.startsWith("sk_live") || stripeKey.startsWith("rk_live");
    const customerName = [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(" ")
      || user.user_metadata?.full_name || null;
    const orderBase = {
      memorial_id, user_id: user.id, customer_email: user.email ?? null, customer_name: customerName,
      livemode, currency: "eur",
      first_source: attr.first_source, first_medium: attr.first_medium, first_campaign: attr.first_campaign,
      checkout_source: attr.source, checkout_medium: attr.medium, checkout_campaign: attr.campaign, device: attr.device,
      blog_slug: attr.blog_slug ?? null, blog_cta: attr.blog_cta ?? null, blog_touched_at: attr.blog_touched_at ?? null,
      ...consentFields,
    };
    if (!memorial_id) throw new Error("Missing memorial_id");

    const { data: memorial, error: memorialError } = await admin
      .from("memorials")
      .select("id, owner_id, status, slug, deceased_id, paid")
      .eq("id", memorial_id)
      .maybeSingle();

    if (memorialError) throw new Error(memorialError.message);
    if (!memorial) throw new Error("Memorijal nije nađen");
    if (memorial.owner_id !== user.id) throw new Error("Nemate pravo na ovaj memorijal");

    if (memorial.paid) {
      log("Already paid", { memorialId: memorial.id });
      return new Response(JSON.stringify({ already_paid: true, slug: memorial.slug }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { data: deceased } = await admin
      .from("obituaries")
      .select("ime, prezime")
      .eq("id", memorial.deceased_id)
      .maybeSingle();

    const fullName = deceased ? `${deceased.ime} ${deceased.prezime}` : "voljenu osobu";
    const origin = req.headers.get("origin") ?? "https://osmrtnica.com.hr";

    // The server alone decides the amount: it re-validates the promo code and recomputes the price.
    const originalPrice = PRODUCT_PRICES.memorial;
    let finalPrice = originalPrice;
    let discountAmount = 0;
    let promoId: string | null = null;
    let promoCodeLabel: string | null = null;

    if (promo_code) {
      const promoResult = await validatePromoCode(admin, String(promo_code), "memorial", user.id);
      if (!promoResult.ok) {
        return new Response(JSON.stringify({ error: promoResult.message, promo_error: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      finalPrice = promoResult.finalPrice;
      discountAmount = promoResult.discountAmount;
      promoId = promoResult.promo.id;
      promoCodeLabel = promoResult.promo.code;
    }

    // Free promo code — no Stripe session, the memorial is activated through the same publish logic.
    if (finalPrice <= 0) {
      const now = new Date().toISOString();
      const startAt = immediate ? now : new Date(Date.now() + 14 * 86400_000).toISOString();
      const { data: published, error: publishError } = await admin
        .from("memorials")
        .update({
          paid: true,
          paid_at: now,
          status: immediate ? "published" : "draft",
          published_at: immediate ? now : null,
          scheduled_publish_at: immediate ? null : startAt,
          updated_at: now,
          payment_method: "promo_code",
          payment_amount: 0,
          promo_code_id: promoId,
          promo_code: promoCodeLabel,
        })
        .eq("id", memorial.id)
        .select("slug")
        .single();
      if (publishError) throw new Error(publishError.message);

      if (promoId) {
        await recordPromoUsage(admin, {
          promoCodeId: promoId,
          userId: user.id,
          orderId: memorial.id,
          productType: "memorial",
          originalPrice,
          discountAmount,
          finalPrice: 0,
        });
      }

      await admin.from("memorial_audit_log").insert({
        memorial_id: memorial.id,
        user_id: user.id,
        action: "memorial_published_with_promo_code",
        entity_type: "promo_code",
      });

      try {
        const { data: order } = await admin.from("memorial_orders").insert({
          ...orderBase, status: "free", is_free: true, original_amount: originalPrice,
          discount_amount: discountAmount, amount_paid: 0, promo_code_id: promoId, promo_code: promoCodeLabel, paid_at: now,
          service_start_at: startAt,
        }).select("id, created_at").single();
        if (order) {
          try {
            const { sendOrderConfirmation } = await import("../_shared/orderConfirmation.ts");
            await sendOrderConfirmation(admin, { orderId: order.id, email: user.email ?? "", customerName, memorialSlug: published.slug, fullName, originalAmount: originalPrice, discountAmount, amountPaid: 0, promoCode: promoCodeLabel, contractAt: now, serviceStartAt: startAt, termsVersion: consentFields.terms_version, isFree: true });
          } catch (e) { log("Confirmation email failed", { message: String(e) }); }
        }
        if (order) await admin.from("payment_events").insert({ order_id: order.id, event_type: "free_activation", status: "free", amount: 0, livemode });
        try {
          const { upsertFreeInvoice } = await import("../_shared/invoices.ts");
          await upsertFreeInvoice(admin, { orderId: order?.id ?? null, memorialId: memorial.id, userId: user.id, email: user.email ?? null, name: customerName ?? null, promoCode: promoCodeLabel, livemode, paidAt: now });
        } catch (e) { log("Free invoice record failed", { message: String(e) }); }
      } catch (e) { log("Order tracking failed", { message: String(e) }); }

      log("Published with free promo code", { memorialId: memorial.id, promoCodeLabel });

      return new Response(
        JSON.stringify({
          free: true,
          slug: published.slug,
          memorial_id: memorial.id,
          promo_code: promoCodeLabel,
          amount: 0,
          currency: "EUR",
          scheduled_publish_at: immediate ? null : startAt,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Meta browser identifiers travel with the checkout (only with marketing consent, production only),
    // so the Purchase can be matched to the ad click even if the buyer never returns to the thank-you page.
    const metaAllowed = marketing_consent === true && PRODUCTION_ORIGINS.includes(origin);
    const browserIds = metaAllowed ? cleanBrowserIds(meta) : {};
    const client = clientFromRequest(req);
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Digitalni memorijal",
              description: `Trajni digitalni memorijal za ${fullName}`,
            },
            unit_amount: Math.round(finalPrice * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/zahvaljujemo?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/digitalni-memorijal/kreiraj?memorial=${memorial.id}&otkazano=1`,
      metadata: {
        memorial_id: memorial.id,
        user_id: user.id,
        type: "memorial",
        product_name: "Digitalni memorijal",
        product_description: `Trajni digitalni memorijal za ${fullName}`,
        promo_code_id: promoId ?? "",
        promo_code: promoCodeLabel ?? "",
        immediate_start: immediate ? "true" : "false",
        terms_version: consentFields.terms_version,
        marketing_consent: marketing_consent === true ? "true" : "false",
        ...(metaAllowed ? {
          meta_fbp: browserIds.fbp ?? "",
          meta_fbc: browserIds.fbc ?? "",
          meta_ua: (client.userAgent ?? "").slice(0, 500),
        } : {}),
      },
    });

    log("Session created", { sessionId: session.id, memorialId: memorial.id, finalPrice });

    // Meta CAPI InitiateCheckout, same event_id as the browser pixel. Never blocks the checkout.
    const checkoutEventId = metaAllowed ? cleanEventId(meta?.event_id, "ic_") : null;
    if (checkoutEventId) {
      await sendMetaEvent({
        eventName: "InitiateCheckout",
        eventId: checkoutEventId,
        sourceUrl: typeof meta?.source_url === "string" && meta.source_url.startsWith(origin) ? meta.source_url.slice(0, 1000) : null,
        userData: await buildUserData({ email: user.email, fullName: customerName, externalId: user.id, ...client, ...browserIds }),
        customData: { value: finalPrice, currency: "EUR", content_name: "Digitalni memorijal", content_type: "product", content_ids: [memorial.id] },
      });
    }

    try {
      const { data: order } = await admin.from("memorial_orders").insert({
        ...orderBase, status: "checkout_open", original_amount: originalPrice, discount_amount: discountAmount,
        promo_code_id: promoId, promo_code: promoCodeLabel, livemode: session.livemode,
        stripe_checkout_session_id: session.id,
        checkout_expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      }).select("id").single();
      if (order) await admin.from("payment_events").insert({ order_id: order.id, event_type: "checkout_created", status: "checkout_open", amount: finalPrice, livemode: session.livemode });
    } catch (e) { log("Order tracking failed", { message: String(e) }); }

    await admin
      .from("memorials")
      .update({
        stripe_session_id: session.id,
        payment_method: "stripe",
        promo_code_id: promoId,
        promo_code: promoCodeLabel,
      })
      .eq("id", memorial.id);

    return new Response(JSON.stringify({ url: session.url }), {
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
