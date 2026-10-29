// Linker.hr pixels, both invisible 1×1 image requests sent only on the live site with marketing consent.
// - Conversion (advertiser 1239): per paid order, fired only after the backend confirmed the Stripe
//   payment, at most once per Stripe Checkout session (localStorage flag).
// - Retargeting (campaign 748): once per view of a memorial page, see LINKER_RETARGETING_PATHS.
import { hasAdvertisingConsent } from '@/lib/metaPixel';

const ADVERTISER_ID = '1239';
const RETARGETING_CAMPAIGN = '748';
const PRODUCTION_HOST = /^(www\.)?osmrtnica\.com\.hr$/;

/** Live site + marketing consent: the condition shared by every Linker request. */
const canSendLinker = () =>
  typeof window !== 'undefined' && PRODUCTION_HOST.test(window.location.hostname) && hasAdvertisingConsent();

const sendPixel = (src: string) => {
  const img = new Image(1, 1);
  img.alt = '';
  img.style.display = 'none';
  img.src = src;
};

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
  if (!sessionId || !Number.isFinite(amountEur) || amountEur <= 0) return;
  if (!canSendLinker()) return;
  const key = firedKey(sessionId);
  if (alreadyFired(key)) return;
  markFired(key);
  sendPixel(`https://d.linker.hr/c?a=${ADVERTISER_ID}&event=${event}&cost=${amountEur.toFixed(2)}`);
};

/** Memorial pages that build the retargeting audience. Payment, thank-you and edit pages never do. */
const LINKER_RETARGETING_PATHS = [/^\/digitalni-memorijal(\/|$)/, /^\/kreiraj-memorijal\/?$/, /^\/memorijal-primjer\/[^/]+/, /^\/memorijal\/[^/]+\/?$/];
const EXCLUDED_SEGMENTS = /\/(placanje|zahvaljujemo|uspjeh|success|potvrda|uredi)(\/|$)/;

export const isLinkerRetargetingPath = (pathname: string) =>
  !EXCLUDED_SEGMENTS.test(pathname) && LINKER_RETARGETING_PATHS.some((re) => re.test(pathname));

let lastRetargetedView: string | null = null;

/**
 * Sends the retargeting pixel at most once per route view. viewKey identifies the view
 * (react-router's location.key), so re-renders and StrictMode re-runs don't send it twice,
 * while a later consent on the same view still sends it once.
 */
export const fireLinkerRetargeting = (pathname: string, viewKey: string) => {
  if (lastRetargetedView === viewKey || !isLinkerRetargetingPath(pathname) || !canSendLinker()) return;
  lastRetargetedView = viewKey;
  sendPixel(`https://d.linker.hr/m?campaign=${RETARGETING_CAMPAIGN}&_=${Date.now()}`);
};
