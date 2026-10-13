import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LegalLayout, { H2, L } from '@/components/legal/LegalLayout';
import CaseConfirmation from '@/components/legal/CaseConfirmation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { LEGAL_VERSIONS } from '@/lib/legal';
import { CaseResult, fileToBase64, submitLegalCase } from '@/lib/legalCases';

const TYPES = ['Nezakonit sadržaj', 'Netočni podaci', 'Neovlaštena objava', 'Povreda privatnosti', 'Povreda autorskih prava', 'Uvredljiv sadržaj', 'Drugo'];
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const PrijavaSadrzaja = () => {
  const [params] = useSearchParams();
  const [form, setForm] = useState({ content_url: params.get('url') ?? '', problem_type: '', description: '', full_name: '', email: '' });
  const [files, setFiles] = useState<File[]>([]);
  const [goodFaith, setGoodFaith] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<CaseResult | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  const pickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    const bad = list.find((f) => !ALLOWED.includes(f.type) || f.size > 5 * 1024 * 1024);
    if (bad || list.length > 3) { setErr('Dopuštena su najviše 3 priloga (JPG, PNG, WEBP ili PDF), do 5 MB svaki.'); e.target.value = ''; return; }
    setErr(''); setFiles(list);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (!form.problem_type) { setErr('Odaberite vrstu problema.'); return; }
    if (!goodFaith) { setErr('Potvrdite izjavu o dobroj vjeri.'); return; }
    setBusy(true);
    try {
      const attachments = await Promise.all(files.map(async (f) => ({ name: f.name, type: f.type, base64: await fileToBase64(f) })));
      setResult(await submitLegalCase({ case_type: 'content_report', ...form, good_faith: true, attachments }));
    } catch (e2) { setErr((e2 as Error).message); } finally { setBusy(false); }
  };

  return (
    <LegalLayout title="Prijava sadržaja" path="/prijava-sadrzaja" version={LEGAL_VERSIONS.pravila}>
      <p>Ovdje možete prijaviti sadržaj za koji smatrate da je nezakonit, netočan, neovlašten ili protivan <L to="/pravila-objavljivanja">pravilima stranice</L>.</p>
      <p>Navedite točnu poveznicu i dovoljno jasno obrazložite prijavu kako bismo mogli identificirati problem.</p>
      <p>Dokumente priložite samo ako su potrebni. Nemojte dostavljati nepotrebne osobne podatke.</p>
      <p>Prijava ne znači automatsko brisanje. Prijave razmatramo prema njihovu sadržaju i primjenjivim obvezama. Vaš identitet ne otkrivamo autoru sadržaja.</p>
      <H2>Obrazac</H2>
      {result ? <CaseConfirmation result={result} title="Prijava je zaprimljena" email={form.email || undefined} /> : (
        <form onSubmit={submit} className="space-y-4 rounded-lg border border-border p-6">
          <div><Label htmlFor="s-url">Poveznica (URL) sadržaja *</Label><Input id="s-url" type="url" value={form.content_url} onChange={set('content_url')} required maxLength={1000} placeholder="https://osmrtnica.com.hr/..." /></div>
          <div>
            <Label htmlFor="s-type">Vrsta problema *</Label>
            <select id="s-type" value={form.problem_type} onChange={set('problem_type')} required className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3">
              <option value="">— odaberite —</option>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div><Label htmlFor="s-desc">Obrazloženje *</Label><Textarea id="s-desc" rows={6} value={form.description} onChange={set('description')} required maxLength={10000} /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label htmlFor="s-name">Ime i prezime</Label><Input id="s-name" value={form.full_name} onChange={set('full_name')} maxLength={200} /></div>
            <div><Label htmlFor="s-email">E-mail (za potvrdu i odgovor)</Label><Input id="s-email" type="email" value={form.email} onChange={set('email')} maxLength={255} /></div>
          </div>
          <p className="text-sm text-muted-foreground">Ime i e-mail nisu obvezni, ali bez e-maila vam ne možemo poslati potvrdu ni obavijest o odluci.</p>
          <div><Label htmlFor="s-files">Prilozi (nije obavezno)</Label><Input id="s-files" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={pickFiles} /><p className="text-xs text-muted-foreground mt-1">Najviše 3 datoteke, do 5 MB. Prilozi nisu javno dostupni.</p></div>
          <label className="flex items-start gap-3">
            <Checkbox checked={goodFaith} onCheckedChange={(v) => setGoodFaith(v === true)} className="mt-1" />
            <span>U dobroj vjeri smatram da su dostavljene informacije točne i potpune.</span>
          </label>
          {err && <p role="alert" className="text-destructive text-sm">{err}</p>}
          <Button type="submit" disabled={busy}>{busy ? 'Šaljem…' : 'Pošalji prijavu'}</Button>
        </form>
      )}
    </LegalLayout>
  );
};
export default PrijavaSadrzaja;
