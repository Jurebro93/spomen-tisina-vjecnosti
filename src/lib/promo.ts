import { supabase } from '@/integrations/supabase/client';

export type PromoDiscountType = 'percentage' | 'fixed' | 'free';
export type PromoProductType = 'memorial' | 'obituary' | 'both';

export interface PromoCode {
  id: string;
  code: string;
  discount_type: PromoDiscountType;
  discount_value: number;
  product_type: PromoProductType;
  active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  max_uses_per_user: number;
  current_uses: number;
  created_by_admin_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromoUsage {
  id: string;
  promo_code_id: string;
  user_id: string | null;
  order_id: string | null;
  product_type: string;
  original_price: number;
  discount_amount: number;
  final_price: number;
  used_at: string;
}

/** Result of a server-side validation — the only source of prices in the UI. */
export interface AppliedPromo {
  code: string;
  discount_type: PromoDiscountType;
  original_price: number;
  discount_amount: number;
  final_price: number;
  free: boolean;
}

export const DISCOUNT_TYPE_LABELS: Record<PromoDiscountType, string> = {
  percentage: 'Postotni popust',
  fixed: 'Fiksni popust',
  free: 'Besplatno (100 %)',
};

export const PRODUCT_TYPE_LABELS: Record<PromoProductType, string> = {
  memorial: 'Digitalni memorijal',
  obituary: 'Osmrtnica',
  both: 'Oboje',
};

export const formatEur = (value: number) =>
  `${Number(value ?? 0).toFixed(2).replace('.', ',')} €`;

export const discountValueLabel = (promo: Pick<PromoCode, 'discount_type' | 'discount_value'>) => {
  if (promo.discount_type === 'free') return '100 %';
  if (promo.discount_type === 'percentage') return `${Number(promo.discount_value)} %`;
  return formatEur(Number(promo.discount_value));
};

export type PromoStatus = 'active' | 'inactive' | 'expired' | 'limit_reached';

export const PROMO_STATUS_LABELS: Record<PromoStatus, string> = {
  active: 'Aktivan',
  inactive: 'Neaktivan',
  expired: 'Istekao',
  limit_reached: 'Dosegnut limit',
};

export const promoStatus = (promo: PromoCode): PromoStatus => {
  if (!promo.active) return 'inactive';
  if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) return 'expired';
  if (promo.max_uses !== null && (promo.current_uses ?? 0) >= promo.max_uses) return 'limit_reached';
  return 'active';
};

/** Generates a readable, unique-ish promo code suggestion. */
export const generatePromoCode = (prefix = 'PROMO') => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  bytes.forEach((b) => { suffix += alphabet[b % alphabet.length]; });
  return `${prefix}${suffix}`;
};

/** Asks the server to validate the code and compute the price. */
export const applyPromoCode = async (
  code: string,
  productType: 'memorial' | 'obituary'
): Promise<{ valid: boolean; message: string; applied?: AppliedPromo }> => {
  const { data, error } = await supabase.functions.invoke('validate-promo-code', {
    body: { code, product_type: productType },
  });
  if (error) return { valid: false, message: 'Provjera promo koda trenutno nije moguća.' };
  if (!data?.valid) return { valid: false, message: data?.message ?? 'Promo kod nije pronađen.' };
  return {
    valid: true,
    message: data.message ?? 'Promo kod je uspješno primijenjen.',
    applied: {
      code: data.code,
      discount_type: data.discount_type,
      original_price: Number(data.original_price),
      discount_amount: Number(data.discount_amount),
      final_price: Number(data.final_price),
      free: Boolean(data.free),
    },
  };
};
