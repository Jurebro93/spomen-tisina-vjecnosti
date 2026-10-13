import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendMail } from "../_shared/mail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[NOTIFY-NEW-QUOTE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { quoteData } = await req.json();
    logStep("Received quote data", { quoteData });

    if (!quoteData) {
      throw new Error("Missing quote data");
    }

    const approveUrl = `https://umpvnepxsqfkxjpclkxc.supabase.co/functions/v1/approve-quote?id=${quoteData.id}&action=approve`;
    const rejectUrl = `https://umpvnepxsqfkxjpclkxc.supabase.co/functions/v1/approve-quote?id=${quoteData.id}&action=reject`;

    await sendMail({
      to: ["seoexperiment.agency@gmail.com"],
      subject: "Novi citat za odobrenje - Memorijalni vrt",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <h1 style="color: #333; border-bottom: 2px solid #d4af37; padding-bottom: 10px; text-align: center;">
            🔔 Novi citat čeka odobrenje
          </h1>
          
          <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #e0e0e0;">
            <h2 style="color: #555; margin-top: 0; margin-bottom: 20px;">📝 Detalji citata:</h2>
            <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
              <p style="margin: 8px 0;"><strong>Tekst:</strong> "${quoteData.tekst}"</p>
              <p style="margin: 8px 0;"><strong>Autor:</strong> ${quoteData.autor}</p>
              <p style="margin: 8px 0;"><strong>Relacija:</strong> ${quoteData.relacija || 'Nije navedeno'}</p>
              <p style="margin: 8px 0;"><strong>Email autora:</strong> ${quoteData.email_autora || 'Nije naveden'}</p>
              <p style="margin: 8px 0;"><strong>Datum dodavanja:</strong> ${new Date().toLocaleDateString('hr-HR')}</p>
            </div>
          </div>
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 30px 0; border: 2px solid #ffc107; text-align: center;">
            <h3 style="color: #856404; margin-top: 0; margin-bottom: 20px; font-size: 18px;">
              ⚡ BRZA AKCIJA POTREBNA
            </h3>
            
            <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
              <tr>
                <td style="padding: 10px;">
                  <a href="${approveUrl}" 
                     style="background-color: #22c55e; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; min-width: 140px; text-align: center; box-shadow: 0 4px 8px rgba(34, 197, 94, 0.3);">
                    ✅ ODOBRI CITAT
                  </a>
                </td>
                <td style="padding: 10px;">
                  <a href="${rejectUrl}" 
                     style="background-color: #ef4444; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; min-width: 140px; text-align: center; box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);">
                    ❌ ODBACI CITAT
                  </a>
                </td>
              </tr>
            </table>
            
            <p style="color: #856404; line-height: 1.6; margin-top: 20px; margin-bottom: 5px; font-size: 14px;">
              👆 Kliknite na jedan od gumbova iznad za trenutnu akciju
            </p>
          </div>
          
          <div style="text-align: center; margin: 25px 0; padding: 15px; background-color: #f0f0f0; border-radius: 6px;">
            <p style="margin: 5px 0; color: #666; font-size: 14px;">Alternativno možete koristiti admin panel:</p>
            <a href="https://supabase.com/dashboard/project/umpvnepxsqfkxjpclkxc" 
               style="background-color: #d4af37; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 14px; margin-top: 8px;">
              🔧 Otvori admin panel
            </a>
          </div>
          
          <hr style="border: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Osmrtnice platformom - Automatska notifikacija o novom citatu
          </p>
        </div>
      `,
    });

    logStep("Email sent successfully");

    return new Response(JSON.stringify({ 
      success: true
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