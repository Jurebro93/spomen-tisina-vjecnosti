// Reliable, deduplicated Meta CAPI Purchase delivery (one row per Stripe Checkout Session).
// Used for every paid memorial. Never throws: tracking must not interrupt payments, activation or invoicing.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type Stripe from "https://esm.sh/stripe@14.21.0";
import { buildUserData, cleanBrowserIds, isMetaSuccess, sendMetaEvent } from "./metaCapi.ts";

export { isMetaSuccess };
export const MAX_ATTEMPTS = 6; // 1 first try + 5 retries
const RETRY_DELAYS_MIN = [1, 5, 30, 120, 720];

export const purchaseEventId = (sessionId: string) => `purchase_${sessionId}`;

/** Delay before retry number `attempts` (attempts already made). Null = give up. */
export const nextRetryDelayMinutes = (attempts: number): number | null =>
  attempts >= MAX_ATTEMPTS ? null : RETRY_DELAYS_MIN[Math.max(0, attempts - 1)] ?? null;

const log = (s: string, d?: unknown) => console.log(`[CAPI-DELIVERY] ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);

/** Creates the delivery row once (idempotent). Consent decides pending vs skipped_no_consent. */
export const ensureDelivery = async (
  admin: SupabaseClient,
  session: Stripe.Checkout.Session,
  client?: { ip?: string | null; userAgent?: string | null },
) => {
  const consent = session.metadata?.marketing_consent === "true";
  const row = {
    stripe_session_id: session.id,
    event_id: purchaseEventId(session.id),
    memorial_id: session.metadata?.memorial_id ?? null,
    user_id: session.metadata?.user_id ?? null,
    status: consent ? "pending" : "skipped_no_consent",
    event_time: session.created ?? Math.floor(Date.now() / 1000),
    value: (session.amount_total ?? 0) / 100,
    currency: (session.currency ?? "eur").toUpperCase(),
    client_ip: consent ? client?.ip ?? null : null,
    client_user_agent: consent ? client?.userAgent ?? null : null,
  };
  const { error } = await admin.from("meta_capi_deliveries").upsert(row, { onConflict: "stripe_session_id", ignoreDuplicates: true });
  if (error) log("ensure failed", { message: error.message });
  // Fill missing browser identifiers later (only with consent, only while not final).
  if (consent && (client?.ip || client?.userAgent)) {
    await admin.from("meta_capi_deliveries")
      .update({ client_ip: client?.ip ?? null, client_user_agent: client?.userAgent ?? null })
      .eq("stripe_session_id", session.id).in("status", ["pending", "failed", "processing"]).is("client_user_agent", null);
  }
};

type FetchFn = typeof fetch;

/** Claims and sends one delivery. Safe to call concurrently and repeatedly. */
export const deliverPurchase = async (
  admin: SupabaseClient,
  stripe: Stripe,
  sessionId: string,
  fetchFn: FetchFn = fetch,
): Promise<{ status: string; meta_status?: number; meta_body?: unknown }> => {
  try {
    const { data: claimed, error } = await admin.rpc("claim_capi_delivery", { _session_id: sessionId });
    if (error) { log("claim failed", { message: error.message }); return { status: "claim_error" }; }
    const row = (claimed as Array<Record<string, any>> | null)?.[0];
    if (!row) return { status: "not_claimed" };

    const finish = async (status: "sent" | "failed", metaStatus: number | null, metaBody: unknown, err: string | null) => {
      const delay = status === "failed" ? nextRetryDelayMinutes(row.attempts) : null;
      await admin.rpc("finish_capi_delivery", {
        _id: row.id, _token: row.claim_token, _status: status, _meta_status: metaStatus,
        _meta_body: metaBody ?? null, _error: err,
        _next_attempt_at: delay != null ? new Date(Date.now() + delay * 60_000).toISOString() : null,
      });
      return { status, meta_status: metaStatus ?? undefined, meta_body: metaBody };
    };

    // Buyer data from Stripe only — never the deceased person's data.
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid" || session.metadata?.marketing_consent !== "true") {
      return await finish("failed", null, null, "not_paid_or_no_consent");
    }
    // The thank-you page records the buyer's browser; the checkout stored a fallback in case they never return.
    const userAgent = row.client_user_agent ?? session.metadata?.meta_ua ?? null;
    if (!userAgent) return await finish("failed", null, null, "waiting_for_client_user_agent");
    const cd = session.customer_details;
    const user_data = await buildUserData({
      email: cd?.email ?? session.customer_email,
      fullName: cd?.name,
      phone: cd?.phone,
      externalId: row.user_id,
      ip: row.client_ip,
      userAgent,
      ...cleanBrowserIds({ fbp: session.metadata?.meta_fbp, fbc: session.metadata?.meta_fbc }),
    });

    const r = await sendMetaEvent({
      eventName: "Purchase",
      eventTime: Number(row.event_time),
      eventId: row.event_id,
      sourceUrl: "https://osmrtnica.com.hr/zahvaljujemo",
      userData: user_data,
      customData: {
        value: Number(row.value), currency: row.currency, content_name: "Digitalni memorijal",
        content_ids: row.memorial_id ? [row.memorial_id] : [], content_type: "product",
      },
    }, fetchFn);
    return await finish(r.ok ? "sent" : "failed", r.status, r.body, r.ok ? null : r.error ?? "meta_error");
  } catch (e) {
    log("unexpected", { message: String(e) });
    return { status: "error" };
  }
};
