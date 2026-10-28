// Called by the page the visitor returns to after Stripe Checkout.
// Lights the candle if Stripe says it is paid (stripe-webhook does the same; whichever runs first wins).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { activateCandleFromSession } from "../_shared/candles.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });

  try {
    const { session_id } = await req.json();
    if (typeof session_id !== "string" || !session_id.startsWith("cs_")) return json({ error: "Neispravan zahtjev." }, 400);

    const stripeKey = Deno.env.get("STRIPE_LIVE_API_KEY") || Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!stripeKey) throw new Error("STRIPE_LIVE_API_KEY or STRIPE_SECRET_KEY is not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false },
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.metadata?.type !== "candle") return json({ error: "Neispravan zahtjev." }, 400);
    if (session.payment_status !== "paid") return json({ paid: false });

    const result = await activateCandleFromSession(admin, session);
    if (!result.ok) return json({ paid: true, lit: false });
    return json({ paid: true, lit: true, kind: result.kind, name: result.name, days: result.days, expires_at: result.expiresAt });
  } catch (error) {
    console.error("[VERIFY-CANDLE-PAYMENT] ERROR", String(error));
    return json({ error: "Provjera plaćanja nije uspjela." }, 500);
  }
});
