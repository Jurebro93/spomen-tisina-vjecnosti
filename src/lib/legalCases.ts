import { supabase } from '@/integrations/supabase/client';

export interface CaseResult { case_number: string; received_at: string; mailed: boolean }

export const submitLegalCase = async (body: Record<string, unknown>): Promise<CaseResult> => {
  const { data, error } = await supabase.functions.invoke('submit-legal-case', { body });
  if (error) {
    let msg = 'Zahtjev nije spremljen. Pokušajte ponovno ili pišite na info@osmrtnica.com.hr.';
    try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* keep default */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data as CaseResult;
};

export const fileToBase64 = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(',')[1] ?? '');
  r.onerror = rej;
  r.readAsDataURL(f);
});

export const formatReceived = (iso: string) =>
  new Date(iso).toLocaleString('hr-HR', { timeZone: 'Europe/Zagreb', dateStyle: 'long', timeStyle: 'medium' });
