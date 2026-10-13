import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SUBMIT-CANDLE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const { pokojnikIme, pokojnikPrezime, zapalioIme, zapalioEmail, poruka } = await req.json();
    if (!pokojnikIme || !pokojnikPrezime || !zapalioIme || !zapalioEmail) {
      throw new Error("Nedostaju obavezna polja");
    }

    // Auto-approve: candle is immediately active and paid
    const { data: candle, error: insertError } = await supabaseClient
      .from("virtual_candles")
      .insert({
        pokojnik_ime: pokojnikIme,
        pokojnik_prezime: pokojnikPrezime,
        zapalio_ime: zapalioIme,
        zapalio_email: zapalioEmail,
        poruka,
        paid: true,
        active: true,
      })
      .select()
      .single();

    if (insertError) throw new Error(`Database error: ${insertError.message}`);

    logStep("Candle auto-approved and active", { id: candle.id });

    return new Response(JSON.stringify({ success: true, id: candle.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
