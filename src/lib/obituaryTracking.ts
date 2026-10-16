// Obituary page tracking: pushes GTM dataLayer events (GTM forwards them to GA4).
// Sent only with analytics consent, like the other dataLayer events on the site.
import { hasConsent } from '@/lib/consent';

export type ObituaryEvent =
  | 'obituary_view'
  | 'obituary_candle_click'
  | 'obituary_candle_relight'
  | 'obituary_memorial_click'
  | 'obituary_memory_submit';

export interface ObituaryContext {
  id?: string;
  slug?: string;
  mjesto_smrti?: string | null;
}

// Place fields sometimes hold HTML; keep only the plain town name.
const plainCity = (value?: string | null) =>
  (value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || undefined;

export const trackObituaryEvent = (
  event: ObituaryEvent,
  obituary: ObituaryContext | null | undefined,
  extra: Record<string, string | undefined> = {},
) => {
  if (typeof window === 'undefined' || !hasConsent('analytics')) return;
  const w = window as Window & { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push({
    event,
    obituary_id: obituary?.id,
    obituary_slug: obituary?.slug,
    obituary_city: plainCity(obituary?.mjesto_smrti),
    ...extra,
  });
};
