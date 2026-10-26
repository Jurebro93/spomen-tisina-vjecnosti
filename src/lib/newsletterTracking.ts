import { hasConsent } from '@/lib/consent';
import { trackEvent } from '@/lib/metaPixel';

/**
 * One e-mail signup (newsletter widget, footer, homepage or the discount popup).
 * GA4 gets a `newsletter_signup` dataLayer event with analytics consent; Meta gets the
 * custom `NewsletterSignup` event with marketing consent, plus the standard `Subscribe` event:
 * the dataset's restriction drops NewsletterSignup as unverified, so ad sets optimise on Subscribe.
 */
export const trackNewsletterSignup = (placement: string, variant?: string, eventId?: string) => {
  if (typeof window === 'undefined') return;
  if (hasConsent('analytics')) {
    const w = window as Window & { dataLayer?: unknown[] };
    w.dataLayer = w.dataLayer ?? [];
    w.dataLayer.push({
      event: 'newsletter_signup',
      newsletter_placement: placement,
      newsletter_variant: variant,
      page_path: window.location.pathname,
    });
  }
  trackEvent('NewsletterSignup', { content_name: 'Newsletter', placement }, eventId);
  trackEvent('Subscribe', { content_name: 'Newsletter', placement }, eventId);
};
