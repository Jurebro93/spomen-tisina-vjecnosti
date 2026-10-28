// Open pixel and click redirect for campaign e-mails sent by send-campaign-email.
// GET ?r=<rid>&k=o          -> logs an open, returns a 1x1 transparent GIF
// GET ?r=<rid>&k=c&u=<url>  -> logs a click, redirects to the url (osmrtnica.com.hr only, so it is no open redirect)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE = "https://osmrtnica.com.hr";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GIF = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), (c) => c.charCodeAt(0));

const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });

const safeTarget = (raw: string | null) => {
  try {
    const url = new URL(raw ?? "");
    if (url.protocol === "https:" && (url.hostname === "osmrtnica.com.hr" || url.hostname === "www.osmrtnica.com.hr")) return url.toString();
  } catch {
    // fall through to the homepage
  }
  return SITE;
};

Deno.serve(async (req) => {
  const params = new URL(req.url).searchParams;
  const rid = params.get("r") ?? "";
  const kind = params.get("k") === "c" ? "click" : "open";
  const target = kind === "click" ? safeTarget(params.get("u")) : null;

  if (UUID_RE.test(rid)) {
    // Logging must never block the reader, so errors are ignored.
    await admin().from("email_campaign_events")
      .insert({ rid, kind, url: target, user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300) })
      .then(() => undefined, () => undefined);
  }

  if (target) return new Response(null, { status: 302, headers: { Location: target, "Cache-Control": "no-store" } });
  return new Response(GIF, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, max-age=0" } });
});
