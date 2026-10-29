// Server-side promo code validation and usage tracking.
// The frontend never decides prices — every amount comes from here.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SEASONAL_PROMO, isSeasonalPromoRunning, seasonalPriceFor } from "./seasonalPromo.ts";

export type ProductType = "memorial" | "obituary" | "candle";

/** What an admin can pick a code for: one product, "both" (obituary + memorial) or "all" (also candles). */
export type PromoTarget = ProductType | "both" | "all";

/** Canonical prices in EUR. Never trust a price coming from the client. Candles depend on the plan (candles.ts). */
export const PRODUCT_PRICES: Record<"memorial" | "obituary", number> = {
  memorial: 39,
  obituary: 9,
};

export const PRODUCT_NAMES: Record<ProductType, string> = {
  memorial: "Digitalni memorijal",
  obituary: "Objava osmrtnice",
  candle: "Virtualna svijeća",
};

export const promoAppliesTo = (target: PromoTarget, productType: ProductType) =>
  target === "all" || target === productType || (target === "both" && productType !== "candle");

export interface PromoCodeRow {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed" | "free";
  discount_value: number;
  product_type: PromoTarget;
  active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  max_uses_per_user: number;
  current_uses: number;
  created_by_admin_id: string | null;
}

export interface PromoResult {
  ok: true;
  promo: PromoCodeRow;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  free: boolean;
}

export interface PromoFailure {
  ok: false;
  message: string;
}

export const adminSupabase = (): SupabaseClient =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Looks the code up itself, checks every rule and computes the final price.
 * Returns a Croatian message for every failure reason.
 * basePrice is required for candles (price of the chosen plan, from candles.ts).
 */
export const validatePromoCode = async (
  admin: SupabaseClient,
  rawCode: string,
  productType: ProductType,
  userId: string | null,
  now = Date.now(),
  basePrice?: number,
): Promise<PromoResult | PromoFailure> => {
  const code = (rawCode ?? "").trim();
  if (!code) return { ok: false, message: "Unesite promo kod." };

  const { data } = await admin
    .from("promo_codes")
    .select(
      "id, code, discount_type, discount_value, product_type, active, expires_at, max_uses, max_uses_per_user, current_uses, created_by_admin_id",
    )
    .ilike("code", code)
    .maybeSingle();

  const promo = data as PromoCodeRow | null;
  if (!promo) return { ok: false, message: "Promo kod nije pronađen." };
  if (!promo.active) return { ok: false, message: "Promo kod više nije aktivan." };
  if (promo.expires_at && new Date(promo.expires_at).getTime() < now) {
    return { ok: false, message: "Promo kod je istekao." };
  }
  if (!promoAppliesTo(promo.product_type, productType)) {
    return { ok: false, message: "Promo kod nije moguće koristiti za ovaj proizvod." };
  }

  const { count: totalUses } = await admin
    .from("promo_code_usage")
    .select("id", { count: "exact", head: true })
    .eq("promo_code_id", promo.id);

  const used = Math.max(promo.current_uses ?? 0, totalUses ?? 0);
  if (promo.max_uses !== null && used >= promo.max_uses) {
    return { ok: false, message: "Dosegnut je maksimalan broj korištenja ovog promo koda." };
  }

  if (userId) {
    const { count: userUses } = await admin
      .from("promo_code_usage")
      .select("id", { count: "exact", head: true })
      .eq("promo_code_id", promo.id)
      .eq("user_id", userId);
    if ((userUses ?? 0) >= (promo.max_uses_per_user ?? 1)) {
      return { ok: false, message: "Ovaj promo kod ste već iskoristili maksimalan broj puta." };
    }
  }

  const originalPrice = basePrice ?? (productType === "candle" ? NaN : PRODUCT_PRICES[productType]);
  if (!Number.isFinite(originalPrice)) return { ok: false, message: "Odaberite proizvod." };
  let discountAmount = 0;
  if (promo.discount_type === "free") discountAmount = originalPrice;
  else if (promo.discount_type === "percentage") discountAmount = originalPrice * (Number(promo.discount_value) / 100);
  else discountAmount = Number(promo.discount_value);

  discountAmount = round2(Math.min(Math.max(discountAmount, 0), originalPrice));
  const finalPrice = round2(Math.max(originalPrice - discountAmount, 0));

  return {
    ok: true,
    promo,
    originalPrice,
    discountAmount,
    finalPrice,
    free: finalPrice <= 0,
  };
};

/** Records one usage (idempotent per order) and keeps current_uses in sync. */
export const recordPromoUsage = async (
  admin: SupabaseClient,
  params: {
    promoCodeId: string;
    userId: string | null;
    orderId: string | null;
    productType: ProductType;
    originalPrice: number;
    discountAmount: number;
    finalPrice: number;
  },
): Promise<boolean> => {
  const { error } = await admin.from("promo_code_usage").insert({
    promo_code_id: params.promoCodeId,
    user_id: params.userId,
    order_id: params.orderId,
    product_type: params.productType,
    original_price: params.originalPrice,
    discount_amount: params.discountAmount,
    final_price: params.finalPrice,
  });

  // Unique index on (promo_code_id, order_id) makes repeated webhook calls harmless.
  if (error) {
    if (error.code === "23505" || error.message.includes("duplicate")) return false;
    throw new Error(error.message);
  }

  const { count } = await admin
    .from("promo_code_usage")
    .select("id", { count: "exact", head: true })
    .eq("promo_code_id", params.promoCodeId);
  await admin.from("promo_codes").update({ current_uses: count ?? 1 }).eq("id", params.promoCodeId);
  return true;
};

export interface MemorialPrice {
  ok: true;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  free: boolean;
  promoId: string | null;
  /** Code recorded on the order: the buyer's code, or the seasonal one when that is cheaper. */
  code: string | null;
  discountType: PromoCodeRow["discount_type"] | null;
  /** The seasonal discount was used. */
  seasonal: boolean;
  /** The buyer's code was valid but the seasonal discount is bigger, so the code was not used. */
  codeOutdone: boolean;
  /** Why the buyer's code was rejected while the seasonal discount still applies. */
  codeError: string | null;
}

/**
 * Memorial price for checkout. While the seasonal discount runs (seasonalPromo.ts) it applies by date,
 * no code needed. Discounts never add up: with a promo code the buyer gets whichever is cheaper.
 */
export const priceMemorial = async (
  admin: SupabaseClient,
  rawCode: string | null | undefined,
  userId: string | null,
  now = Date.now(),
): Promise<MemorialPrice | PromoFailure> => {
  const originalPrice = PRODUCT_PRICES.memorial;
  const code = String(rawCode ?? "").trim();
  const seasonalOn = isSeasonalPromoRunning(now);
  const isSeasonalCode = code.toUpperCase() === SEASONAL_PROMO.code;

  let fromCode: PromoResult | null = null;
  let codeError: string | null = null;
  if (code && !(seasonalOn && isSeasonalCode)) {
    const result = await validatePromoCode(admin, code, "memorial", userId, now);
    if (result.ok) fromCode = result;
    else if (!seasonalOn) return result;
    else codeError = result.message;
  }

  if (seasonalOn) {
    const seasonalFinal = seasonalPriceFor(originalPrice);
    if (!fromCode || fromCode.finalPrice >= seasonalFinal) {
      const { data } = await admin.from("promo_codes").select("id, code").ilike("code", SEASONAL_PROMO.code).maybeSingle();
      return {
        ok: true,
        originalPrice,
        discountAmount: round2(originalPrice - seasonalFinal),
        finalPrice: seasonalFinal,
        free: false,
        promoId: (data as { id: string } | null)?.id ?? null,
        code: (data as { code: string } | null)?.code ?? SEASONAL_PROMO.code,
        discountType: "percentage",
        seasonal: true,
        codeOutdone: fromCode !== null,
        codeError,
      };
    }
  }

  if (fromCode) {
    return {
      ok: true,
      originalPrice,
      discountAmount: fromCode.discountAmount,
      finalPrice: fromCode.finalPrice,
      free: fromCode.free,
      promoId: fromCode.promo.id,
      code: fromCode.promo.code,
      discountType: fromCode.promo.discount_type,
      seasonal: false,
      codeOutdone: false,
      codeError: null,
    };
  }

  return {
    ok: true, originalPrice, discountAmount: 0, finalPrice: originalPrice, free: false,
    promoId: null, code: null, discountType: null, seasonal: false, codeOutdone: false, codeError: null,
  };
};
