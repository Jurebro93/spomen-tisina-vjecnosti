// Blog conversion tracking: blog_events (admin report) + GTM dataLayer + Meta Pixel custom events.
// Attribution rule (last blog click, 30 days): a purchase is attributed to a blog only if the
// visitor clicked a memorial CTA/link in that blog within 30 days before starting checkout.
import { supabase } from '@/integrations/supabase/client';
import { hasConsent } from '@/lib/consent';
import { hasAdvertisingConsent } from '@/lib/metaPixel';
import { isBot } from '@/lib/isBot';

export type BlogEvent = 'view' | 'cta_click' | 'link_click' | 'interactive' | 'start_create';

const TOUCH_KEY = 'osm_blog_touch';
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type BlogTouch = { slug: string; cta: string; at: number };

const device = () => {
  const w = window.innerWidth;
  return w < 768 ? 'mobile' : w < 1100 ? 'tablet' : 'desktop';
};

const visitorId = (): string | null => {
  if (!hasConsent('analytics')) return null;
  try {
    let id = localStorage.getItem('osm_vid');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('osm_vid', id); }
    return id;
  } catch { return null; }
};

const PIXEL_EVENT: Partial<Record<BlogEvent, string>> = {
  cta_click: 'BlogCtaClick', link_click: 'BlogCtaClick', interactive: 'BlogInteraction',
};

export function trackBlog(event: BlogEvent, slug: string, ctaId?: string | null) {
  if (!slug || isBot()) return;
  if (event === 'view') {
    try {
      const k = `osm_bv_${slug}`;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, '1');
    } catch { /* ignore */ }
  }
  void supabase.from('blog_events' as never).insert({
    blog_slug: slug.slice(0, 200), event, cta_id: ctaId ? ctaId.slice(0, 80) : null,
    visitor_id: visitorId(), device: device(),
  } as never).then(() => undefined, () => undefined);

  try {
    const w = window as unknown as { dataLayer?: unknown[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event: `blog_${event}`, blog_slug: slug, blog_cta: ctaId ?? undefined });
  } catch { /* ignore */ }

  const pixel = PIXEL_EVENT[event];
  if (pixel && hasAdvertisingConsent()) {
    try {
      (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq?.('trackCustom', pixel, { blog_slug: slug, blog_cta: ctaId });
    } catch { /* ignore */ }
  }
}

/** Records a click that leads toward memorial creation and remembers it for attribution. */
export function recordBlogClick(slug: string, ctaId: string, kind: 'cta_click' | 'link_click' = 'cta_click') {
  trackBlog(kind, slug, ctaId);
  if (!hasConsent('analytics')) return;
  try { localStorage.setItem(TOUCH_KEY, JSON.stringify({ slug, cta: ctaId, at: Date.now() })); } catch { /* ignore */ }
}

export function getBlogTouch(now = Date.now()): BlogTouch | null {
  try {
    const raw = localStorage.getItem(TOUCH_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as BlogTouch;
    if (!t?.slug || typeof t.at !== 'number' || now - t.at > WINDOW_MS) return null;
    return t;
  } catch { return null; }
}

/** Called once when a memorial creation starts; attributes the start to the last blog click. */
export function trackStartFromBlog() {
  const t = getBlogTouch();
  if (!t) return;
  try {
    const k = `osm_bs_${t.slug}_${t.at}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, '1');
  } catch { /* ignore */ }
  trackBlog('start_create', t.slug, t.cta);
}

// ---- Prefill handed from blog widgets to the memorial wizard ----
const PREFILL_KEY = 'osm_memorial_prefill';
export type MemorialPrefill = { name?: string; quote?: string; song?: string };

export function setMemorialPrefill(p: MemorialPrefill) {
  try { sessionStorage.setItem(PREFILL_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}
export function readMemorialPrefill(): MemorialPrefill | null {
  try { const v = sessionStorage.getItem(PREFILL_KEY); return v ? JSON.parse(v) : null; } catch { return null; }
}
export function clearMemorialPrefill() {
  try { sessionStorage.removeItem(PREFILL_KEY); } catch { /* ignore */ }
}
