// Candles are paid since 2026-10-28: they are lit through create-candle-payment (Stripe Checkout)
// and activated by verify-candle-payment / stripe-webhook. This old free endpoint is switched off
// so nobody can light or relight a candle without paying.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return new Response(JSON.stringify({ error: "Svijeća se pali uz plaćanje. Osvježite stranicu i pokušajte ponovno." }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 410,
  });
});
