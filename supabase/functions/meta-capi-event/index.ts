// Mirrors memorial-creation events to Meta Conversions API: StartMemorial = first person search or manual entry,
// PersonSelected (+ standard AddToCart) = existing obituary chosen or new person saved, Lead = memorial draft created.
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

  // Custom funnel events: one per account, event_id = <prefix><user id> so the browser pixel copy de-duplicates.
  const funnelEvents: Record<string, { prefix: string; param: string; values: string[] }> = {
    StartMemorial: { prefix: "start_", param: "start_method", values: ["search", "manual"] },
    PersonSelected: { prefix: "person_", param: "person_source", values: ["existing", "new"] },
  };
  const funnel = typeof b.event_name === "string" ? funnelEvents[b.event_name] : undefined;
  if (funnel) {
    const eventId = cleanEventId(b.event_id, funnel.prefix);
    if (eventId !== `${funnel.prefix}${user.id}`) return json({ ok: false, error: "bad event" }, 400);
    const value = b[funnel.param];
    const userData = await metaUser();
    const customData = {
      content_name: "Digitalni memorijal",
      ...(typeof value === "string" && funnel.values.includes(value) ? { [funnel.param]: value } : {}),
    };
    // The dataset drops PersonSelected as unverified; the standard AddToCart with the same id gets through.
    const names = b.event_name === "PersonSelected" ? ["PersonSelected", "AddToCart"] : [b.event_name as string];
    const results = [];
    for (const eventName of names) results.push(await sendMetaEvent({ eventName, eventId, sourceUrl, userData, customData }));
    return json({ ok: results.every((r) => r.ok), meta_status: results[0].status });
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
