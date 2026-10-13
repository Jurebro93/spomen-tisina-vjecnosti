// Minimax (moj.minimax.hr) API client.
// Docs: https://moj.minimax.hr/HR/API  — OAuth2 password grant + REST API under /HR/API/api/...
// No credentials are hardcoded; everything comes from Supabase Secrets.

export interface MinimaxConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  organisationId: string;
  apiBaseUrl: string; // e.g. https://moj.minimax.hr/HR/API
  authBaseUrl: string; // e.g. https://moj.minimax.hr/AUT/OAuth20/Token
  scope: string;
}

export class MinimaxNotConfigured extends Error {
  constructor() {
    super("Minimax integration not configured");
  }
}

export class MinimaxError extends Error {
  status: number;
  retryable: boolean;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
    this.retryable = status === 0 || status === 429 || (status >= 500 && status <= 599);
  }
}

/** Reads Minimax config from secrets. Throws MinimaxNotConfigured when incomplete. */
export const getMinimaxConfig = (organisationOverride?: string | null): MinimaxConfig => {
  const clientId = (Deno.env.get("MINIMAX_CLIENT_ID") ?? "").trim();
  const clientSecret = (Deno.env.get("MINIMAX_CLIENT_SECRET") ?? "").trim();
  const username = (Deno.env.get("MINIMAX_USERNAME") ?? "").trim();
  const password = (Deno.env.get("MINIMAX_PASSWORD") ?? "").trim();
  const organisationId = (organisationOverride || Deno.env.get("MINIMAX_ORGANIZATION_ID") || "").trim();
  const apiBaseUrl = (Deno.env.get("MINIMAX_API_BASE_URL") || "https://moj.minimax.hr/HR/API").replace(/\/+$/, "");
  const authBaseUrl = Deno.env.get("MINIMAX_AUTH_URL") || "https://moj.minimax.hr/HR/AUT/OAuth20/Token";
  const scope = Deno.env.get("MINIMAX_SCOPE") || "minimax.hr";

  if (!clientId || !clientSecret || !username || !password || !organisationId) {
    throw new MinimaxNotConfigured();
  }
  return { clientId, clientSecret, username, password, organisationId, apiBaseUrl, authBaseUrl, scope };
};

export const isMinimaxConfigured = (organisationOverride?: string | null) => {
  try {
    getMinimaxConfig(organisationOverride);
    return true;
  } catch {
    return false;
  }
};

interface CachedToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}
// In-memory token cache per isolate; refreshed automatically on expiry.
let tokenCache: CachedToken | null = null;

const requestToken = async (cfg: MinimaxConfig, body: Record<string, string>) => {
  const res = await fetch(cfg.authBaseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    // Never echo credentials back to the caller/logs.
    let reason = "";
    try { const j = JSON.parse(text); reason = j.error_description || j.error || ""; } catch { /* ignore */ }
    throw new MinimaxError(`Minimax authentication failed (HTTP ${res.status})${reason ? `: ${reason}` : ""}`, res.status);
  }
  const json = JSON.parse(text);
  tokenCache = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + (Number(json.expires_in ?? 3600) - 60) * 1000,
  };
  return tokenCache;
};

export const getAccessToken = async (cfg: MinimaxConfig) => {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.accessToken;
  if (tokenCache?.refreshToken) {
    try {
      const refreshed = await requestToken(cfg, {
        grant_type: "refresh_token",
        refresh_token: tokenCache.refreshToken,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
      });
      return refreshed.accessToken;
    } catch {
      tokenCache = null;
    }
  }
  const fresh = await requestToken(cfg, {
    grant_type: "password",
    username: cfg.username,
    password: cfg.password,
    scope: cfg.scope,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });
  return fresh.accessToken;
};

export interface MinimaxResponse {
  data: unknown;
  location: string | null;
}

/** Low-level call. Create endpoints often return the new id only in the Location header. */
export const minimaxRequest = async (
  cfg: MinimaxConfig,
  path: string,
  init: { method?: string; body?: unknown; accept?: string } = {}
): Promise<MinimaxResponse> => {
  const token = await getAccessToken(cfg);
  const url = `${cfg.apiBaseUrl}/${path.replace(/^\/+/, "")}`;
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: init.accept ?? "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 600);
    throw new MinimaxError(`Minimax ${init.method ?? "GET"} ${path} → HTTP ${res.status}: ${detail}`, res.status);
  }
  const location = res.headers.get("Location");
  if (!(init.accept ?? "application/json").includes("json")) {
    return { data: res, location };
  }
  const text = await res.text();
  return { data: text ? JSON.parse(text) : null, location };
};

export const minimaxFetch = async (
  cfg: MinimaxConfig,
  path: string,
  init: { method?: string; body?: unknown; accept?: string } = {}
) => (await minimaxRequest(cfg, path, init)).data;

/** Verifies credentials by reading the current user profile + organisations. */
export const testConnection = async (organisationOverride?: string | null) => {
  const cfg = getMinimaxConfig(organisationOverride);
  const profile = await minimaxFetch(cfg, "api/currentuser/profile");
  const orgs = await minimaxFetch(cfg, "api/currentuser/orgs?CurrentPage=1&PageSize=100");
  return { profile, orgs, organisationId: cfg.organisationId };
};
