import { hasConsent } from '@/lib/consent';
import { LANDED_AT, landingFbclid } from '@/lib/landing';
/**
 * Meta (Facebook) Pixel helper.
 *
 * - The pixel is initialised exactly once, and only after the visitor accepted cookies.
 * - PageView is sent on the first load and on every SPA route change, with de-duplication
 *   so the same URL never reports PageView twice in a row.
 * - Signed-in visitors are matched by hashed e-mail and account id (advanced matching).
 * - No access tokens or other secrets live in the frontend; only the public Pixel ID.
 */

export const META_PIXEL_ID = '2915138225551446';
export const CONSENT_EVENT = 'cookie-consent-changed';
/** The pixel runs only on the live site: editor, preview and test domains never send ad data. */
const PRODUCTION_HOSTS = ['osmrtnica.com.hr', 'www.osmrtnica.com.hr'];

type FbqFn = ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown; callMethod?: (...args: unknown[]) => void };

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
  }
}

let initialised = false;
let lastPageViewUrl: string | null = null;
/** Advanced matching for signed-in visitors (SHA-256 hashed, same values the Conversions API sends). */
let matchData: { em?: string; external_id?: string } = {};

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
};

/** Remembers the signed-in account so the pixel is initialised with it. Call before initMetaPixel. */
export const setMetaUser = async (user: { id: string; email?: string | null } | null) => {
  if (!user || typeof crypto === 'undefined' || !crypto.subtle) {
    matchData = {};
    return;
  }
  const email = user.email?.trim().toLowerCase();
  matchData = {
    external_id: await sha256Hex(user.id),
    ...(email ? { em: await sha256Hex(email) } : {}),
  };
};

export const hasAdvertisingConsent = () => {
  if (typeof window === 'undefined') return false;
  return hasConsent('marketing');
};

/** Official Meta Pixel base code, wrapped so it can only run once. */
const loadBaseCode = () => {
  if (typeof window === 'undefined' || window.fbq) return;

  const n: FbqFn = function (...args: unknown[]) {
    if (n.callMethod) n.callMethod(...args);
    else (n.queue as unknown[]).push(args);
  } as FbqFn;

  window.fbq = n;
  if (!window._fbq) window._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);
};

/**
 * The pixel only sets _fbc when fbclid is in the URL at init. Consent often comes after the
 * visitor has navigated away from the ad's landing URL, so set it from the landing snapshot.
 */
const storeClickId = () => {
  const fbclid = landingFbclid();
  if (!fbclid || readCookie('_fbc')) return;
  const value = `fb.1.${LANDED_AT}.${fbclid}`;
  document.cookie = `_fbc=${encodeURIComponent(value)}; path=/; max-age=${90 * 86400}; SameSite=Lax; Secure`;
};

/** Initialises the pixel once and sends the first PageView. */
export const initMetaPixel = () => {
  if (initialised || typeof window === 'undefined') return;
  if (!PRODUCTION_HOSTS.includes(window.location.hostname)) return;
  if (!hasAdvertisingConsent()) return;

  storeClickId();
  loadBaseCode();
  window.fbq?.('init', META_PIXEL_ID, matchData);
  initialised = true;
  trackPageView();
};

export const trackPageView = (url?: string) => {
  if (!initialised || typeof window === 'undefined') return;
  const current = url ?? window.location.pathname + window.location.search;
  if (current === lastPageViewUrl) return;
  lastPageViewUrl = current;
  window.fbq?.('track', 'PageView');
};

const STANDARD_EVENTS = new Set(['PageView', 'ViewContent', 'Lead', 'CompleteRegistration', 'InitiateCheckout', 'Purchase']);

export const trackEvent = (
  event: string,
  params?: Record<string, unknown>,
  /** Shared with the server-side Conversions API so Meta de-duplicates the same event. */
  eventId?: string,
) => {
  if (typeof window === 'undefined') return;
  if (!initialised) initMetaPixel();
  if (!initialised) return;
  // Custom (non-standard) events must go through trackCustom.
  const method = STANDARD_EVENTS.has(event) ? 'track' : 'trackCustom';
  if (eventId) window.fbq?.(method, event, params, { eventID: eventId });
  else window.fbq?.(method, event, params);
};

/** Stable Purchase event id for a Stripe checkout session (must match the backend). */
export const purchaseEventId = (sessionId: string) => `purchase_${sessionId}`;

function readCookie(name: string) {
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
};

/**
 * Pixel cookies that let Meta match server (Conversions API) events to the ad click.
 * Empty without marketing consent. Falls back to the fbclid in the URL when _fbc is not set yet.
 */
export const metaBrowserIds = (): { fbp?: string; fbc?: string } => {
  if (typeof window === 'undefined' || !hasAdvertisingConsent()) return {};
  const fbp = readCookie('_fbp') ?? undefined;
  let fbc = readCookie('_fbc') ?? undefined;
  const fbclid = landingFbclid();
  if (!fbc && fbclid) fbc = `fb.1.${LANDED_AT}.${fbclid}`;
  return { fbp, fbc };
};

/**
 * InitiateCheckout in the browser; returns the shared event_id and browser ids for
 * create-memorial-payment, which mirrors it to Conversions API and stores the ids for Purchase.
 */
export const trackInitiateCheckout = (memorialId: string, value: number) => {
  const eventId = `ic_${memorialId.replace(/[^A-Za-z0-9-]/g, '')}_${Date.now()}`;
  trackEvent('InitiateCheckout', {
    content_name: 'Digitalni memorijal',
    content_type: 'product',
    content_ids: [memorialId],
    currency: 'EUR',
    value,
  }, eventId);
  return { event_id: eventId, source_url: window.location.href, ...metaBrowserIds() };
};

/** Lead = a memorial draft was created. Browser pixel + Conversions API with one event_id. */
export const trackMemorialStarted = (memorialId: string) => {
  if (typeof window === 'undefined' || !hasAdvertisingConsent()) return;
  const eventId = `lead_${memorialId}`;
  trackEvent('Lead', { content_name: 'Digitalni memorijal', content_ids: [memorialId] }, eventId);
  if (!PRODUCTION_HOSTS.includes(window.location.hostname)) return;
  void import('@/integrations/supabase/client').then(({ supabase }) =>
    supabase.functions.invoke('meta-capi-event', {
      body: {
        event_name: 'Lead',
        event_id: eventId,
        memorial_id: memorialId,
        marketing_consent: true,
        source_url: window.location.href,
        ...metaBrowserIds(),
      },
    }),
  ).catch(() => {});
};

/**
 * StartMemorial = the visitor chose the person and opened the memorial form (signed in or guest).
 * Custom event the AON ad sets optimise for; browser pixel + Conversions API share one event_id per account.
 */
export const trackStartMemorial = (userId: string) => {
  if (typeof window === 'undefined' || !hasAdvertisingConsent()) return;
  const eventId = `start_${userId}`;
  trackEvent('StartMemorial', { content_name: 'Digitalni memorijal' }, eventId);
  if (!PRODUCTION_HOSTS.includes(window.location.hostname)) return;
  void import('@/integrations/supabase/client').then(({ supabase }) =>
    supabase.functions.invoke('meta-capi-event', {
      body: {
        event_name: 'StartMemorial',
        event_id: eventId,
        marketing_consent: true,
        source_url: window.location.href,
        ...metaBrowserIds(),
      },
    }),
  ).catch(() => {});
};
