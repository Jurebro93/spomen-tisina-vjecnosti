// Linker.hr conversion pixel (advertiser 1239): an invisible 1×1 image request per paid order.
// Fired only after the backend confirmed the Stripe payment, only with marketing consent,
// only on the live site, and at most once per Stripe Checkout session (localStorage flag).
import { hasAdvertisingConsent } from '@/lib/metaPixel';

const ADVERTISER_ID = '1239';
const PRODUCTION_HOST = /^(www\.)?osmrtnica\.com\.hr$/;

export type LinkerEvent = 'memorijal_kupnja' | 'svijeca_kupnja';

const firedKey = (sessionId: string) => `linker_conv_${sessionId}`;

const alreadyFired = (key: string) => {
  try {
    return Boolean(localStorage.getItem(key) || sessionStorage.getItem(key));
  } catch { return false; }
};

const markFired = (key: string) => {
  try { localStorage.setItem(key, '1'); } catch {
    try { sessionStorage.setItem(key, '1'); } catch { /* storage blocked */ }
  }
};

/** amountEur is the amount Stripe charged, e.g. 19.5 → cost=19.50. */
export const trackLinkerConversion = (event: LinkerEvent, sessionId: string, amountEur: number) => {
  if (typeof window === 'undefined' || !PRODUCTION_HOST.test(window.location.hostname)) return;
  if (!sessionId || !Number.isFinite(amountEur) || amountEur <= 0) return;
  if (!hasAdvertisingConsent()) return;
  const key = firedKey(sessionId);
  if (alreadyFired(key)) return;
  markFired(key);

  const img = new Image(1, 1);
  img.alt = '';
  img.style.display = 'none';
  img.src = `https://d.linker.hr/c?a=${ADVERTISER_ID}&event=${event}&cost=${amountEur.toFixed(2)}`;
};
