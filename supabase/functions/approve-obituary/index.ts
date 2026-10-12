import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[APPROVE-OBITUARY] ${step}${detailsStr}`);
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
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const action = url.searchParams.get("action"); // approve | reject

    if (!id) throw new Error("Missing obituary ID");
    if (!action || !["approve", "reject"].includes(action)) {
      throw new Error("Invalid action. Must be 'approve' or 'reject'");
    }

    logStep("Processing", { id, action });

    let record: any;
    if (action === "reject") {
      const { data, error } = await supabaseClient
        .from("obituaries")
        .delete()
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(`Database error: ${error.message}`);
      record = data;
    } else {
      const { data, error } = await supabaseClient
        .from("obituaries")
        .update({ paid: true, active: true })
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(`Database error: ${error.message}`);
      record = data;
    }

    const successMessage = action === "approve" ? "odobrena" : "odbačena";
    const statusText = action === "approve" ? "approved" : "deleted";

    const html = `<!DOCTYPE html>
<html lang="hr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Osmrtnica ${successMessage}</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 640px; margin: 40px auto; padding: 20px; background: #f8f9fa; }
  .card { background: #fff; padding: 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,.08); text-align:center; }
  .title { font-size: 24px; margin-bottom: 16px; color: ${action === "approve" ? '#22c55e' : '#ef4444'}; font-weight: 700; }
  .meta { color: #555; margin-top: 16px; }
</style>
</head>
<body>
  <div class="card">
    <div class="title">${action === "approve" ? '✅' : '🗑️'} Osmrtnica je uspješno ${successMessage}.</div>
    <div><strong>${record.ime} ${record.prezime}</strong></div>
    <div class="meta">Akcija: ${statusText}</div>
  </div>
</body>
</html>`;

    return new Response(html, { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" }, status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    const errorHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Greška</title></head><body><div style="max-width:640px;margin:40px auto;font-family:system-ui;">❌ Greška: ${message}</div></body></html>`;
    return new Response(errorHtml, { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" }, status: 500 });
  }
});