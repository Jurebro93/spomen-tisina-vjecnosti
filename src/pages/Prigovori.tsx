import { useState } from 'react';
import LegalLayout, { H2 } from '@/components/legal/LegalLayout';
import CaseConfirmation from '@/components/legal/CaseConfirmation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LEGAL_VERSIONS } from '@/lib/legal';
import { fullAddress, useBusiness } from '@/lib/business';
import { CaseResult, submitLegalCase } from '@/lib/legalCases';

const Prigovori = () => {
  const b = useBusiness();
  const [form, setForm] = useState({ full_name: '', email: '', order_reference: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<CaseResult | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (form.description.trim().length < 10) { setErr('Opišite problem (najmanje 10 znakova).'); return; }
    setBusy(true);
    try { setResult(await submitLegalCase({ case_type: 'complaint', ...form })); }
    catch (e2) { setErr((e2 as Error).message); } finally { setBusy(false); }
  };

  return (
    <LegalLayout title="Prigovori i reklamacije" path="/prigovori" version={LEGAL_VERSIONS.prigovori}>
      <p>Pisani prigovor možete poslati putem obrasca na ovoj stranici, e-mailom na <a className="text-primary underline" href={`mailto:${b.email}`}>{b.email}</a> ili poštom na adresu:</p>
      <p className="rounded-md border border-border p-4">{b.legal_name}<br />{fullAddress(b)}</p>
      <p>Navedite opis problema i podatke potrebne da pronađemo povezanu narudžbu, račun ili memorijal. Nemojte slati lozinke ni podatke o kartici.</p>
      <p>Primitak prigovora potvrdit ćemo bez odgađanja.</p>
      <p>Na pisani prigovor odgovorit ćemo pisanim putem u roku od 15 dana od primitka, jasno navodeći prihvaćamo li njegovu osnovanost.</p>
      <p>Ako se prigovor odnosi na neisporuku ili neusklađenost usluge, razmotrit ćemo zahtjev prema primjenjivim pravima potrošača.</p>
      <p>Podnošenje prigovora ne ograničava pravo na obraćanje nadležnim tijelima ili sudu.</p>

      <H2>Obrazac za prigovor</H2>
      {result ? <CaseConfirmation result={result} title="Prigovor je zaprimljen" email={form.email} /> : (
        <form onSubmit={submit} className="space-y-4 rounded-lg border border-border p-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label htmlFor="p-name">Ime i prezime *</Label><Input id="p-name" value={form.full_name} onChange={set('full_name')} required maxLength={200} /></div>
            <div><Label htmlFor="p-email">E-mail *</Label><Input id="p-email" type="email" value={form.email} onChange={set('email')} required maxLength={255} /></div>
          </div>
          <div><Label htmlFor="p-ref">Broj narudžbe, računa ili poveznica memorijala</Label><Input id="p-ref" value={form.order_reference} onChange={set('order_reference')} maxLength={200} /></div>
          <div><Label htmlFor="p-desc">Opis problema *</Label><Textarea id="p-desc" rows={6} value={form.description} onChange={set('description')} required maxLength={10000} /></div>
          {err && <p role="alert" className="text-destructive text-sm">{err}</p>}
          <Button type="submit" disabled={busy}>{busy ? 'Šaljem…' : 'Pošalji prigovor'}</Button>
        </form>
      )}
    </LegalLayout>
  );
};
export default Prigovori;
