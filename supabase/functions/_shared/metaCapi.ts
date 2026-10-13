// Meta Conversions API (server-side) helper.
// Only used for confirmed purchases. Never throws — tracking must not break payments.

const GRAPH_VERSION = "v19.0";

const log = (step: string, details?: unknown) =>
  console.log(`[META-CAPI] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/** Stable event id for a Stripe purchase — shared with the browser pixel for de-duplication. */
export const purchaseEventId = (sessionId: string) => `purchase_${sessionId}`;

export type PurchasePayload = {
  eventId: string;
  eventTime: number; // unix seconds
  value: number;
  currency: string;
  contentName: string;
  contentIds: string[];
  eventSourceUrl?: string | null;
  externalId?: string | null;
};

export const sendPurchaseEvent = async (payload: PurchasePayload): Promise<void> => {
  const pixelId = Deno.env.get("META_PIXEL_ID");
  const accessToken = Deno.env.get("META_CAPI_ACCESS_TOKEN");
  if (!pixelId || !accessToken) {
    log("Skipped — META_PIXEL_ID or META_CAPI_ACCESS_TOKEN not configured");
    return;
  }

  const userData: Record<string, unknown> = {};
  if (payload.externalId) userData.external_id = await sha256(payload.externalId);

  const body = {
    data: [
      {
        event_name: "Purchase",
        event_time: payload.eventTime,
        event_id: payload.eventId,
        action_source: "website",
        ...(payload.eventSourceUrl ? { event_source_url: payload.eventSourceUrl } : {}),
        user_data: userData,
        custom_data: {
          value: payload.value,
          currency: payload.currency,
          content_name: payload.contentName,
          content_type: "product",
          content_ids: payload.contentIds,
        },
      },
    ],
    ...(Deno.env.get("META_CAPI_TEST_EVENT_CODE")
      ? { test_event_code: Deno.env.get("META_CAPI_TEST_EVENT_CODE") }
      : {}),
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const text = await res.text();
    log("Sent", { status: res.status, eventId: payload.eventId, response: text.slice(0, 300) });
  } catch (error) {
    log("Failed", { message: String(error) });
  }
};
