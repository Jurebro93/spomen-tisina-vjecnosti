// Sales funnel + attribution tracking for the admin "Statistika i prodaja" report.
// Visitor id and stored traffic source are used ONLY with analytics consent. Without consent a step is an
// anonymous count that carries just the utm values of the landing URL (kept in memory, never on the device).
import { supabase } from '@/integrations/supabase/client';
import { hasConsent as hasCat } from '@/lib/consent';
import { getBlogTouch } from '@/lib/blogTracking';
import { landingParams, landingReferrer } from '@/lib/landing';
import { isBot } from '@/lib/isBot';

export type FunnelStep = 'visit_landing' | 'start_create' | 'auth' | 'draft_saved' | 'checkout_started' | 'checkout_returned'
  | 'person_search' | 'person_manual' | 'guest_account' | 'draft_email' | 'draft_email_skipped' | 'draft_resumed'
  | 'consent_accepted' | 'consent_rejected' | 'consent_custom'
  | 'wizard_1' | 'wizard_2' | 'wizard_3' | 'wizard_4' | 'wizard_5' | 'wizard_6' | 'wizard_7'
  | 'flow_osoba' | 'flow_email' | 'flow_prica' | 'flow_pregled'
  | 'campaign_visit' | 'start_example' | 'start_relation' | 'start_link';

const hasConsent = () => {
  return hasCat('analytics');
};

const device = () => {
  const w = window.innerWidth;
  return w < 768 ? 'mobile' : w < 1100 ? 'tablet' : 'desktop';
};

type Touch = { source: string | null; medium: string | null; campaign: string | null };

// Reads the landing URL, so consent given after navigating away still credits the ad or link that brought the visitor.
function currentTouch(): Touch {
  const p = landingParams();
  const utm = { source: p.get('utm_source'), medium: p.get('utm_medium'), campaign: p.get('utm_campaign') };
  if (utm.source) return utm;
  if (p.get('fbclid')) return { source: 'facebook', medium: 'paid_or_social', campaign: utm.campaign };
  if (p.get('gclid')) return { source: 'google', medium: 'cpc', campaign: utm.campaign };
  const ref = landingReferrer();
  if (ref) {
    try {
      const host = new URL(ref).hostname.replace(/^www\./, '');
      if (host && host !== window.location.hostname.replace(/^www\./, '')) return { source: host, medium: 'referral', campaign: null };
    } catch { /* ignore */ }
  }
  return { source: null, medium: null, campaign: null };
}

let captured = false;

/** Call once per page load (from App). Stores first and latest known touch, only with consent. */
export function captureAttribution() {
  // Counted with or without consent, so the ad funnel has a first step for everyone.
  if (!captured) { captured = true; if (landingParams().get('utm_campaign')) void trackFunnel('campaign_visit'); }
  if (!hasConsent()) return;
  const t = currentTouch();
  try {
    if (!localStorage.getItem('osm_first_touch')) {
      localStorage.setItem('osm_first_touch', JSON.stringify(t.source ? t : { source: 'direct', medium: 'none', campaign: null }));
    }
    if (t.source) sessionStorage.setItem('osm_last_touch', JSON.stringify(t));
    else if (!sessionStorage.getItem('osm_last_touch')) sessionStorage.setItem('osm_last_touch', JSON.stringify({ source: 'direct', medium: 'none', campaign: null }));
  } catch { /* storage blocked */ }
}

const read = (s: Storage, k: string): Touch | null => {
  try { const v = s.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; }
};

function visitorId(): string {
  let id = localStorage.getItem('osm_vid');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('osm_vid', id); }
  return id;
}

/** Attribution sent to the server when a checkout starts. */
export function getAttribution() {
  if (!hasConsent()) return { device: device() };
  const first = read(localStorage, 'osm_first_touch');
  const last = read(sessionStorage, 'osm_last_touch');
  return {
    first_source: first?.source ?? null, first_medium: first?.medium ?? null, first_campaign: first?.campaign ?? null,
    source: last?.source ?? null, medium: last?.medium ?? null, campaign: last?.campaign ?? null,
    device: device(),
    ...(() => { const t = getBlogTouch(); return t ? { blog_slug: t.slug, blog_cta: t.cta, blog_touched_at: new Date(t.at).toISOString() } : {}; })(),
  };
}

const sent = new Set<string>();

export async function trackFunnel(step: FunnelStep, opts: { userId?: string | null; memorialId?: string | null; once?: boolean } = {}) {
  if (isBot()) return;
  const key = `${step}:${opts.memorialId ?? ''}`;
  if (opts.once !== false) {
    if (sent.has(key)) return;
    try { if (sessionStorage.getItem(`osm_f_${key}`)) return; sessionStorage.setItem(`osm_f_${key}`, '1'); } catch { /* ignore */ }
    sent.add(key);
  }
  const consented = hasConsent();
  // Without consent only the campaign the visitor landed from is sent: no id, nothing read from storage.
  const last = consented ? read(sessionStorage, 'osm_last_touch') : (() => { const t = currentTouch(); return t.campaign ? t : null; })();
  try {
    await supabase.from('funnel_events' as never).insert({
      step,
      consented,
      visitor_id: consented ? visitorId() : null,
      user_id: opts.userId ?? null,
      memorial_id: opts.memorialId ?? null,
      source: last?.source ?? null,
      medium: last?.medium ?? null,
      campaign: last?.campaign ?? null,
      device: device(),
      path: window.location.pathname.slice(0, 500),
    } as never);
  } catch { /* never block the user */ }
}
