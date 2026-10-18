// Mirrors memorial-creation events to Meta Conversions API: StartMemorial = person chosen and form opened,
// Lead = memorial draft created.
// Signed-in owner only, production site only, and only with the visitor's marketing consent.
// Payment events are not accepted here: InitiateCheckout is sent by create-memorial-payment
// and Purchase by the Stripe-verified delivery pipeline.
import { adminClient, corsHeaders } from "../_shared/invoices.ts";
import { buildUserData, cleanBrowserIds, cleanEventId, clientFromRequest, PRODUCTION_ORIGINS, sendMetaEvent } from "../_shared/metaCapi.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const origin = req.headers.get("origin") ?? "";
  if (!PRODUCTION_ORIGINS.includes(origin)) return json({ ok: false, error: "forbidden" }, 403);

  const admin = adminClient();
  const { data: userData } = await admin.auth.getUser((req.headers.get("Authorization") ?? "").replace("Bearer ", ""));
  const user = userData?.user;
  if (!user) return json({ ok: false, error: "unauthorized" }, 401);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ ok: false, error: "bad json" }, 400); }
  if (b.marketing_consent !== true) return json({ ok: true, skipped: "no_consent" });
  const fullName = [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(" ")
    || user.user_metadata?.full_name || null;
  const sourceUrl = typeof b.source_url === "string" && b.source_url.startsWith(origin) ? b.source_url.slice(0, 1000) : null;
  const metaUser = async () =>
    buildUserData({ email: user.email, fullName, externalId: user.id, ...clientFromRequest(req), ...cleanBrowserIds(b) });

  if (b.event_name === "StartMemorial") {
    const startId = cleanEventId(b.event_id, "start_");
    if (startId !== `start_${user.id}`) return json({ ok: false, error: "bad event" }, 400);
    const r = await sendMetaEvent({
      eventName: "StartMemorial",
      eventId: startId,
      sourceUrl,
      userData: await metaUser(),
      customData: { content_name: "Digitalni memorijal" },
    });
    return json({ ok: r.ok, meta_status: r.status });
  }

  if (b.event_name !== "Lead") return json({ ok: false, error: "unsupported event" }, 400);
  const memorialId = typeof b.memorial_id === "string" ? b.memorial_id : "";
  const eventId = cleanEventId(b.event_id, "lead_");
  if (!memorialId || eventId !== `lead_${memorialId}`) return json({ ok: false, error: "bad event" }, 400);

  const { data: memorial } = await admin.from("memorials").select("id, owner_id").eq("id", memorialId).maybeSingle();
  if (!memorial || memorial.owner_id !== user.id) return json({ ok: false, error: "forbidden" }, 403);

  const r = await sendMetaEvent({
    eventName: "Lead",
    eventId,
    sourceUrl,
    userData: await metaUser(),
    customData: { content_name: "Digitalni memorijal", content_ids: [memorialId] },
  });
  return json({ ok: r.ok, meta_status: r.status });
});
