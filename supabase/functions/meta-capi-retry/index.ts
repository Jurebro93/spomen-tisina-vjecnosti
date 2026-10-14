// Scheduled retry worker for meta_capi_deliveries. Protected by a Vault secret; only sends Meta CAPI events (never payments, invoices or memorial activation).
import Stripe from "https://esm.sh/stripe@14.21.0";
import { adminClient } from "../_shared/invoices.ts";
import { deliverPurchase, MAX_ATTEMPTS } from "../_shared/capiDelivery.ts";

const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

Deno.serve(async (req) => {
  // Dedicated secret (stored in Supabase Vault as META_CAPI_RETRY_SECRET), checked before any work.
  const provided = req.headers.get("x-retry-secret") ?? "";
  const admin = adminClient();
  const { data: expected, error: secretError } = await admin.rpc("meta_capi_retry_secret");
  if (secretError || typeof expected !== "string" || expected.length < 32 || !safeEqual(provided, expected)) {
    return new Response("forbidden", { status: 403 });
  }
  const stripeKey = Deno.env.get("STRIPE_LIVE_API_KEY") || Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return new Response("stripe missing", { status: 500 });
  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
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
