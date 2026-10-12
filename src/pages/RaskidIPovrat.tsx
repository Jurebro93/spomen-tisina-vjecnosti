import { useEffect, useState } from 'react';
import LegalLayout, { H2, L } from '@/components/legal/LegalLayout';
import CaseConfirmation from '@/components/legal/CaseConfirmation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LEGAL_VERSIONS } from '@/lib/legal';
import { useBusiness } from '@/lib/business';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CaseResult, submitLegalCase } from '@/lib/legalCases';

type MyOrder = { order_id: string; memorial_slug: string | null; paid_at: string | null; amount_paid: number; is_free: boolean };

const RaskidIPovrat = () => {
  const b = useBusiness();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [form, setForm] = useState({ full_name: '', email: '', order_id: '', order_reference: '', contract_date: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<CaseResult | null>(null);

  useEffect(() => {
    if (!user) return;
    setForm((f) => ({ ...f, email: f.email || user.email || '' }));
    (supabase as any).rpc('my_withdrawable_orders').then(({ data }: { data: MyOrder[] | null }) => setOrders(data ?? []));
  }, [user]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!form.full_name.trim() || !form.email.trim()) { setErr('Upišite ime i prezime te e-mail korišten pri kupnji.'); return; }
    setBusy(true);
    try {
      const sel = orders.find((o) => o.order_id === form.order_id);
      setResult(await submitLegalCase({
        case_type: 'withdrawal', full_name: form.full_name, email: form.email,
        order_id: form.order_id || undefined,
        order_reference: form.order_reference || (sel ? `Memorijal ${sel.memorial_slug ?? ''}`.trim() : ''),
        contract_date: form.contract_date, description: form.description,
      }));
    } catch (e2) { setErr((e2 as Error).message); } finally { setBusy(false); }
  };

  return (
    <LegalLayout title="Jednostrani raskid i povrat" path="/raskid-i-povrat" version={LEGAL_VERSIONS.raskid}>
      <p>Od kupnje digitalnog memorijala možete odustati u roku od 14 dana od sklapanja ugovora, bez navođenja razloga.</p>
      <p>Za odustajanje možete koristiti gumb „Raskini ugovor” na ovoj stranici ili poslati jasnu izjavu na <a className="text-primary underline" href={`mailto:${b.email}`}>{b.email}</a>. Obrazac nije jedini dopušteni način podnošenja zahtjeva.</p>
      <p>Navedite ime i prezime, e-mail korišten pri kupnji i broj narudžbe ili drugi podatak prema kojem možemo pronaći kupnju. Ako nemate broj narudžbe, možete nam se javiti e-mailom.</p>
      <p>Potvrdu primitka izjave poslat ćemo bez odgađanja na vaš e-mail.</p>

      <section aria-labelledby="raskid-obrazac" className="rounded-lg border-2 border-primary/40 p-6 space-y-4">
        <h2 id="raskid-obrazac" className="text-xl font-display font-semibold">Raskid ugovora</h2>
        {result ? (
          <CaseConfirmation result={result} title="Izjava o raskidu je zaprimljena" email={form.email} />
        ) : !open ? (
          <Button size="lg" onClick={() => setOpen(true)}>Raskini ugovor</Button>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="rounded-md bg-muted p-4 text-sm space-y-1">
              <p className="font-semibold">Što se događa nakon potvrde</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Zahtjev se odmah sprema, a vrijeme primitka određuje poštivanje roka.</li>
                <li>Za kupnje unutar 14 dana vraćamo cjelokupan stvarno plaćeni iznos, najkasnije 14 dana od primitka izjave.</li>
                <li>Memorijal se uklanja iz prikaza. Prije trajnog brisanja možete preuzeti svoj sadržaj.</li>
                <li>Slanjem obrasca ništa se ne briše odmah.</li>
              </ul>
            </div>
            <p className="font-medium">Ovim izjavljujem da jednostrano raskidam ugovor o kupnji digitalnog memorijala na osmrtnica.com.hr.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label htmlFor="r-name">Ime i prezime *</Label><Input id="r-name" value={form.full_name} onChange={set('full_name')} required maxLength={200} /></div>
              <div><Label htmlFor="r-email">E-mail korišten pri kupnji *</Label><Input id="r-email" type="email" value={form.email} onChange={set('email')} required maxLength={255} /></div>
            </div>
            {orders.length > 0 && (
              <div>
                <Label htmlFor="r-order">Vaša narudžba</Label>
                <select id="r-order" value={form.order_id} onChange={set('order_id')} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3">
                  <option value="">— odaberite —</option>
                  {orders.map((o) => (
                    <option key={o.order_id} value={o.order_id}>
                      {o.memorial_slug ?? 'Memorijal'} · {o.paid_at ? new Date(o.paid_at).toLocaleDateString('hr-HR') : ''} · {o.is_free ? 'besplatna aktivacija' : `${Number(o.amount_paid).toFixed(2).replace('.', ',')} €`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label htmlFor="r-ref">Broj narudžbe ili oznaka memorijala</Label><Input id="r-ref" value={form.order_reference} onChange={set('order_reference')} maxLength={200} /></div>
              <div><Label htmlFor="r-date">Datum sklapanja ugovora, ako je poznat</Label><Input id="r-date" type="date" value={form.contract_date} onChange={set('contract_date')} /></div>
            </div>
            <div><Label htmlFor="r-desc">Razlog (nije obavezno)</Label><Textarea id="r-desc" value={form.description} onChange={set('description')} maxLength={5000} /></div>
            {err && <p role="alert" className="text-destructive text-sm">{err}</p>}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" size="lg" disabled={busy}>{busy ? 'Šaljem…' : 'Potvrdi raskid ugovora'}</Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Odustani</Button>
            </div>
          </form>
        )}
      </section>

      <H2>Povrat novca</H2>
      <p>Kod raskida u navedenom roku vraćamo cjelokupan stvarno plaćeni iznos, bez naknade za dotadašnje korištenje memorijala.</p>
      <p>Povrat provodimo bez nepotrebnog odgađanja, najkasnije u roku od 14 dana od primitka izjave o raskidu. Provodi se istim sredstvom plaćanja, osim ako izričito dogovorimo drugačije, bez dodatnog troška za korisnika.</p>
      <p>Ako je memorijal aktiviran potpuno besplatno, nema novčanog iznosa za povrat.</p>
      <H2>Što se događa s memorijalom</H2>
      <p>Raskidom prestaje usluga za predmetni memorijal i memorijal se uklanja iz prikaza. Prije trajnog brisanja omogućujemo preuzimanje vlastitog sadržaja.</p>
      <p>Preuzimanje sadržaja nije uvjet za raskid ni povrat novca.</p>
      <p>Podatke koje moramo čuvati zbog zakonskih obveza ili rješavanja zahtjeva zadržavamo samo u potrebnom opsegu. Postupanje sa sigurnosnim kopijama opisano je u <L to="/politika-privatnosti">Politici privatnosti</L>.</p>
      <H2>Problemi nakon isteka 14 dana</H2>
      <p>I nakon isteka roka za odustajanje možete prijaviti neisporuku, tehnički problem ili neusklađenost usluge. Vaša zakonska prava zbog takvih problema ostaju na snazi. Možete koristiti isti obrazac ili stranicu <L to="/prigovori">Prigovori i reklamacije</L>.</p>
      <H2>Primjer izjave</H2>
      <div className="rounded-md border border-border p-5 whitespace-pre-line">{`Ovim izjavljujem da jednostrano raskidam ugovor o kupnji digitalnog memorijala na osmrtnica.com.hr.

Ime i prezime:
E-mail korišten pri kupnji:
Broj narudžbe ili oznaka memorijala:
Datum sklapanja ugovora, ako je poznat:
Datum podnošenja izjave:`}</div>
      <p>Izjavu možete poslati e-mailom. Vlastoručni potpis potreban je samo ako izjavu šaljete na papiru.</p>
    </LegalLayout>
  );
};
export default RaskidIPovrat;
