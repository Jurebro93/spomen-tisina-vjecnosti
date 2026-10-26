// Time-limited site-wide memorial discount (e.g. Svi sveti). While it runs the code is
// applied automatically at checkout and a notice bar shows the reduced price.
// The server still validates the code and decides the amount (promo_codes.expires_at).
import { landingParams } from '@/lib/landing';
import { MEMORIAL_PRICE_EUR } from '@/lib/memorial';

export interface SeasonalPromo {
  code: string;
  /** Shown in the notice bar, e.g. "Svi sveti". */
  occasion: string;
  /** Last day as written for visitors. */
  untilLabel: string;
  startsAt: number;
  endsAt: number;
  percent: number;
}

export const SEASONAL_PROMO: SeasonalPromo = {
  code: 'SVISVETI50',
  occasion: 'Svi sveti',
  untilLabel: '2. studenoga',
  startsAt: Date.parse('2026-10-26T23:00:00Z'), // 27. 10. 00:00 Zagreb
  endsAt: Date.parse('2026-11-02T22:59:59Z'), // 2. 11. 23:59 Zagreb
  percent: 50,
};

/** Code from the landing URL (?kod=...), e.g. from an ad or an e-mail link. */
const landingCode = (): string | null => {
  const code = landingParams().get('kod')?.trim();
  return code ? code.slice(0, 40) : null;
};

/** The running promo, or null. A ?kod= link with the promo code also previews it before the start. */
export const activeSeasonalPromo = (now = Date.now()): SeasonalPromo | null => {
  const p = SEASONAL_PROMO;
  if (now > p.endsAt) return null;
  if (now >= p.startsAt) return p;
  return landingCode()?.toUpperCase() === p.code ? p : null;
};

export const seasonalPrice = (promo: SeasonalPromo) =>
  Math.round(MEMORIAL_PRICE_EUR * (100 - promo.percent)) / 100;

/** Code to apply at checkout without typing: the one from the link, else the running promo. */
export const autoPromoCode = (): string | null => landingCode() ?? activeSeasonalPromo()?.code ?? null;
