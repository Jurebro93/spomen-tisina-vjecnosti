import { getAttribution } from '@/lib/funnel';
import { supabase } from '@/integrations/supabase/client';
import { requestBillingDetails } from '@/lib/billing';
import { MEMORIAL_PRICE_EUR, isDuplicateMemorialError, logMemorialAction, type Deceased, type ManagerRole, type Memorial } from '@/lib/memorial';
import { trackEvent } from '@/lib/metaPixel';

export class DuplicateMemorialError extends Error {
  constructor(public existingSlug?: string) {
    super('Za ovu osobu već postoji digitalni memorijal.');
  }
}

/** Creates the draft memorial and registers the creator as owner. */
export const createDraftMemorial = async (deceased: Deceased, userId: string, relationship: string | null) => {
  const { data: slug, error: slugError } = await supabase.rpc('generate_memorial_slug', {
    _ime: deceased.ime,
    _prezime: deceased.prezime,
    _rodenja: deceased.datum_rodenja,
    _smrti: deceased.datum_smrti,
  });
  if (slugError) throw slugError;

  const { data, error } = await supabase
    .from('memorials')
    .insert({
      deceased_id: deceased.id,
      owner_id: userId,
      slug: slug as string,
      relationship,
      status: 'draft',
      visibility: 'public',
    })
    .select('*')
    .single();

  if (error) {
    if (isDuplicateMemorialError(error)) {
      const { data: existing } = await supabase
        .from('memorials')
        .select('slug')
        .eq('deceased_id', deceased.id)
        .maybeSingle();
      throw new DuplicateMemorialError(existing?.slug);
    }
    throw error;
  }

  const memorial = data as Memorial;
  const { error: managerError } = await supabase
    .from('memorial_managers')
    .insert({ memorial_id: memorial.id, user_id: userId, role: 'owner' });
  if (managerError && !managerError.message.includes('duplicate')) throw managerError;

  await logMemorialAction(memorial.id, userId, 'memorial_created');
  return memorial;
};

export const updateMemorial = async (memorialId: string, patch: Partial<Memorial>) => {
  const { data, error } = await supabase.from('memorials').update(patch).eq('id', memorialId).select('*').single();
  if (error) throw error;
  return data as Memorial;
};

export const publishMemorial = async (memorialId: string, userId: string) => {
  const memorial = await updateMemorial(memorialId, { status: 'published', published_at: new Date().toISOString() });
  await logMemorialAction(memorialId, userId, 'memorial_published');
  return memorial;
};

/**
 * Starts Stripe Checkout for the memorial. Publishing is only possible after payment.
 * The promo code is only passed along — the server re-validates it and decides the final amount.
 */
/**
 * Returns a valid access token, refreshing an expired session first.
 * Without this the payment function receives a stale token and answers "Neautorizirani korisnik".
 */
export const ensureAuthToken = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  const expiresAtMs = (session?.expires_at ?? 0) * 1000;
  const stillValid = !!session?.access_token && expiresAtMs > Date.now() + 10_000;

  // A token with comfortable lifetime left is used as is.
  if (stillValid && expiresAtMs > Date.now() + 60_000) return session!.access_token;

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  const newToken = refreshed?.session?.access_token ?? null;
  if (newToken) return newToken;

  // Refresh can fail even while the user is logged in (e.g. rotated refresh token).
  // In that case the current token is still accepted by the server, so we keep using it.
  if (stillValid) return session!.access_token;
  if (refreshError) return null;
  return null;
};

export class NotAuthenticatedError extends Error {
  constructor() {
    super('Vaša prijava je istekla. Ponovno se prijavite i pokušajte opet.');
  }
}

export const startMemorialPayment = async (memorialId: string, promoCode: string | null | undefined, promoIsFree: boolean, consent: Record<string, unknown>) => {
  const token = await ensureAuthToken();
  if (!token) throw new NotAuthenticatedError();

  trackEvent('InitiateCheckout', {
    content_name: 'Digitalni memorijal',
    content_type: 'product',
    content_ids: [memorialId],
    currency: 'EUR',
    value: MEMORIAL_PRICE_EUR,
  });

  // Billing data for the invoice is collected before the redirect to Stripe.
  // Always shown so the buyer can review billing data, choose legal entity and enter a promo code.
  const chosenPromo = promoIsFree ? (promoCode ?? null) : await requestBillingDetails(memorialId, promoCode ?? null);


  const { data, error } = await supabase.functions.invoke('create-memorial-payment', {
    body: { memorial_id: memorialId, promo_code: chosenPromo, attribution: getAttribution(), ...consent },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) {
    let message = '';
    try {
      const body = await (error as { context?: Response }).context?.json();
      message = body?.error ?? '';
    } catch { /* ignore */ }
    if (message === 'Neautorizirani korisnik') throw new NotAuthenticatedError();
    throw new Error(message || 'Nije moguće otvoriti stranicu za plaćanje.');
  }
  if (data?.already_paid) return { alreadyPaid: true as const, slug: data.slug as string | undefined };
  if (data?.free) {
    return {
      alreadyPaid: false as const,
      free: true as const,
      slug: data.slug as string | undefined,
      promoCode: data.promo_code as string | undefined,
    };
  }
  if (!data?.url) throw new Error('Nije moguće otvoriti stranicu za plaćanje.');
  window.location.href = data.url as string;
  return { alreadyPaid: false as const };
};

/** Permanently deletes a memorial (owner only). All photos, uspomene and candles are removed too. */
export const deleteMemorial = async (memorialId: string) => {
  const { error } = await supabase.from('memorials').delete().eq('id', memorialId);
  if (error) throw error;
};

export const archiveMemorial = async (memorialId: string, userId: string) => {
  const memorial = await updateMemorial(memorialId, { status: 'archived', archived_at: new Date().toISOString() });
  await logMemorialAction(memorialId, userId, 'memorial_archived');
  return memorial;
};

export const changeVisibility = async (memorialId: string, userId: string, visibility: Memorial['visibility']) => {
  const memorial = await updateMemorial(memorialId, { visibility });
  await logMemorialAction(memorialId, userId, 'privacy_changed');
  return memorial;
};

export const addManagerByEmailInvite = async (
  memorialId: string,
  userId: string,
  email: string,
  role: Exclude<ManagerRole, 'owner'>
) => {
  const token = crypto.randomUUID() + crypto.randomUUID();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const tokenHash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');

  const { error } = await supabase.functions.invoke('memorial-invite', {
    body: { memorial_id: memorialId, email, role, token, token_hash: tokenHash },
  });
  if (error) throw error;
  await logMemorialAction(memorialId, userId, 'manager_invited');
};

export const resolveAccessRequest = async (
  requestId: string,
  memorialId: string,
  requesterUserId: string,
  userId: string,
  decision: 'approved' | 'rejected',
  role: Exclude<ManagerRole, 'owner'> = 'editor'
) => {
  if (decision === 'approved') {
    const { error } = await supabase
      .from('memorial_managers')
      .insert({ memorial_id: memorialId, user_id: requesterUserId, role });
    if (error && !error.message.includes('duplicate')) throw error;
    await logMemorialAction(memorialId, userId, 'manager_added');
  }
  const { error } = await supabase
    .from('memorial_access_requests')
    .update({ status: decision, resolved_at: new Date().toISOString(), resolved_by: userId })
    .eq('id', requestId);
  if (error) throw error;
};

export const moderateEntry = async (
  table: 'memorial_tributes' | 'memorial_candles',
  id: string,
  memorialId: string,
  userId: string,
  decision: 'approved' | 'rejected'
) => {
  const { error } = await supabase
    .from(table)
    .update({
      status: decision,
      approved_at: decision === 'approved' ? new Date().toISOString() : null,
      approved_by: decision === 'approved' ? userId : null,
    })
    .eq('id', id)
    .eq('memorial_id', memorialId)
    .select('id,status')
    .single();
  if (error) throw error;
  await logMemorialAction(memorialId, userId, decision === 'approved' ? 'tribute_approved' : 'tribute_rejected', table, id);
};
