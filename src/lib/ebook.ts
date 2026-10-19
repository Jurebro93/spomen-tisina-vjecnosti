import { supabase } from '@/integrations/supabase/client';
import { landingParams } from '@/lib/landing';

/** Free guide offered for an e-mail address on the homepage, obituary pages and /besplatni-vodic. */
export const EBOOK = {
  title: 'Kad izgubite voljenu osobu',
  pdf: '/vodic/kad-izgubite-voljenu-osobu.pdf',
  cover: '/vodic/naslovnica.jpg',
  landing: '/besplatni-vodic',
  pages: 24,
};

const UNLOCK_KEY = 'osm_ebook_unlocked';

export const ebookUnlocked = () => {
  try { return localStorage.getItem(UNLOCK_KEY) === '1'; } catch { return false; }
};

const rememberUnlock = () => {
  try { localStorage.setItem(UNLOCK_KEY, '1'); } catch { /* storage unavailable */ }
};

/**
 * Saves the address through claim-ebook (which also e-mails the link). Until that function is
 * deployed, falls back to the plain newsletter signup so the download never depends on it.
 */
export const claimEbook = async (email: string, placement: string): Promise<'ok' | 'error'> => {
  const utm = landingParams();
  const landingUrl = `${window.location.pathname}${utm.toString() ? `?${utm.toString()}` : ''}`;
  const { data, error } = await supabase.functions.invoke('claim-ebook', { body: { email, placement, landingUrl } });
  if (!error && data?.pdf) { rememberUnlock(); return 'ok'; }
  const status = (error as { context?: { status?: number } } | null)?.context?.status;
  if (status === 400) return 'error';
  const fallback = await supabase.functions.invoke('subscribe-newsletter', { body: { email } });
  const fbStatus = (fallback.error as { context?: { status?: number } } | null)?.context?.status;
  if (!fallback.error || fbStatus === 409) { rememberUnlock(); return 'ok'; }
  return 'error';
};
