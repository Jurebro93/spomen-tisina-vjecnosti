// Memorial sales funnel for GA4: pushes GTM dataLayer events (GTM forwards them to GA4).
// Uses GA4's recommended ecommerce names so revenue shows in GA4's monetisation reports.
// Sent only on the production domain and with analytics consent, like the other dataLayer events.
import { hasConsent } from '@/lib/consent';

const ITEM = { item_id: 'digitalni-memorijal', item_name: 'Digitalni memorijal', item_category: 'memorial' };

/** GTM only loads on the live site (index.html), so editor/preview traffic never reaches GA4. */
const PRODUCTION_HOST = /^(www\.)?osmrtnica\.com\.hr$/;

const push = (payload: Record<string, unknown>) => {
  if (typeof window === 'undefined' || !PRODUCTION_HOST.test(window.location.hostname)) return;
  if (!hasConsent('analytics')) return;
  const w = window as Window & { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer ?? [];
  // Clear the previous ecommerce object so values never leak between events.
  if ('ecommerce' in payload) w.dataLayer.push({ ecommerce: null });
  w.dataLayer.push(payload);
};

/** Pushes an event at most once per browser tab session for the given key. */
const once = (key: string, send: () => void) => {
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch { /* storage blocked: send anyway, GA4 de-duplicates purchase by transaction_id */ }
  send();
};

/** First real action in the memorial form: a person search or the manual entry for a new person. */
export const trackGa4PersonSearch = (method: 'search' | 'manual') =>
  once(`ga4_person_search_${method}`, () => push({ event: 'memorial_person_search', method }));

/** The person was chosen from the obituaries or saved as a new person; the wizard opens. */
export const trackGa4PersonSelected = (personSource: 'existing' | 'new') =>
  once('ga4_person_selected', () => push({ event: 'memorial_person_selected', person_source: personSource }));

/** A memorial draft was created. */
export const trackGa4MemorialStarted = (memorialId: string) =>
  once(`ga4_memorial_started_${memorialId}`, () => push({ event: 'memorial_started', memorial_id: memorialId }));

/** The buyer is about to be sent to Stripe Checkout. */
export const trackGa4BeginCheckout = (memorialId: string, value: number) =>
  push({
    event: 'begin_checkout',
    memorial_id: memorialId,
    ecommerce: { currency: 'EUR', value, items: [{ ...ITEM, price: value, quantity: 1 }] },
  });

/** Stripe payment confirmed by the backend. transaction_id is the Stripe Checkout session id. */
export const trackGa4Purchase = (sessionId: string, value: number, currency: string, memorialId?: string | null) =>
  once(`ga4_purchase_${sessionId}`, () =>
    push({
      event: 'purchase',
      memorial_id: memorialId ?? undefined,
      ecommerce: {
        transaction_id: sessionId,
        currency,
        value,
        items: [{ ...ITEM, price: value, quantity: 1 }],
      },
    }),
  );

/** Memorial activated with a 100 % promo code: no revenue, so it is not a GA4 purchase. */
export const trackGa4FreeActivation = (memorialId: string, promoCode?: string | null) =>
  once(`ga4_free_activation_${memorialId}`, () =>
    push({ event: 'memorial_free_activation', memorial_id: memorialId, promo_code: promoCode ?? undefined }),
  );

/** Paid candle confirmed by the backend. Same GA4 purchase event as memorials, told apart by the item. */
export const trackGa4CandlePurchase = (sessionId: string, value: number, days: number) =>
  once(`ga4_purchase_${sessionId}`, () =>
    push({
      event: 'purchase',
      ecommerce: {
        transaction_id: sessionId,
        currency: 'EUR',
        value,
        items: [{ item_id: `svijeca-${days}`, item_name: 'Virtualna svijeća', item_category: 'candle', item_variant: `${days} dana`, price: value, quantity: 1 }],
      },
    }),
  );
