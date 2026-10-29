// The one place for the time-limited memorial discount (Svi sveti): code, percentage and dates.
// Used by the edge functions, which decide the Stripe amount, and by the website (src/lib/seasonalPromo.ts)
// for the banner and the displayed price. Keep this file free of imports so both runtimes can load it.

export interface SeasonalPromoConfig {
  /** promo_codes row the discount is recorded under (usage stats, orders). Buyers never have to type it. */
  code: string;
  /** Shown in the notice bar, e.g. "Svi sveti". */
  occasion: string;
  /** Last day as written for visitors. */
  untilLabel: string;
  /** First moment the discount applies (UTC ms). */
  startsAt: number;
  /** First moment the discount no longer applies (UTC ms). */
  endsAt: number;
  percent: number;
}

export const SEASONAL_PROMO: SeasonalPromoConfig = {
  code: "SVISVETI50",
  occasion: "Svi sveti",
  untilLabel: "2. studenoga",
  startsAt: Date.parse("2026-10-27T00:00:00+01:00"), // 27. 10. 2026. 00:00 Zagreb
  endsAt: Date.parse("2026-11-03T00:00:00+01:00"), // 3. 11. 2026. 00:00 Zagreb, regular price again
  percent: 50,
};

export const isSeasonalPromoRunning = (now = Date.now(), promo = SEASONAL_PROMO) =>
  now >= promo.startsAt && now < promo.endsAt;

/** Price after the seasonal discount, rounded to cents (39 € → 19.50 €). */
export const seasonalPriceFor = (basePrice: number, promo = SEASONAL_PROMO) =>
  Math.round(basePrice * (100 - promo.percent)) / 100;
