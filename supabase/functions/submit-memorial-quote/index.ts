import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SUBMIT-MEMORIAL-QUOTE] ${step}${detailsStr}`);
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

    const { tekst, autor, relacija, email_autora } = await req.json();
    logStep("Received quote submission", { autor, relacija });

    if (!tekst || !autor) {
      throw new Error("Tekst i autor su obavezni");
    }

    // Insert new quote with pending status
    const { data: quote, error: insertError } = await supabaseClient
      .from("memorijalni_citati")
      .insert({
        tekst,
        autor,
        relacija: relacija || null,
        email_autora: email_autora || null,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Database error: ${insertError.message}`);
    }

    logStep("Quote inserted into database", { quoteId: quote.id });

    // Send notification email to admin
    try {
      const { data: emailResponse, error: emailError } = await supabaseClient.functions.invoke('notify-new-quote', {
        body: { quoteData: quote }
      });

      if (emailError) {
        logStep("Warning: Email notification failed", { error: emailError.message });
        // Don't fail the whole request if email fails
      } else {
        logStep("Email notification sent successfully");
      }
    } catch (emailError) {
      logStep("Warning: Email notification failed", { error: emailError });
      // Don't fail the whole request if email fails
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Citat je uspješno dodan i čeka odobrenje",
      quote: quote
    }), {
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