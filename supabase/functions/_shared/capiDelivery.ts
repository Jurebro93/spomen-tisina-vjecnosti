// Reliable, deduplicated Meta CAPI Purchase delivery (one row per Stripe Checkout Session).
// Never throws: tracking must not interrupt payments, activation or invoicing.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type Stripe from "https://esm.sh/stripe@14.21.0";

const PIXEL_ID = "2915138225551446";
const GRAPH = "v19.0";
export const MAX_ATTEMPTS = 6; // 1 first try + 5 retries
const RETRY_DELAYS_MIN = [1, 5, 30, 120, 720];

/** Users for whom the new delivery pipeline is active. Remove the check to enable for everyone. */
const ROLLOUT_USER_IDS = new Set(["7130af4e-7633-4381-8503-429850f6d1cc"]);
export const usesReliableCapi = (userId: string | null | undefined) => !!userId && ROLLOUT_USER_IDS.has(userId);

export const purchaseEventId = (sessionId: string) => `purchase_${sessionId}`;

/** Delay before retry number `attempts` (attempts already made). Null = give up. */
export const nextRetryDelayMinutes = (attempts: number): number | null =>
  attempts >= MAX_ATTEMPTS ? null : RETRY_DELAYS_MIN[Math.max(0, attempts - 1)] ?? null;

/** Meta success = HTTP 200 and events_received >= 1. */
export const isMetaSuccess = (status: number, body: unknown) =>
  status === 200 && Number((body as { events_received?: number } | null)?.events_received ?? 0) >= 1;

const log = (s: string, d?: unknown) => console.log(`[CAPI-DELIVERY] ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);

const sha256 = async (v: string) => {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v.trim().toLowerCase()));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

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

    const token = Deno.env.get("META_CAPI_ACCESS_TOKEN");
    if (!token) return await finish("failed", null, null, "META_CAPI_ACCESS_TOKEN missing");
    if (!row.client_user_agent) return await finish("failed", null, null, "waiting_for_client_user_agent");

    // Buyer data from Stripe only — never the deceased person's data.
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid" || session.metadata?.marketing_consent !== "true") {
      return await finish("failed", null, null, "not_paid_or_no_consent");
    }
    const cd = session.customer_details;
    const parts = (cd?.name ?? "").trim().split(/\s+/).filter(Boolean);
    const user_data: Record<string, unknown> = { client_user_agent: row.client_user_agent };
    if (row.client_ip) user_data.client_ip_address = row.client_ip;
    const email = cd?.email ?? session.customer_email;
    if (email) user_data.em = [await sha256(email)];
    if (parts.length) user_data.fn = [await sha256(parts[0])];
    if (parts.length > 1) user_data.ln = [await sha256(parts.slice(1).join(" "))];
    const phone = (cd?.phone ?? "").replace(/\D/g, "");
    if (phone) user_data.ph = [await sha256(phone)];
    if (row.user_id) user_data.external_id = [await sha256(row.user_id)];

    const body = {
      data: [{
        event_name: "Purchase",
        event_time: Number(row.event_time),
        event_id: row.event_id,
        action_source: "website",
        event_source_url: "https://osmrtnica.com.hr/zahvaljujemo",
        user_data,
        custom_data: { value: Number(row.value), currency: row.currency, content_ids: row.memorial_id ? [row.memorial_id] : [], content_type: "product" },
      }],
    };
    let res: Response;
    try {
      res = await fetchFn(`https://graph.facebook.com/${GRAPH}/${PIXEL_ID}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
    } catch (e) {
      return await finish("failed", null, null, `network: ${String(e)}`.slice(0, 500));
    }
    const text = await res.text();
    let parsed: unknown = text;
    try { parsed = JSON.parse(text); } catch { /* raw */ }
    const ok = isMetaSuccess(res.status, parsed);
    log("sent", { eventId: row.event_id, status: res.status, ok });
    return await finish(ok ? "sent" : "failed", res.status, parsed, ok ? null : text.slice(0, 500));
  } catch (e) {
    log("unexpected", { message: String(e) });
    return { status: "error" };
  }
};
