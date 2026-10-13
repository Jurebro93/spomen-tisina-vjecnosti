import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isMailConfigured, sendMail } from "../_shared/mail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-OBITUARY-PAYMENT] ${step}${detailsStr}`);
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

    const { session_id } = await req.json();
    logStep("Received session ID", { session_id });

    if (!session_id) {
      throw new Error("Missing session_id");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Retrieved Stripe session", { 
      sessionId: session.id, 
      paymentStatus: session.payment_status,
      metadata: session.metadata 
    });

    if (session.payment_status === "paid" && session.metadata?.obituary_id) {
      // Update obituary status to paid and active
      const { data: obituary, error: updateError } = await supabaseClient
        .from("obituaries")
        .update({
          paid: true,
          active: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", session.metadata.obituary_id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Database error: ${updateError.message}`);
      }

      logStep("Updated obituary status", { obituaryId: obituary.id });

      // Send email notification
      try {
        if (isMailConfigured()) {
          await sendMail({
            to: [obituary.kontakt_osoba_email],
            subject: "Potvrda kupnje osmrtnice",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #333; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">
                    ✅ Potvrda uspješne kupnje
                  </h1>
                </div>
                
                <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #e0e0e0;">
                  <h2 style="color: #555; margin-top: 0; margin-bottom: 20px;">📰 Vaša osmrtnica je uspješno objavljena</h2>
                  <div style="background: white; padding: 15px; border-radius: 6px;">
                    <p><strong>Ime i prezime:</strong> ${obituary.ime} ${obituary.prezime}</p>
                    <p><strong>Datum rođenja:</strong> ${new Date(obituary.datum_rodenja).toLocaleDateString('hr-HR')}</p>
                    <p><strong>Datum smrti:</strong> ${new Date(obituary.datum_smrti).toLocaleDateString('hr-HR')}</p>
                    <p><strong>Kontakt osoba:</strong> ${obituary.kontakt_osoba_ime}</p>
                    <p><strong>Status:</strong> <span style="color: #22c55e; font-weight: bold;">Aktivna</span></p>
                  </div>
                </div>
                
                <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; text-align: center;">
                  <p style="color: #1976d2; margin: 0; font-weight: bold;">
                    Osmrtnica je sada vidljiva na našoj web stranici.
                  </p>
                </div>
                
                <hr style="border: 1px solid #eee; margin: 30px 0;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                  Osmrtnice platformom - Potvrda kupnje
                </p>
              </div>
            `,
          });

          await sendMail({
            to: ["seoexperiment.agency@gmail.com"],
            subject: "Nova kupnja osmrtnice - Obavijest",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #333; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">
                    💰 Nova kupnja osmrtnice
                  </h1>
                </div>
                
                <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #e0e0e0;">
                  <h2 style="color: #555; margin-top: 0; margin-bottom: 20px;">📰 Detalji kupljene osmrtnice</h2>
                  <div style="background: white; padding: 15px; border-radius: 6px;">
                    <p><strong>Pokojnik:</strong> ${obituary.ime} ${obituary.prezime}</p>
                    <p><strong>Datum rođenja:</strong> ${new Date(obituary.datum_rodenja).toLocaleDateString('hr-HR')}</p>
                    <p><strong>Datum smrti:</strong> ${new Date(obituary.datum_smrti).toLocaleDateString('hr-HR')}</p>
                    <p><strong>Mjesto rođenja:</strong> ${obituary.mjesto_rodenja}</p>
                    <p><strong>Mjesto smrti:</strong> ${obituary.mjesto_smrti}</p>
                    <p><strong>Kontakt osoba:</strong> ${obituary.kontakt_osoba_ime}</p>
                    <p><strong>Email:</strong> ${obituary.kontakt_osoba_email}</p>
                    <p><strong>Telefon:</strong> ${obituary.kontakt_osoba_telefon || 'Nije naveden'}</p>
                    <p><strong>Datum kupnje:</strong> ${new Date().toLocaleDateString('hr-HR')}</p>
                  </div>
                </div>
                
                <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; text-align: center;">
                  <p style="color: #155724; margin: 0; font-weight: bold;">
                    💰 Plaćanje uspješno obrađeno i osmrtnica je objavljena!
                  </p>
                </div>
                
                <hr style="border: 1px solid #eee; margin: 30px 0;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                  Osmrtnice platformom - Admin obavijest
                </p>
              </div>
            `,
          });
          
          logStep("Email sent successfully");
        }
      } catch (emailError) {
        logStep("Email sending failed", { error: emailError });
        // Don't fail the whole request if email fails
      }

      return new Response(JSON.stringify({ 
        success: true, 
        obituary: obituary,
        message: "Plaćanje uspješno potvrđeno i osmrtnica je objavljena!" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      logStep("Payment not completed", { paymentStatus: session.payment_status });
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Plaćanje nije uspješno završeno" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});