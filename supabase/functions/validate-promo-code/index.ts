// Checks a promo code and returns the server-computed price. No price input is accepted.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminSupabase, PRODUCT_NAMES, validatePromoCode, type ProductType } from "../_shared/promo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });

  try {
    const { code, product_type } = await req.json();
    const productType: ProductType = product_type === "obituary" ? "obituary" : "memorial";

    const admin = adminSupabase();

    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      const { data } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = data.user?.id ?? null;
    }

    const result = await validatePromoCode(admin, String(code ?? ""), productType, userId);
    if (!result.ok) return json({ valid: false, message: result.message });

    return json({
      valid: true,
      message: "Promo kod je uspješno primijenjen.",
      code: result.promo.code,
      discount_type: result.promo.discount_type,
      product_name: PRODUCT_NAMES[productType],
      original_price: result.originalPrice,
      discount_amount: result.discountAmount,
      final_price: result.finalPrice,
      free: result.free,
    });
  } catch (error) {
    return json({ valid: false, message: "Provjera promo koda trenutno nije moguća." }, 200);
  }
});
