// Visitors who came from a candle ad (utm_campaign with "svijec", e.g. svijeca_svisveti_2026) or
// landed on a candle page. Read from the landing snapshot in memory, so it holds while they browse
// on and nothing is written to the device.
import { landingParams } from '@/lib/landing';

const CANDLE_CAMPAIGN_RE = /svijec|svijeć|candle/i;

const landingPath = typeof window === 'undefined' ? '' : window.location.pathname;

export const isCandlePath = (p: string) => p.startsWith('/zapali-svijecu') || p.startsWith('/virtualne-svijece');

/** True for a visitor who arrived from a candle ad or on a candle page. */
export const isCandleVisitor = (): boolean =>
  CANDLE_CAMPAIGN_RE.test(landingParams().get('utm_campaign') ?? '') || isCandlePath(landingPath);
