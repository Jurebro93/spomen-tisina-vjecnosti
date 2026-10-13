// Cookie / tracking consent by category. Necessary is always on; the rest default to off.
export type ConsentCategory = 'analytics' | 'marketing';
export interface ConsentState { analytics: boolean; marketing: boolean; decidedAt: string }

const KEY = 'cookieConsentCategories';
const LEGACY = 'cookieConsent';
export const CONSENT_MAX_AGE_MS = 365 * 86400_000;
export const CONSENT_CHANGED = 'cookie-consent-changed';

export const readConsent = (): ConsentState | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const c = JSON.parse(raw) as ConsentState;
      if (Date.now() - new Date(c.decidedAt).getTime() > CONSENT_MAX_AGE_MS) return null;
      return c;
    }
    const legacy = localStorage.getItem(LEGACY);
    if (legacy === 'accepted') return { analytics: true, marketing: true, decidedAt: new Date().toISOString() };
    if (legacy === 'declined') return { analytics: false, marketing: false, decidedAt: new Date().toISOString() };
  } catch { /* storage unavailable */ }
  return null;
};

export const hasConsent = (cat: ConsentCategory) => readConsent()?.[cat] === true;

type Gtag = (...args: unknown[]) => void;
const pushGoogleConsent = (c: { analytics: boolean; marketing: boolean }) => {
  const w = window as Window & { dataLayer?: unknown[]; gtag?: Gtag };
  w.dataLayer = w.dataLayer ?? [];
  // eslint-disable-next-line prefer-rest-params
  const gtag: Gtag = w.gtag ?? function () { w.dataLayer!.push(arguments); };
  gtag('consent', 'update', {
    analytics_storage: c.analytics ? 'granted' : 'denied',
    ad_storage: c.marketing ? 'granted' : 'denied',
    ad_user_data: c.marketing ? 'granted' : 'denied',
    ad_personalization: c.marketing ? 'granted' : 'denied',
  });
  w.dataLayer.push({ event: 'consent_updated', analytics: c.analytics, marketing: c.marketing });
};

export const saveConsent = (c: { analytics: boolean; marketing: boolean }) => {
  const state: ConsentState = { ...c, decidedAt: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    // Legacy flag read by older code paths: "accepted" only when marketing is allowed.
    localStorage.setItem(LEGACY, c.marketing && c.analytics ? 'accepted' : 'declined');
  } catch { /* ignore */ }
  pushGoogleConsent(c);
  window.dispatchEvent(new Event(CONSENT_CHANGED));
};
