import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[APPROVE-QUOTE] ${step}${detailsStr}`);
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

    const url = new URL(req.url);
    const quoteId = url.searchParams.get("id");
    const action = url.searchParams.get("action"); // approve or reject

    if (!quoteId) {
      throw new Error("Missing quote ID");
    }

    if (!action || !["approve", "reject"].includes(action)) {
      throw new Error("Invalid action. Must be 'approve' or 'reject'");
    }

    logStep("Processing quote action", { quoteId, action });

    let quote;
    if (action === "reject") {
      // Delete the quote if rejected
      const { data: deletedQuote, error: deleteError } = await supabaseClient
        .from("memorijalni_citati")
        .delete()
        .eq("id", quoteId)
        .select()
        .single();

      if (deleteError) {
        throw new Error(`Database error: ${deleteError.message}`);
      }

      quote = deletedQuote;
      logStep("Quote deleted successfully", { quoteId });
    } else {
      // Update quote status to approved
      const { data: updatedQuote, error: updateError } = await supabaseClient
        .from("memorijalni_citati")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: "admin"
        })
        .eq("id", quoteId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Database error: ${updateError.message}`);
      }

      quote = updatedQuote;
      logStep("Quote approved successfully", { quoteId, newStatus: quote.status });
    }

    // Return success page
    const successMessage = action === "approve" ? "odobren" : "odbačen";
    const statusText = action === "approve" ? "approved" : "deleted";
    const statusDate = action === "approve" ? quote.approved_at : quote.created_at;
    
    const html = `
      <!DOCTYPE html>
      <html lang="hr">
        <head>
          <title>Citat ${successMessage}</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              max-width: 600px; 
              margin: 50px auto; 
              padding: 20px; 
              text-align: center;
              background-color: #f8f9fa;
              line-height: 1.6;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .success { 
              color: #22c55e; 
              font-size: 28px; 
              margin-bottom: 30px; 
              font-weight: bold;
            }
            .error { 
              color: #ef4444; 
              font-size: 28px; 
              margin-bottom: 30px; 
              font-weight: bold;
            }
            .quote { 
              background: #f8f9fa; 
              padding: 25px; 
              border-radius: 8px; 
              margin: 30px 0; 
              font-style: italic;
              border-left: 4px solid #d4af37;
            }
            .quote p {
              margin: 10px 0;
              font-size: 18px;
            }
            .status {
              background: #e3f2fd;
              padding: 15px;
              border-radius: 6px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">${action === "approve" ? "✅" : "🗑️"} Citat je uspješno ${successMessage}!</div>
            <div class="quote">
              <p>"${quote.tekst}"</p>
              <p><strong>- ${quote.autor}</strong></p>
              ${quote.relacija ? `<p><em>${quote.relacija}</em></p>` : ''}
            </div>
            <div class="status">
              <p><strong>Akcija:</strong> ${statusText}</p>
              <p><strong>Datum:</strong> ${new Date(statusDate).toLocaleDateString('hr-HR')}</p>
              ${action === "approve" ? 
                '<p style="color: #22c55e;"><strong>Citat će se prikazati na web stranici.</strong></p>' : 
                '<p style="color: #ef4444;"><strong>Citat je uklonjen iz baze podataka.</strong></p>'
              }
            </div>
          </div>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Greška</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #ef4444; font-size: 24px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="error">❌ Greška: ${errorMessage}</div>
        </body>
      </html>
    `;

    return new Response(errorHtml, {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      status: 500,
    });
  }
});