// Time-limited site-wide memorial discount (e.g. Svi sveti). While it runs a notice bar shows the
// reduced price and the code is pre-filled at checkout for display. The server applies the discount
// by date on its own (create-memorial-payment), with or without a code.
import { landingParams } from '@/lib/landing';
import { MEMORIAL_PRICE_EUR, MEMORIAL_PRICE_LABEL } from '@/lib/memorial';
import { formatEur } from '@/lib/promo';

// Code, percentage and dates live in one file shared with the edge functions.
import { SEASONAL_PROMO, isSeasonalPromoRunning, seasonalPriceFor, type SeasonalPromoConfig } from '../../supabase/functions/_shared/seasonalPromo.ts';

export type SeasonalPromo = SeasonalPromoConfig;
export { SEASONAL_PROMO };

/** Code from the landing URL (?kod=...), e.g. from an ad or an e-mail link. */
const landingCode = (): string | null => {
  const code = landingParams().get('kod')?.trim();
  return code ? code.slice(0, 40) : null;
};

/** The running promo, or null. Same dates as the server, so the shown price is the charged one. */
export const activeSeasonalPromo = (now = Date.now()): SeasonalPromo | null =>
  isSeasonalPromoRunning(now) ? SEASONAL_PROMO : null;

export const seasonalPrice = (promo: SeasonalPromo) => seasonalPriceFor(MEMORIAL_PRICE_EUR, promo);

/** Code to apply at checkout without typing: the one from the link, else the running promo. */
export const autoPromoCode = (): string | null => landingCode() ?? activeSeasonalPromo()?.code ?? null;

/** Memorial price right now: the seasonal price while a promo runs, else the regular one. */
export const currentMemorialPrice = (): number => {
  const promo = activeSeasonalPromo();
  return promo ? seasonalPrice(promo) : MEMORIAL_PRICE_EUR;
};

/** Memorial price as shown to visitors right now: the seasonal price while a promo runs. */
export const currentMemorialPriceLabel = (): string => {
  const promo = activeSeasonalPromo();
  return promo ? formatEur(seasonalPrice(promo)) : MEMORIAL_PRICE_LABEL;
};
