import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatEur } from '@/lib/promo';
import { trackFunnel } from '@/lib/funnel';
import { trackGa4CandlePurchase } from '@/lib/ga4Ecommerce';
import { trackLinkerConversion } from '@/lib/linkerPixel';

/** Paid candle plans. Keep in sync with supabase/functions/_shared/candles.ts */
export const CANDLE_PLANS = [
  { days: 7, price: 3.99 },
  { days: 14, price: 5.99 },
  { days: 30, price: 9.99 },
] as const;

export type CandleDays = (typeof CANDLE_PLANS)[number]['days'];

export const DEFAULT_CANDLE_DAYS: CandleDays = 7;

export const candlePriceLabel = (days: CandleDays) =>
  formatEur(CANDLE_PLANS.find((p) => p.days === days)?.price ?? CANDLE_PLANS[0].price);

/** Short line for texts: "7 dana 3,99 €, 14 dana 5,99 € ili 30 dana 9,99 €". */
export const CANDLE_PRICES_TEXT = CANDLE_PLANS
  .map((p) => `${p.days} dana ${formatEur(p.price)}`)
  .join(', ')
  .replace(/, ([^,]*)$/, ' ili $1');

type CheckoutBody =
  | { kind: 'obituary'; days: CandleDays; pokojnikIme: string; pokojnikPrezime: string; zapalioIme: string; zapalioEmail: string; poruka?: string }
  | { kind: 'obituary'; days: CandleDays; relightCandleId: string }
  | { kind: 'memorial'; days: CandleDays; memorialId: string; visitorName?: string; email: string; message?: string };

/** Opens Stripe Checkout; the visitor comes back to the current page. */
export const startCandleCheckout = async (body: CheckoutBody) => {
  const returnPath = window.location.pathname + window.location.search;
  void trackFunnel('candle_checkout', { once: false });
  const { data, error } = await supabase.functions.invoke('create-candle-payment', { body: { ...body, returnPath } });
  if (error || !data?.url) {
    let message = 'Plaćanje trenutno nije moguće pokrenuti. Pokušajte ponovno.';
    try {
      const ctx = (error as { context?: Response } | null)?.context;
      const parsed = ctx ? await ctx.json() : data;
      if (parsed?.error) message = parsed.error;
    } catch { /* keep the generic message */ }
    throw new Error(message);
  }
  window.location.href = data.url;
};

export type CandlePaymentResult =
  | { status: 'paid'; name?: string; days?: number; expiresAt?: string }
  | { status: 'pending' }
  | { status: 'cancelled' }
  | { status: 'error' };

/**
 * After Stripe sends the visitor back (?svijeca=placeno&session_id=… or ?svijeca=otkazano),
 * confirms the payment once and removes the parameters from the address bar.
 */
export const useCandlePaymentReturn = (onResult: (result: CandlePaymentResult) => void) => {
  const handled = useRef(false);
  const callback = useRef(onResult);
  callback.current = onResult;

  useEffect(() => {
    if (handled.current) return;
    const params = new URLSearchParams(window.location.search);
    const state = params.get('svijeca');
    if (!state) return;
    handled.current = true;
    const sessionId = params.get('session_id');
    params.delete('svijeca');
    params.delete('session_id');
    const rest = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash);

    if (state === 'otkazano') { callback.current({ status: 'cancelled' }); return; }
    if (state !== 'placeno' || !sessionId) return;

    const verify = async (attempt: number): Promise<void> => {
      const { data, error } = await supabase.functions.invoke('verify-candle-payment', { body: { session_id: sessionId } });
      if (error) { callback.current({ status: 'error' }); return; }
      if (data?.paid && data?.lit) {
        const plan = CANDLE_PLANS.find((p) => p.days === data.days);
        if (plan) trackGa4CandlePurchase(sessionId, plan.price, plan.days);
        void trackFunnel('candle_paid', { once: false });
        if (data.currency === 'EUR') trackLinkerConversion('svijeca_kupnja', sessionId, Number(data.amount));
        callback.current({ status: 'paid', name: data.name, days: data.days, expiresAt: data.expires_at });
        return;
      }
      // Some payment methods confirm a few seconds later.
      if (attempt < 3) { await new Promise((r) => setTimeout(r, 2500)); return verify(attempt + 1); }
      callback.current({ status: 'pending' });
    };
    void verify(0);
  }, []);
};
