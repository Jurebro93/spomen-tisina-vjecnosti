import { supabase } from '@/integrations/supabase/client';
import { landingParams } from '@/lib/landing';

export type GuideId = 'kad-izgubite-voljenu-osobu' | 'obiteljska-mirovina' | 'smrt-u-inozemstvu' | 'digitalna-ostavstina';

export interface Guide {
  id: GuideId;
  title: string;
  /** Short line for menus and cards. */
  tagline: string;
  pdf: string;
  cover: string;
  landing: string;
  pages: number;
  /** "24 stranice" / "14 stranica" */
  pagesLabel: string;
}

/** Free guides offered for an e-mail address. claim-ebook knows the same ids. */
export const EBOOKS: Record<GuideId, Guide> = {
  'kad-izgubite-voljenu-osobu': {
    id: 'kad-izgubite-voljenu-osobu',
    title: 'Kad izgubite voljenu osobu',
    tagline: 'Što učiniti korak po korak, od sprovoda do ostavine',
    pdf: '/vodic/kad-izgubite-voljenu-osobu.pdf',
    cover: '/vodic/naslovnica.jpg',
    landing: '/besplatni-vodic',
    pages: 24,
    pagesLabel: '24 stranice',
  },
  'obiteljska-mirovina': {
    id: 'obiteljska-mirovina',
    title: 'Obiteljska mirovina korak po korak',
    tagline: 'Tko ima pravo, koliko iznosi i kako predati zahtjev',
    pdf: '/vodic/obiteljska-mirovina/obiteljska-mirovina-korak-po-korak.pdf',
    cover: '/vodic/obiteljska-mirovina/naslovnica.jpg',
    landing: '/besplatni-vodic/obiteljska-mirovina',
    pages: 14,
    pagesLabel: '14 stranica',
  },
  'smrt-u-inozemstvu': {
    id: 'smrt-u-inozemstvu',
    title: 'Smrt u inozemstvu',
    tagline: 'Prijava smrti vani, prijevoz kući, mirovine i ostavina',
    pdf: '/vodic/smrt-u-inozemstvu/smrt-u-inozemstvu.pdf',
    cover: '/vodic/smrt-u-inozemstvu/naslovnica.jpg',
    landing: '/besplatni-vodic/smrt-u-inozemstvu',
    pages: 18,
    pagesLabel: '18 stranica',
  },
  'digitalna-ostavstina': {
    id: 'digitalna-ostavstina',
    title: 'Digitalna ostavština',
    tagline: 'Profili, fotografije, mobitel i pretplate preminule osobe',
    pdf: '/vodic/digitalna-ostavstina/digitalna-ostavstina.pdf',
    cover: '/vodic/digitalna-ostavstina/naslovnica.jpg',
    landing: '/besplatni-vodic/digitalna-ostavstina',
    pages: 16,
    pagesLabel: '16 stranica',
  },
};

export const GUIDES: Guide[] = Object.values(EBOOKS);

/** The original guide, still the default on the homepage and obituary pages. */
export const EBOOK = EBOOKS['kad-izgubite-voljenu-osobu'];

// The first guide kept the original key so visitors who already unlocked it stay unlocked.
const unlockKey = (guide: GuideId) => (guide === 'kad-izgubite-voljenu-osobu' ? 'osm_ebook_unlocked' : `osm_ebook_unlocked_${guide}`);

export const ebookUnlocked = (guide: GuideId = EBOOK.id) => {
  try { return localStorage.getItem(unlockKey(guide)) === '1'; } catch { return false; }
};

const rememberUnlock = (guide: GuideId) => {
  try { localStorage.setItem(unlockKey(guide), '1'); } catch { /* storage unavailable */ }
};

/**
 * Saves the address through claim-ebook (which also e-mails the link). Until that function is
 * deployed, falls back to the plain newsletter signup so the download never depends on it.
 */
export const claimEbook = async (email: string, placement: string, guide: GuideId = EBOOK.id): Promise<'ok' | 'error'> => {
  const utm = landingParams();
  const landingUrl = `${window.location.pathname}${utm.toString() ? `?${utm.toString()}` : ''}`;
  const { data, error } = await supabase.functions.invoke('claim-ebook', { body: { email, placement, landingUrl, guide } });
  if (!error && data?.pdf) { rememberUnlock(guide); return 'ok'; }
  const status = (error as { context?: { status?: number } } | null)?.context?.status;
  if (status === 400) return 'error';
  const fallback = await supabase.functions.invoke('subscribe-newsletter', { body: { email } });
  const fbStatus = (fallback.error as { context?: { status?: number } } | null)?.context?.status;
  if (!fallback.error || fbStatus === 409) { rememberUnlock(guide); return 'ok'; }
  return 'error';
};

/** Blog posts that get a guide widget (instead of the plain newsletter box) and an in-text link to the guide. */
export const BLOG_GUIDES: Record<string, GuideId> = {
  'kako-preboljeti-gubitak-supruga': 'obiteljska-mirovina',
  'postupak-kod-smrtnog-slucaja': 'obiteljska-mirovina',
  'smrtni-list': 'obiteljska-mirovina',
  'ostavinska-rasprava-koji-dokumenti-su-nam-potrebni': 'obiteljska-mirovina',
  'kako-pruziti-podrsku-ozaloscenoj-osobi': 'obiteljska-mirovina',
  'troskovi-pogreba': 'kad-izgubite-voljenu-osobu',
  'kako-organizirati-sprovod': 'kad-izgubite-voljenu-osobu',
  'kako-preboljeti-gubitak-voljene-osobe': 'kad-izgubite-voljenu-osobu',
  'grobnica-vrste-cijene': 'kad-izgubite-voljenu-osobu',
  'kako-napisati-osmrtnicu': 'kad-izgubite-voljenu-osobu',
  'pisanje-iskrenog-oprostaja-kako-pocastiti-voljenu-osobu-u-spomenu': 'kad-izgubite-voljenu-osobu',
  'nasljedivanje-mirovine-od-supruga': 'obiteljska-mirovina',
  'iskrena-sucut-tekstovi-poruke': 'kad-izgubite-voljenu-osobu',
  'ugovor-o-dozivotnom-uzdrzavanju': 'kad-izgubite-voljenu-osobu',
};

/** One sentence linking a blog post to its guide's landing page. */
export const GUIDE_LINK_HTML: Record<GuideId, string> = {
  'kad-izgubite-voljenu-osobu': '<p><em>Sve korake nakon smrti bliske osobe, od sprovoda i smrtnog lista do ostavine, složili smo u <a href="/besplatni-vodic" data-cta="guide_link">besplatni vodič „Kad izgubite voljenu osobu”</a>.</em></p>',
  'obiteljska-mirovina': '<p><em>Tko ima pravo na obiteljsku mirovinu, koliko iznosi i kako predati zahtjev na vrijeme, objasnili smo u <a href="/besplatni-vodic/obiteljska-mirovina" data-cta="guide_link">besplatnom vodiču „Obiteljska mirovina korak po korak”</a>.</em></p>',
  'smrt-u-inozemstvu': '<p><em>Što napraviti kad bližnji umre u inozemstvu, od prijave smrti do prijevoza kući, objasnili smo u <a href="/besplatni-vodic/smrt-u-inozemstvu" data-cta="guide_link">besplatnom vodiču „Smrt u inozemstvu”</a>.</em></p>',
  'digitalna-ostavstina': '<p><em>Kako sačuvati fotografije i poruke te memorijalizirati ili ugasiti profile preminule osobe, objasnili smo u <a href="/besplatni-vodic/digitalna-ostavstina" data-cta="guide_link">besplatnom vodiču „Digitalna ostavština”</a>.</em></p>',
};
