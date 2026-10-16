// Meta Conversions API (server-side) helpers shared by every edge function that reports events.
// Buyer / account data only — never the deceased person's data. Never throws.

export const META_PIXEL_ID = "2915138225551446";
export const GRAPH_VERSION = "v23.0";
/** Only the production site reports marketing events, so previews and tests never pollute ad data. */
export const PRODUCTION_ORIGINS = ["https://osmrtnica.com.hr", "https://www.osmrtnica.com.hr"];

const log = (step: string, details?: unknown) =>
  console.log(`[META-CAPI] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

export const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

/** Browser identifiers that let Meta match a server event to the ad click (sent only with marketing consent). */
export type BrowserIds = { fbp?: string | null; fbc?: string | null };

const FBP = /^fb\.\d\.\d{10,13}\.\d{1,20}$/;
const FBC = /^fb\.\d\.\d{10,13}\.[A-Za-z0-9_-]{1,400}$/;

/** Keeps only well-formed _fbp / _fbc values from untrusted input. */
export const cleanBrowserIds = (raw: unknown): BrowserIds => {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const fbp = typeof r.fbp === "string" && FBP.test(r.fbp) ? r.fbp : null;
  const fbc = typeof r.fbc === "string" && FBC.test(r.fbc) ? r.fbc : null;
  return { fbp, fbc };
};

/** Event ids are generated in the browser and shared with the pixel for de-duplication. */
export const cleanEventId = (raw: unknown, prefix: string): string | null =>
  typeof raw === "string" && raw.startsWith(prefix) && /^[A-Za-z0-9_-]{1,200}$/.test(raw) ? raw : null;

export const clientFromRequest = (req: Request) => ({
  ip: (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null,
  userAgent: req.headers.get("user-agent") || null,
});

export type Person = {
  email?: string | null;
  fullName?: string | null;
  phone?: string | null;
  externalId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
} & BrowserIds;

/** Builds Meta user_data: personal fields hashed, network/browser identifiers as is. */
export const buildUserData = async (p: Person) => {
  const u: Record<string, unknown> = {};
  if (p.email) u.em = [await sha256(p.email)];
  const parts = (p.fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length) u.fn = [await sha256(parts[0])];
  if (parts.length > 1) u.ln = [await sha256(parts.slice(1).join(" "))];
  const phone = (p.phone ?? "").replace(/\D/g, "");
  if (phone) u.ph = [await sha256(phone)];
  if (p.externalId) u.external_id = [await sha256(p.externalId)];
  if (p.ip) u.client_ip_address = p.ip;
  if (p.userAgent) u.client_user_agent = p.userAgent;
  if (p.fbp) u.fbp = p.fbp;
  if (p.fbc) u.fbc = p.fbc;
  return u;
};

export type MetaEvent = {
  eventName: string;
  eventId: string;
  eventTime?: number; // unix seconds, defaults to now
  sourceUrl?: string | null;
  userData: Record<string, unknown>;
  customData?: Record<string, unknown>;
};

/** Meta success = HTTP 200 and events_received >= 1. */
export const isMetaSuccess = (status: number, body: unknown) =>
  status === 200 && Number((body as { events_received?: number } | null)?.events_received ?? 0) >= 1;

/** Sends one event. Returns the outcome instead of throwing. */
export const sendMetaEvent = async (
  e: MetaEvent,
  fetchFn: typeof fetch = fetch,
): Promise<{ ok: boolean; status: number | null; body: unknown; error?: string }> => {
  const token = Deno.env.get("META_CAPI_ACCESS_TOKEN");
  if (!token) {
    log("Skipped — META_CAPI_ACCESS_TOKEN not configured", { event: e.eventName });
    return { ok: false, status: null, body: null, error: "META_CAPI_ACCESS_TOKEN missing" };
  }
  const testCode = Deno.env.get("META_CAPI_TEST_EVENT_CODE");
  const payload = {
    data: [{
      event_name: e.eventName,
      event_time: e.eventTime ?? Math.floor(Date.now() / 1000),
      event_id: e.eventId,
      action_source: "website",
      ...(e.sourceUrl ? { event_source_url: e.sourceUrl } : {}),
      user_data: e.userData,
      custom_data: e.customData ?? {},
    }],
    ...(testCode ? { test_event_code: testCode } : {}),
  };
  try {
    const res = await fetchFn(`https://graph.facebook.com/${GRAPH_VERSION}/${META_PIXEL_ID}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let body: unknown = text;
    try { body = JSON.parse(text); } catch { /* raw */ }
    const ok = isMetaSuccess(res.status, body);
    log("Sent", { event: e.eventName, eventId: e.eventId, status: res.status, ok });
    return { ok, status: res.status, body, error: ok ? undefined : text.slice(0, 500) };
  } catch (error) {
    log("Failed", { event: e.eventName, message: String(error) });
    return { ok: false, status: null, body: null, error: `network: ${String(error)}`.slice(0, 500) };
  }
};
