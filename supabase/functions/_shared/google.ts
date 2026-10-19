// Read-only access to Search Console and GA4 through the project's Google service account.
// The key is the base64 JSON in the GOOGLE_SA_KEY_B64 secret and never leaves the server.

const SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/analytics.readonly",
].join(" ");

export const GSC_SITE = "https://osmrtnica.com.hr/";

type ServiceAccount = { client_email: string; private_key: string; token_uri?: string };

const b64url = (data: Uint8Array | string) => {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

function pemToDer(pem: string) {
  const body = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
}

let cached: { token: string; exp: number } | null = null;

export async function googleToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const raw = Deno.env.get("GOOGLE_SA_KEY_B64");
  if (!raw) throw new Error("GOOGLE_SA_KEY_B64 nije postavljen");
  const sa = JSON.parse(atob(raw)) as ServiceAccount;
  const tokenUri = sa.token_uri ?? "https://oauth2.googleapis.com/token";
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify({
    iss: sa.client_email, scope: SCOPES, aud: tokenUri, iat: now, exp: now + 3600,
  }))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8", pemToDer(sa.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${b64url(sig)}` }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error(`Google prijava nije uspjela (${res.status})`);
  cached = { token: data.access_token, exp: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return cached.token;
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await googleToken()}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message ?? `Google API greška (${res.status})`);
  return data;
}

export type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

export async function gscQuery(startDate: string, endDate: string, dimensions: string[], rowLimit = 25000): Promise<GscRow[]> {
  const data = await post(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`,
    { startDate, endDate, dimensions, rowLimit, dataState: "final" },
  );
  return data.rows ?? [];
}

const property = () => Deno.env.get("GA4_PROPERTY_ID") ?? "502879541";

export async function ga4Report(body: Record<string, unknown>) {
  return await post(`https://analyticsdata.googleapis.com/v1beta/properties/${property()}:runReport`, body);
}

export async function ga4Funnel(body: Record<string, unknown>) {
  return await post(`https://analyticsdata.googleapis.com/v1alpha/properties/${property()}:runFunnelReport`, body);
}
