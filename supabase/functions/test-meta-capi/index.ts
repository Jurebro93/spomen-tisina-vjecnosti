// TEMPORARY admin-only test: sends one ViewContent event to Meta Conversions API (test mode).
// The access token is read from a server-side secret and never logged or returned.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, corsHeaders } from "../_shared/invoices.ts";

const PIXEL_ID = "2915138225551446";
const TEST_EVENT_CODE = "TEST67482";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ ok: false, error: "Neautorizirano" }, 401);
    const admin = adminClient();
    const { data: userData, error: userError } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !userData.user) return json({ ok: false, error: "Neautorizirano" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return json({ ok: false, error: "Samo administratori" }, 403);

    const token = Deno.env.get("META_CAPI_ACCESS_TOKEN");
    if (!token) return json({ ok: false, error: "META_CAPI_ACCESS_TOKEN nije postavljen" });

    const body = {
      data: [{
        event_name: "ViewContent",
        event_time: Math.floor(Date.now() / 1000),
        event_id: `test_viewcontent_${crypto.randomUUID()}`,
        action_source: "website",
        event_source_url: "https://osmrtnica.com.hr/digitalni-memorijal/",
        user_data: {
          client_user_agent: req.headers.get("user-agent") ?? "test",
          client_ip_address: (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || undefined,
        },
        custom_data: { content_name: "Test Meta CAPI", content_type: "product" },
      }],
      test_event_code: TEST_EVENT_CODE,
    };

    const res = await fetch(`https://graph.facebook.com/v19.0/${PIXEL_ID}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const result = await res.json().catch(() => ({}));
    console.log(`[TEST-META-CAPI] status ${res.status}`);
    if (!res.ok) {
      return json({ ok: false, error: result?.error?.message ?? `Meta API greška (${res.status})` });
    }
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message ?? e) }, 500);
  }
});
