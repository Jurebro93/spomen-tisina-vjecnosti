import { supabase } from '@/integrations/supabase/client';

export interface BillingDetailsInput {
  customer_type: 'individual' | 'company';
  full_name: string;
  email: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string;
  company_name?: string | null;
  oib?: string | null;
  vat_id?: string | null;
}

export const fetchBillingDetails = async (memorialId: string) => {
  const { data } = await supabase.from('billing_details').select('*').eq('memorial_id', memorialId).maybeSingle();
  return data;
};

export const saveBillingDetails = async (memorialId: string, userId: string, input: BillingDetailsInput) => {
  const existing = await fetchBillingDetails(memorialId);
  const payload = { ...input, memorial_id: memorialId, user_id: userId };
  if (existing) {
    const { error } = await supabase.from('billing_details').update(payload).eq('id', existing.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('billing_details').insert(payload);
  if (error) throw error;
};

/** Bridge so payment helpers can ask the mounted dialog for billing data. */
type Resolver = { resolve: (promoCode: string | null) => void; reject: (reason?: unknown) => void; memorialId: string };
let pending: Resolver | null = null;

export const BILLING_EVENT = 'osmrtnica:request-billing';

export const requestBillingDetails = (memorialId: string, promoCode?: string | null) =>
  new Promise<string | null>((resolve, reject) => {
    pending = { resolve, reject, memorialId };
    window.dispatchEvent(new CustomEvent(BILLING_EVENT, { detail: { memorialId, promoCode: promoCode ?? null } }));
  });

export const resolveBillingRequest = (promoCode: string | null = null) => {
  pending?.resolve(promoCode);
  pending = null;
};

export const cancelBillingRequest = () => {
  pending?.reject(new Error('Podaci za račun nisu uneseni.'));
  pending = null;
};
