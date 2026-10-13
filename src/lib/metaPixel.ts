import { hasConsent } from '@/lib/consent';
/**
 * Meta (Facebook) Pixel helper.
 *
 * - The pixel is initialised exactly once, and only after the visitor accepted cookies.
 * - PageView is sent on the first load and on every SPA route change, with de-duplication
 *   so the same URL never reports PageView twice in a row.
 * - No access tokens or other secrets live in the frontend; only the public Pixel ID.
 */

export const META_PIXEL_ID = '2915138225551446';
export const CONSENT_EVENT = 'cookie-consent-changed';

type FbqFn = ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown; callMethod?: (...args: unknown[]) => void };

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
  }
}

let initialised = false;
let lastPageViewUrl: string | null = null;

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

/** Initialises the pixel once and sends the first PageView. */
export const initMetaPixel = () => {
  if (initialised || typeof window === 'undefined') return;
  if (!hasAdvertisingConsent()) return;

  loadBaseCode();
  window.fbq?.('init', META_PIXEL_ID);
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

export const trackEvent = (
  event: string,
  params?: Record<string, unknown>,
  /** Shared with the server-side Conversions API so Meta de-duplicates the same event. */
  eventId?: string,
) => {
  if (typeof window === 'undefined') return;
  if (!initialised) initMetaPixel();
  if (!initialised) return;
  // Preview-only: mirror ViewContent to Conversions API with a shared event_id.
  if (event === 'ViewContent' && window.location.hostname === 'spomen-tisina-vjecnosti.lovable.app') {
    const vcId = eventId ?? `vc_${crypto.randomUUID()}`;
    window.fbq?.('track', event, params, { eventID: vcId });
    void import('@/integrations/supabase/client').then(({ supabase }) =>
      supabase.functions.invoke('meta-capi-viewcontent', {
        body: { event_id: vcId, params, url: window.location.href },
      }),
    ).catch(() => {});
    return;
  }
  if (eventId) window.fbq?.('track', event, params, { eventID: eventId });
  else window.fbq?.('track', event, params);
};

/** Stable Purchase event id for a Stripe checkout session (must match the backend). */
export const purchaseEventId = (sessionId: string) => `purchase_${sessionId}`;
