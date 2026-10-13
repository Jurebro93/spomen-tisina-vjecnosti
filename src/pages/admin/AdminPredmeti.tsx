import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AdminGuard from '@/components/admin/AdminGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BusinessSettings, BUSINESS_FALLBACK, missingBusinessFields } from '@/lib/business';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

type Case = {
  id: string; case_number: string; case_type: string; status: string; full_name: string | null; email: string | null;
  order_reference: string | null; order_id: string | null; memorial_id: string | null; content_url: string | null; problem_type: string | null;
  description: string | null; attachment_paths: string[]; within_14_days: boolean | null; received_at: string; response_due_at: string | null;
  identity_verified_at: string | null; refunded_at: string | null; hidden_at: string | null; deleted_at: string | null; admin_note: string | null;
};
const TYPE: Record<string, string> = { withdrawal: 'Raskid', complaint: 'Prigovor', content_report: 'Prijava sadržaja' };
const STATUS: Record<string, string> = { received: 'Zaprimljeno', in_review: 'U obradi', resolved: 'Riješeno', rejected: 'Odbijeno' };
const db = supabase as any;
const dt = (s: string | null) => (s ? new Date(s).toLocaleString('hr-HR', { timeZone: 'Europe/Zagreb' }) : '—');

const Inner = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [cases, setCases] = useState<Case[]>([]);
  const [filter, setFilter] = useState('');
  const [biz, setBiz] = useState<BusinessSettings>(BUSINESS_FALLBACK);

  const load = async () => {
    const { data } = await db.from('legal_cases').select('*').order('received_at', { ascending: false }).limit(500);
    setCases(data ?? []);
    const { data: b } = await db.from('business_settings').select('*').eq('id', 1).maybeSingle();
    if (b) setBiz(b);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: Partial<Case>) => {
    const { error } = await db.from('legal_cases').update(patch).eq('id', id);
    if (error) toast({ title: 'Greška', description: error.message, variant: 'destructive' });
    else load();
  };
  const openAttachment = async (path: string) => {
    const { data } = await supabase.storage.from('legal-attachments').createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener');
  };
  const saveBiz = async () => {
    const { error } = await db.from('business_settings').update({
      legal_name: biz.legal_name, address: biz.address, postal_code: biz.postal_code || null, city: biz.city, country: biz.country,
      oib: biz.oib, mbo: biz.mbo || null, email: biz.email, phone: biz.phone || null, register_info: biz.register_info || null, tax_note: biz.tax_note,
    }).eq('id', 1);
    if (error) toast({ title: 'Greška', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Poslovni podaci spremljeni' }); qc.invalidateQueries({ queryKey: ['business_settings'] }); }
  };

  const shown = cases.filter((c) => !filter || c.case_type === filter);
  const missing = missingBusinessFields(biz);
  const field = (k: keyof BusinessSettings, label: string) => (
    <div><Label htmlFor={`b-${k}`}>{label}</Label><Input id={`b-${k}`} value={(biz[k] as string) ?? ''} onChange={(e) => setBiz({ ...biz, [k]: e.target.value })} /></div>
  );

  return (
    <main className="container mx-auto px-4 py-10 space-y-10">
      <section>
        <h1 className="text-3xl font-display font-bold mb-4">Predmeti</h1>
        <div className="flex flex-wrap gap-2 mb-4">
          {[['', 'Svi'], ['withdrawal', 'Raskidi'], ['complaint', 'Prigovori'], ['content_report', 'Prijave sadržaja']].map(([v, l]) => (
            <Button key={v} size="sm" variant={filter === v ? 'default' : 'outline'} onClick={() => setFilter(v)}>{l}</Button>
          ))}
        </div>
        {shown.length === 0 && <p className="text-muted-foreground">Nema predmeta.</p>}
        <div className="space-y-4">
          {shown.map((c) => {
            const overdue = c.response_due_at && c.status !== 'resolved' && new Date(c.response_due_at) < new Date();
            return (
              <article key={c.id} className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{c.case_number}</strong><Badge variant="secondary">{TYPE[c.case_type]}</Badge><Badge>{STATUS[c.status] ?? c.status}</Badge>
                  {c.case_type === 'withdrawal' && c.within_14_days === false && <Badge variant="destructive">Nakon 14 dana — pregledati kao moguću reklamaciju</Badge>}
                  {overdue && <Badge variant="destructive">Rok istekao</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">Zaprimljeno {dt(c.received_at)} · Rok {dt(c.response_due_at)}</p>
                <p className="text-sm">{[c.full_name, c.email, c.order_reference, c.content_url, c.problem_type].filter(Boolean).join(' · ')}</p>
                {c.description && <p className="text-sm whitespace-pre-wrap">{c.description}</p>}
                {c.attachment_paths?.map((p) => <Button key={p} size="sm" variant="link" onClick={() => openAttachment(p)}>Prilog</Button>)}
                {c.case_type === 'withdrawal' && (
                  <div className="text-sm grid sm:grid-cols-4 gap-2 rounded bg-muted/50 p-3">
                    <div>Identitet: {c.identity_verified_at ? dt(c.identity_verified_at) : <Button size="sm" variant="outline" onClick={() => update(c.id, { identity_verified_at: new Date().toISOString() })}>Potvrđen</Button>}</div>
                    <div>Povrat: {c.refunded_at ? dt(c.refunded_at) : <Button size="sm" variant="outline" onClick={() => update(c.id, { refunded_at: new Date().toISOString() })}>Proveden u Stripeu</Button>}</div>
                    <div>Uklonjen iz prikaza: {c.hidden_at ? dt(c.hidden_at) : <Button size="sm" variant="outline" onClick={() => update(c.id, { hidden_at: new Date().toISOString() })}>Označi</Button>}</div>
                    <div>Trajno obrisano: {c.deleted_at ? dt(c.deleted_at) : '—'}</div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 items-center">
                  {Object.entries(STATUS).map(([v, l]) => <Button key={v} size="sm" variant={c.status === v ? 'default' : 'ghost'} onClick={() => update(c.id, { status: v, ...(v === 'resolved' ? { resolved_at: new Date().toISOString() } as any : {}) })}>{l}</Button>)}
                </div>
                <Textarea placeholder="Interna bilješka" defaultValue={c.admin_note ?? ''} onBlur={(e) => e.target.value !== (c.admin_note ?? '') && update(c.id, { admin_note: e.target.value })} />
              </article>
            );
          })}
        </div>
      </section>

      <section className="max-w-2xl space-y-4">
        <h2 className="text-2xl font-display font-semibold">Poslovni podaci</h2>
        <p className="text-sm text-muted-foreground">Prikazuju se na pravnim stranicama i u e-mail potvrdama. Prazna polja se ne prikazuju javno.</p>
        {missing.length > 0 && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="font-semibold">Podaci za dopunu:</p>
            <ul className="list-disc pl-5">{missing.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        )}
        {field('legal_name', 'Puni naziv')}
        <div className="grid sm:grid-cols-2 gap-4">{field('address', 'Adresa')}{field('postal_code', 'Poštanski broj')}{field('city', 'Mjesto')}{field('country', 'Država')}{field('oib', 'OIB')}{field('mbo', 'Matični broj')}{field('email', 'E-mail')}{field('phone', 'Telefon')}</div>
        {field('register_info', 'Podaci registra')}
        {field('tax_note', 'Porezna napomena')}
        <Button onClick={saveBiz}>Spremi poslovne podatke</Button>
      </section>
    </main>
  );
};

const AdminPredmeti = () => (
  <div className="min-h-screen bg-background"><Header /><AdminGuard><Inner /></AdminGuard><Footer /></div>
);
export default AdminPredmeti;
