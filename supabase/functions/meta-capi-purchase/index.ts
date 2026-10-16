// Mirrors a confirmed Stripe memorial Purchase to Meta Conversions API.
// Accepts requests only from osmrtnica.com.hr / www.osmrtnica.com.hr and re-verifies payment with Stripe.
// Called from the thank-you page so the delivery gets the buyer's IP and browser.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { adminClient } from "../_shared/invoices.ts";
import { deliverPurchase, ensureDelivery } from "../_shared/capiDelivery.ts";
import { clientFromRequest, PRODUCTION_ORIGINS } from "../_shared/metaCapi.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const origin = req.headers.get("origin") ?? "";
  if (!PRODUCTION_ORIGINS.includes(origin)) return json({ ok: false, error: "forbidden" }, 403);
  const token = Deno.env.get("META_CAPI_ACCESS_TOKEN");
  const stripeKey = Deno.env.get("STRIPE_LIVE_API_KEY") || Deno.env.get("STRIPE_SECRET_KEY");
  if (!token) return json({ ok: false, error: "config missing" }, 500);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ ok: false, error: "bad json" }, 400); }

  if (!stripeKey) return json({ ok: false, error: "config missing" }, 500);
  const sessionId = typeof b.session_id === "string" && /^cs_[A-Za-z0-9_]{10,200}$/.test(b.session_id) ? b.session_id : "";
  if (!sessionId) return json({ ok: false, error: "session_id required" }, 400);

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") return json({ ok: false, error: "not paid" }, 400);
  const memorialId = session.metadata?.memorial_id;
  if (!memorialId) return json({ ok: false, error: "no memorial" }, 400);

  // Record browser identifiers (with consent) and send through the deduplicated, retried pipeline.
  const admin = adminClient();
  await ensureDelivery(admin, session, clientFromRequest(req));
  const r = await deliverPurchase(admin, stripe, sessionId);
  return json({ ok: true, delivery: r.status, meta_status: r.meta_status ?? null, meta_body: r.meta_body ?? null });
});
