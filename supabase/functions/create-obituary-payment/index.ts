import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-OBITUARY-PAYMENT] ${step}${detailsStr}`);
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

    const stripeKey = Deno.env.get("STRIPE_LIVE_API_KEY") || Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_LIVE_API_KEY or STRIPE_SECRET_KEY is not set");

    const { obituaryData } = await req.json();
    logStep("Received obituary data", { obituaryData });

    if (!obituaryData) {
      throw new Error("Missing obituary data");
    }

    // Insert obituary data into database
    const { data: obituary, error: insertError } = await supabaseClient
      .from("obituaries")
      .insert({
        ime: obituaryData.ime,
        prezime: obituaryData.prezime,
        datum_rodenja: obituaryData.datum_rodenja,
        datum_smrti: obituaryData.datum_smrti,
        mjesto_rodenja: obituaryData.mjesto_rodenja,
        mjesto_smrti: obituaryData.mjesto_smrti,
        profesija: obituaryData.profesija,
        podnaslov: obituaryData.podnaslov,
        biografija: obituaryData.biografija,
        fotografija_url: obituaryData.fotografija_url,
        groblje: obituaryData.groblje,
        datum_ukopa: obituaryData.datum_ukopa,
        ozalosceni: obituaryData.ozalosceni ? obituaryData.ozalosceni.split(',').map(s => s.trim()) : null,
        mjesna_zajednica: obituaryData.mjesna_zajednica,
        kontakt_osoba_ime: obituaryData.kontakt_osoba_ime,
        kontakt_osoba_email: obituaryData.kontakt_osoba_email,
        kontakt_osoba_telefon: obituaryData.kontakt_osoba_telefon,
        kontakt_osobe: obituaryData.kontakt_osobe || null,
        paid: false,
        active: false
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Database error: ${insertError.message}`);
    }

    logStep("Obituary inserted into database", { obituaryId: obituary.id });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Create payment session
    const session = await stripe.checkout.sessions.create({
      customer_email: obituaryData.kontakt_osoba_email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Objava osmrtnice",
              description: `Osmrtnica za ${obituaryData.ime} ${obituaryData.prezime}`,
            },
            unit_amount: 900, // 9€ in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/obituary-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/objavi-osmrtnicu`,
      metadata: {
        obituary_id: obituary.id,
        type: "obituary"
      }
    });

    logStep("Stripe session created", { sessionId: session.id });

    // Update obituary with payment intent ID
    await supabaseClient
      .from("obituaries")
      .update({ stripe_payment_intent_id: session.id })
      .eq("id", obituary.id);

    logStep("Updated obituary with payment intent ID");

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});