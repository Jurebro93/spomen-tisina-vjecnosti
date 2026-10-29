// Checks a promo code and returns the server-computed price. No price input is accepted.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminSupabase, PRODUCT_NAMES, priceMemorial, validatePromoCode, type ProductType } from "../_shared/promo.ts";
import { SEASONAL_PROMO } from "../_shared/seasonalPromo.ts";
import { CANDLE_PLANS, isCandlePlan } from "../_shared/candles.ts";

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
    const { code, product_type, days } = await req.json();
    const productType: ProductType =
      product_type === "obituary" ? "obituary" : product_type === "candle" ? "candle" : "memorial";
    // Candles: price of the chosen plan (7 / 14 / 30 days). The seasonal memorial discount never applies.
    const candleDays = Number(days);
    if (productType === "candle" && !isCandlePlan(candleDays)) {
      return json({ valid: false, message: "Odaberite koliko dugo svijeća gori." });
    }
    const basePrice = productType === "candle" ? CANDLE_PLANS[candleDays] : undefined;

    const admin = adminSupabase();

    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      const { data } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = data.user?.id ?? null;
    }

    // Memorial: same pricing as checkout (seasonal discount by date, the cheaper of it and the code).
    if (productType === "memorial") {
      const price = await priceMemorial(admin, String(code ?? ""), userId);
      if (!price.ok) return json({ valid: false, message: price.message });
      if (price.codeError) {
        return json({ valid: false, message: `${price.codeError} Popust za ${SEASONAL_PROMO.occasion} (${SEASONAL_PROMO.percent} %) i dalje vrijedi sam od sebe.` });
      }
      if (!price.code) return json({ valid: false, message: "Unesite promo kod." });
      return json({
        valid: true,
        message: price.codeOutdone
          ? `Popust za ${SEASONAL_PROMO.occasion} (${SEASONAL_PROMO.percent} %) veći je od ovog koda. Popusti se ne zbrajaju, pa vrijedi veći.`
          : "Promo kod je uspješno primijenjen.",
        code: price.code,
        discount_type: price.discountType,
        product_name: PRODUCT_NAMES[productType],
        original_price: price.originalPrice,
        discount_amount: price.discountAmount,
        final_price: price.finalPrice,
        free: price.free,
      });
    }

    const result = await validatePromoCode(admin, String(code ?? ""), productType, userId, Date.now(), basePrice);
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
