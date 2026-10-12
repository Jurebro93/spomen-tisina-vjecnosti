import { decodeDeep } from "./htmlEntities";

const SUPABASE_HOST = "umpvnepxsqfkxjpclkxc.supabase.co";

/**
 * Installs a global fetch wrapper that decodes HTML entities in JSON payloads
 * returned by the Supabase REST / RPC / Edge Function endpoints.
 *
 * This keeps the database untouched while guaranteeing that no raw entity
 * (&#8211;, &amp;, &quot;, &nbsp; …) ever reaches the UI, regardless of which
 * component fetched the data.
 */
export function installEntityDecoding() {
  const w = window as typeof window & { __entityDecodingInstalled?: boolean };
  if (w.__entityDecodingInstalled) return;
  w.__entityDecodingInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input as RequestInfo, init);

    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : (input as Request)?.url ?? "";

      if (!url.includes(SUPABASE_HOST)) return response;

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) return response;
      if (!response.ok) return response;

      const clone = response.clone();
      const text = await clone.text();
      if (!text || text.indexOf("&") === -1) return response;

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return response;
      }

      const decoded = JSON.stringify(decodeDeep(parsed));
      if (decoded === text) return response;

      const headers = new Headers(response.headers);
      headers.delete("content-length");
      headers.delete("content-encoding");

      return new Response(decoded, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch {
      return response;
    }
  };
}
