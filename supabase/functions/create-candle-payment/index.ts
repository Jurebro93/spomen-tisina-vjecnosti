import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      pokojnikIme, 
      pokojnikPrezime, 
      zapalioIme, 
      zapalioEmail, 
      poruka 
    } = await req.json();

    // Validate required fields
    if (!pokojnikIme || !pokojnikPrezime || !zapalioIme || !zapalioEmail) {
      throw new Error("Svi obavezni podaci moraju biti uneseni");
    }

    // Initialize Stripe (prefer live key, fall back to generic secret)
    const stripeKey = Deno.env.get("STRIPE_LIVE_API_KEY") || Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!stripeKey) throw new Error("STRIPE_LIVE_API_KEY or STRIPE_SECRET_KEY is not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Initialize Supabase with service role key for database operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if a candle already exists for this person
    const { data: existingCandle, error: checkError } = await supabase
      .from('virtual_candles')
      .select('id')
      .eq('pokojnik_ime', pokojnikIme)
      .eq('pokojnik_prezime', pokojnikPrezime)
      .maybeSingle(); // Use maybeSingle to avoid error when no results found

    if (checkError) {
      console.error("Database error checking existing candle:", checkError);
      throw new Error("Greška pri provjeri postojanja svijeće");
    }

    let candleData;
    if (existingCandle) {
      // Update existing candle - relight it
      const { data: updatedCandle, error: updateError } = await supabase
        .from('virtual_candles')
        .update({
          zapalio_ime: zapalioIme,
          zapalio_email: zapalioEmail,
          poruka: poruka || null,
          paid: false, // Will be set to true after payment
          active: true, // Immediately activate for relighting
          created_at: new Date().toISOString(), // Move to top
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        })
        .eq('id', existingCandle.id)
        .select()
        .single();

      if (updateError) {
        console.error("Database error updating candle:", updateError);
        throw new Error("Greška pri ažuriranju svijeće");
      }
      candleData = updatedCandle;
    } else {
      // Create new candle record
      const { data: newCandle, error: candleError } = await supabase
        .from('virtual_candles')
        .insert({
          pokojnik_ime: pokojnikIme,
          pokojnik_prezime: pokojnikPrezime,
          zapalio_ime: zapalioIme,
          zapalio_email: zapalioEmail,
          poruka: poruka || null,
          paid: false,
          active: false
        })
        .select()
        .single();

      if (candleError) {
        console.error("Database error creating candle:", candleError);
        throw new Error("Greška pri spremanju podataka");
      }
      candleData = newCandle;
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: zapalioEmail,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Virtualna svijeća za ${pokojnikIme} ${pokojnikPrezime}`,
              description: "Vječno svjetlo za vječnu uspomenu - svijetli 7 dana",
            },
            unit_amount: 100, // 1€ in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/virtualne-svijece?success=true&candle_id=${candleData.id}`,
      cancel_url: `${req.headers.get("origin")}/zapali-svijecu?cancelled=true`,
      metadata: {
        candle_id: candleData.id,
        pokojnik_ime: pokojnikIme,
        pokojnik_prezime: pokojnikPrezime,
      },
    });

    // Update candle record with Stripe session info
    await supabase
      .from('virtual_candles')
      .update({
        stripe_payment_intent_id: session.id
      })
      .eq('id', candleData.id);

    console.log("Candle payment session created:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error creating candle payment:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Dogodila se greška prilikom kreiranja plaćanja" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});