// Preview-only: mirrors browser ViewContent to Meta Conversions API.
// Accepts requests only from https://spomen-tisina-vjecnosti.lovable.app.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const PIXEL_ID = "2915138225551446";
const ALLOWED_ORIGIN = "https://spomen-tisina-vjecnosti.lovable.app";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.headers.get("origin") !== ALLOWED_ORIGIN) return json({ ok: false, error: "forbidden" }, 403);
  const token = Deno.env.get("META_CAPI_ACCESS_TOKEN");
  if (!token) return json({ ok: false, error: "token missing" }, 500);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ ok: false, error: "bad json" }, 400); }
  const eventId = typeof b.event_id === "string" ? b.event_id.slice(0, 100) : "";
  if (!eventId) return json({ ok: false, error: "event_id required" }, 400);
  const p = (b.params ?? {}) as Record<string, unknown>;
  const custom: Record<string, unknown> = {};
  if (typeof p.value === "number") custom.value = p.value;
  if (typeof p.currency === "string") custom.currency = p.currency.slice(0, 3);
  if (Array.isArray(p.content_ids)) custom.content_ids = p.content_ids.filter((x) => typeof x === "string").slice(0, 20);
  const url = typeof b.url === "string" && b.url.startsWith(ALLOWED_ORIGIN) ? b.url.slice(0, 500) : ALLOWED_ORIGIN;

  const res = await fetch(`https://graph.facebook.com/v19.0/${PIXEL_ID}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      data: [{
        event_name: "ViewContent",
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: url,
        user_data: {
          client_user_agent: req.headers.get("user-agent") ?? undefined,
          client_ip_address: (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || undefined,
        },
        custom_data: custom,
      }],
    }),
  });
  console.log(`[META-CAPI-VC] status ${res.status}`);
  return json({ ok: res.ok }, res.ok ? 200 : 502);
});
