import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isMailConfigured, sendMail } from "../_shared/mail.ts";

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
    const { session_id } = await req.json();

    if (!session_id) {
      throw new Error("Session ID is required");
    }

    // Initialize Stripe (prefer live key, fall back to generic secret)
    const stripeKey = Deno.env.get("STRIPE_LIVE_API_KEY") || Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!stripeKey) throw new Error("STRIPE_LIVE_API_KEY or STRIPE_SECRET_KEY is not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Initialize Supabase with service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get session details from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!session) {
      throw new Error("Session not found");
    }

    console.log("Session status:", session.payment_status);
    console.log("Session metadata:", session.metadata);

    // Check if payment was successful
    if (session.payment_status === "paid") {
      // Find the candle record by session ID
      const { data: candle, error: findError } = await supabase
        .from('virtual_candles')
        .select('*')
        .eq('stripe_payment_intent_id', session_id)
        .single();

      if (findError) {
        console.error("Error finding candle:", findError);
        throw new Error("Candle not found");
      }

      // Update the candle record to mark as paid and active
      const { error: updateError } = await supabase
        .from('virtual_candles')
        .update({
          paid: true,
          active: true,
        })
        .eq('id', candle.id);

      if (updateError) {
        console.error("Error updating candle:", updateError);
        throw new Error("Failed to activate candle");
      }

      console.log("Candle activated successfully:", candle.id);

      // Send email notification
      try {
        if (isMailConfigured()) {
          await sendMail({
            to: [candle.zapalio_email],
            subject: "Potvrda kupnje virtualne svijeće",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #333; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">
                    🕯️ Potvrda uspješne kupnje
                  </h1>
                </div>
                
                <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #e0e0e0;">
                  <h2 style="color: #555; margin-top: 0; margin-bottom: 20px;">🕯️ Vaša virtualna svijeća je zapaljena</h2>
                  <div style="background: white; padding: 15px; border-radius: 6px;">
                    <p><strong>Za pokojnika:</strong> ${candle.pokojnik_ime} ${candle.pokojnik_prezime}</p>
                    <p><strong>Zapalio/la:</strong> ${candle.zapalio_ime}</p>
                    ${candle.poruka ? `<p><strong>Poruka:</strong> "${candle.poruka}"</p>` : ''}
                    <p><strong>Datum paljenja:</strong> ${new Date(candle.created_at).toLocaleDateString('hr-HR')}</p>
                    <p><strong>Vrijedi do:</strong> ${new Date(candle.expires_at).toLocaleDateString('hr-HR')}</p>
                    <p><strong>Status:</strong> <span style="color: #22c55e; font-weight: bold;">Aktivna</span></p>
                  </div>
                </div>
                
                <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; text-align: center;">
                  <p style="color: #856404; margin: 0; font-weight: bold;">
                    🕯️ Vaša svijeća će gorjeti 7 dana u znak sjećanja
                  </p>
                </div>
                
                <hr style="border: 1px solid #eee; margin: 30px 0;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                  Osmrtnice platformom - Potvrda kupnje virtualne svijeće
                </p>
              </div>
            `,
          });

          await sendMail({
            to: ["seoexperiment.agency@gmail.com"],
            subject: "Nova kupnja virtualne svijeće - Obavijest",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #333; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">
                    🕯️ Nova kupnja virtualne svijeće
                  </h1>
                </div>
                
                <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #e0e0e0;">
                  <h2 style="color: #555; margin-top: 0; margin-bottom: 20px;">🕯️ Detalji kupljene svijeće</h2>
                  <div style="background: white; padding: 15px; border-radius: 6px;">
                    <p><strong>Za pokojnika:</strong> ${candle.pokojnik_ime} ${candle.pokojnik_prezime}</p>
                    <p><strong>Zapalio/la:</strong> ${candle.zapalio_ime}</p>
                    <p><strong>Email kupca:</strong> ${candle.zapalio_email}</p>
                    ${candle.poruka ? `<p><strong>Poruka:</strong> "${candle.poruka}"</p>` : '<p><strong>Poruka:</strong> Nije dodana</p>'}
                    <p><strong>Datum paljenja:</strong> ${new Date(candle.created_at).toLocaleDateString('hr-HR')}</p>
                    <p><strong>Vrijedi do:</strong> ${new Date(candle.expires_at).toLocaleDateString('hr-HR')}</p>
                    <p><strong>Datum kupnje:</strong> ${new Date().toLocaleDateString('hr-HR')}</p>
                  </div>
                </div>
                
                <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; text-align: center;">
                  <p style="color: #155724; margin: 0; font-weight: bold;">
                    💰 Plaćanje uspješno obrađeno i svijeća je zapaljena!
                  </p>
                </div>
                
                <hr style="border: 1px solid #eee; margin: 30px 0;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                  Osmrtnice platformom - Admin obavijest
                </p>
              </div>
            `,
          });
          
          console.log("Email sent successfully");
        }
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
        // Don't fail the whole request if email fails
      }

      return new Response(JSON.stringify({ 
        success: true, 
        candle_id: candle.id,
        message: "Svijeća je uspješno zapaljena!" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Plaćanje nije uspješno završeno" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

  } catch (error) {
    console.error("Error verifying payment:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Greška pri verifikaciji plaćanja" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});