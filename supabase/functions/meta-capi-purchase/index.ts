// Mirrors a confirmed Stripe memorial Purchase to Meta Conversions API.
// Accepts requests only from osmrtnica.com.hr / www.osmrtnica.com.hr and re-verifies payment with Stripe.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "https://esm.sh/stripe@14.21.0";

const PIXEL_ID = "2915138225551446";
const ALLOWED_ORIGINS = ["https://osmrtnica.com.hr", "https://www.osmrtnica.com.hr"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const sha256 = async (v: string) => {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v.trim().toLowerCase()));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const origin = req.headers.get("origin") ?? "";
  if (!ALLOWED_ORIGINS.includes(origin)) return json({ ok: false, error: "forbidden" }, 403);
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

  // Buyer data only (Stripe customer details) — never the deceased person's name.
  const cd = session.customer_details;
  const parts = (cd?.name ?? "").trim().split(/\s+/).filter(Boolean);
  const userData: Record<string, unknown> = {
    client_user_agent: req.headers.get("user-agent") ?? undefined,
    client_ip_address: (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || undefined,
  };
  const email = cd?.email ?? session.customer_email;
  if (email) userData.em = [await sha256(email)];
  if (parts.length) userData.fn = [await sha256(parts[0])];
  if (parts.length > 1) userData.ln = [await sha256(parts.slice(1).join(" "))];
  const phone = (cd?.phone ?? "").replace(/\D/g, "");
  if (phone) userData.ph = [await sha256(phone)];

  const res = await fetch(`https://graph.facebook.com/v19.0/${PIXEL_ID}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      data: [{
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: `purchase_${sessionId}`,
        action_source: "website",
        event_source_url: `${origin}/zahvaljujemo`,
        user_data: userData,
        custom_data: {
          value: (session.amount_total ?? 0) / 100,
          currency: (session.currency ?? "eur").toUpperCase(),
          content_ids: [memorialId],
        },
      }],
    }),
  });
  const metaBody = await res.text();
  let metaJson: unknown = null;
  try { metaJson = JSON.parse(metaBody); } catch { /* raw */ }
  console.log(`[META-CAPI-PURCHASE] status ${res.status}`);
  return json({ ok: res.ok, meta_status: res.status, meta_body: metaJson ?? metaBody }, res.ok ? 200 : 502);
});
