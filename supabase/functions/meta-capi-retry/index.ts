// Scheduled retry worker for meta_capi_deliveries. Protected by the service role key.
import Stripe from "https://esm.sh/stripe@14.21.0";
import { adminClient } from "../_shared/invoices.ts";
import { deliverPurchase, MAX_ATTEMPTS } from "../_shared/capiDelivery.ts";

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) return new Response("forbidden", { status: 403 });
  const stripeKey = Deno.env.get("STRIPE_LIVE_API_KEY") || Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return new Response("stripe missing", { status: 500 });
  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const admin = adminClient();
  const nowIso = new Date().toISOString();
  const staleIso = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data } = await admin.from("meta_capi_deliveries").select("stripe_session_id")
    .lt("attempts", MAX_ATTEMPTS)
    .or(`status.eq.pending,and(status.eq.failed,next_attempt_at.lte.${nowIso}),and(status.eq.processing,locked_at.lt.${staleIso})`)
    .limit(25);
  const results = [];
  for (const r of data ?? []) results.push({ session: r.stripe_session_id, ...(await deliverPurchase(admin, stripe, r.stripe_session_id)) });
  const { data: purged } = await admin.rpc("purge_capi_identifiers");
  return new Response(JSON.stringify({ processed: results.length, purged, results: results.map((r) => ({ session: r.session, status: r.status })) }), { headers: { "Content-Type": "application/json" } });
});
