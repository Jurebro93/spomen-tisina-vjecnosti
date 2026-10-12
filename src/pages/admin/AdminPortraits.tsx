import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BookOpen, CalendarDays, Camera, CheckCircle2, Loader2, Plus, RefreshCw, Save, Send, Sparkles, Trash2, UserRound, Wand2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AdminGuard from '@/components/admin/AdminGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { mediaPublicUrl } from '@/lib/memorial';
import { validLifeEventYear } from '@/lib/lifeEventYear';

type LifeEvent = { year: number | null; title: string; description: string };
type Tribute = { author_name: string; relationship: string; message: string };
type Section = 'all' | 'biography' | 'events' | 'quote' | 'tributes';

const todayIso = () => new Date().toISOString().slice(0, 10);

async function invoke<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (data?.error) throw Object.assign(new Error(data.error), { data });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const parsed = ctx ? await ctx.json().catch(() => null) : null;
    throw Object.assign(new Error(parsed?.error || error.message), { data: parsed });
  }
  return data as T;
}

const StepTitle = ({ n, title, icon: Icon }: { n: number; title: string; icon: typeof UserRound }) => (
  <div className="flex items-center gap-3 mb-4">
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">{n}</span>
    <h2 className="font-serif text-2xl flex items-center gap-2"><Icon className="h-5 w-5 text-accent" />{title}</h2>
  </div>
);

const AdminPortraitsInner = () => {
  const { toast } = useToast();
  const [person, setPerson] = useState({ first_name: '', last_name: '', birth_date: '', death_date: '', birth_place: '', death_place: '', profession: '', notes: '' });
  const [quote, setQuote] = useState('');
  const [biography, setBiography] = useState('');
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [tributes, setTributes] = useState<Tribute[]>([]);
  const [uncertain, setUncertain] = useState<string[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ slug: string; published: boolean } | null>(null);
  const [duplicateSlug, setDuplicateSlug] = useState<string | null>(null);

  useEffect(() => { document.title = 'Izrada memorijala poznatih osoba | Admin'; }, []);

  const fullName = `${person.first_name} ${person.last_name}`.trim();
  const setP = (k: keyof typeof person) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setPerson((p) => ({ ...p, [k]: e.target.value }));
  const fail = (title: string, e: unknown) => toast({ title, description: e instanceof Error ? e.message : 'Pokušajte ponovno.', variant: 'destructive' });

  const datesValid = () => {
    const t = todayIso();
    if (person.birth_date && person.birth_date > t) return 'Datum rođenja ne može biti u budućnosti.';
    if (person.death_date && person.death_date > t) return 'Datum smrti ne može biti u budućnosti.';
    if (person.birth_date && person.death_date && person.death_date < person.birth_date) return 'Datum smrti ne može biti prije rođenja.';
    return null;
  };

  const generateText = async (section: Section) => {
    setBusy(`text-${section}`);
    try {
      const r = await invoke<Record<string, any>>('generate-famous-memorial', { ...person, section });
      if (section === 'all') {
        setPerson((p) => ({
          ...p,
          birth_date: p.birth_date || r.birth_date || '', death_date: p.death_date || r.death_date || '',
          birth_place: p.birth_place || r.birth_place || '', death_place: p.death_place || r.death_place || '',
          profession: p.profession || r.profession || '',
        }));
        if (r.birth_date) setPerson((p) => ({ ...p, birth_date: r.birth_date }));
        if (r.death_date) setPerson((p) => ({ ...p, death_date: r.death_date }));
        if (r.birth_place) setPerson((p) => ({ ...p, birth_place: r.birth_place }));
        if (r.death_place) setPerson((p) => ({ ...p, death_place: r.death_place }));
        if (r.profession) setPerson((p) => ({ ...p, profession: r.profession }));
        setUncertain(Array.isArray(r.uncertain) ? r.uncertain : []);
        setWarning(r.person_known === false ? (r.warning || 'AI ne prepoznaje ovu osobu – provjerite podatke.') : r.warning || null);
      }
      if (section === 'all' || section === 'quote') setQuote(r.quote || '');
      if (section === 'all' || section === 'biography') setBiography(r.biography || '');
      if (section === 'all' || section === 'events') setEvents((r.events || []).map((e: any) => ({ year: e.year ?? null, title: e.title || '', description: e.description || '' })));
      if (section === 'all' || section === 'tributes') setTributes((r.tributes || []).map((t: any) => ({ author_name: t.author_name || '', relationship: t.relationship || '', message: t.message || '' })));
    } catch (e) { fail('Izrada teksta nije uspjela', e); } finally { setBusy(null); }
  };

  const generatePortrait = async () => {
    setBusy('photos');
    try {
      const r = await invoke<{ storage_path: string }>('generate-famous-portrait', {
        full_name: fullName, profession: person.profession || undefined,
      });
      setGeneratedImage(r.storage_path);
      setCoverPath(r.storage_path);
      toast({ title: 'Slika je generirana' });
    } catch (e) { fail('Izrada slike nije uspjela', e); } finally { setBusy(null); }
  };

  const start = async () => {
    if (!person.first_name.trim() || !person.last_name.trim()) return toast({ title: 'Upišite ime i prezime.', variant: 'destructive' });
    const err = datesValid();
    if (err) return toast({ title: err, variant: 'destructive' });
    // Očisti sve podatke prethodne osobe prije nove izrade
    setSaved(null); setDuplicateSlug(null); setGeneratedImage(null); setCoverPath(null);
    setQuote(''); setBiography(''); setEvents([]); setTributes([]);
    setUncertain([]); setWarning(null);
    setPerson((p) => ({ first_name: p.first_name, last_name: p.last_name, birth_date: '', death_date: '', birth_place: '', death_place: '', profession: '', notes: p.notes }));
    setStep(2);
    try {
      await invoke<Record<string, any>>('generate-famous-memorial', { ...person, section: 'all' }).then((r) => {
        setPerson((p) => ({
          ...p,
          birth_date: r.birth_date || p.birth_date, death_date: r.death_date || p.death_date,
          birth_place: r.birth_place || p.birth_place, death_place: r.death_place || p.death_place,
          profession: r.profession || p.profession,
        }));
        setUncertain(Array.isArray(r.uncertain) ? r.uncertain : []);
        setWarning(r.person_known === false ? (r.warning || 'AI ne prepoznaje ovu osobu – provjerite podatke.') : r.warning || null);
        setQuote(r.quote || ''); setBiography(r.biography || '');
        setEvents((r.events || []).map((e: any) => ({ year: e.year ?? null, title: e.title || '', description: e.description || '' })));
        setTributes((r.tributes || []).map((t: any) => ({ author_name: t.author_name || '', relationship: t.relationship || '', message: t.message || '' })));
      });
    } catch (e: any) {
      if (e?.data?.person_alive) {
        setStep(1);
        toast({ title: 'Osoba je i dalje živa', description: e.message, variant: 'destructive' });
        return;
      }
      fail('Izrada teksta nije uspjela', e);
      return;
    }
    await generatePortrait();
  };



  const save = async (publish: boolean) => {
    const err = datesValid();
    if (err) return toast({ title: err, variant: 'destructive' });
    if (!person.death_date) return toast({ title: 'Nema datuma smrti — memorijal se ne izrađuje za žive osobe.', variant: 'destructive' });
    if (!biography.trim()) return toast({ title: 'Biografija je prazna.', variant: 'destructive' });
    if (events.some((e) => e.title.trim() && !validLifeEventYear(e.year))) {
      return toast({ title: 'Unesite provjerenu godinu za svaki događaj ili uklonite događaj bez poznate godine.', variant: 'destructive' });
    }
    if (!coverPath) return toast({ title: 'Slika još nije generirana.', variant: 'destructive' });
    setBusy(publish ? 'publish' : 'draft');
    setDuplicateSlug(null);
    try {
      const realImages = generatedImage ? [{ storage_path: generatedImage, title: fullName, description: 'AI generiran portret' }] : [];
      const r = await invoke<{ slug: string; published: boolean }>('save-famous-memorial', {
        ...person,
        birth_date: person.birth_date || null, death_date: person.death_date || null,
        quote, biography,
        events: events.filter((e) => e.title.trim()).map((e) => ({ ...e, year: e.year ? Number(e.year) : null })),
        tributes: tributes.filter((t) => t.author_name.trim() && t.message.trim()),
        images: realImages,
        cover_path: coverPath, publish,
      });
      setSaved(r);
      setStep(3);
      toast({ title: publish ? 'Memorijal je objavljen' : 'Memorijal je spremljen kao skica' });
    } catch (e: any) {
      if (e?.data?.existing_slug) setDuplicateSlug(e.data.existing_slug);
      fail('Spremanje nije uspjelo', e);
    } finally { setBusy(null); }
  };

  const RegenButton = ({ section }: { section: Section }) => (
    <Button type="button" size="sm" variant="outline" onClick={() => generateText(section)} disabled={Boolean(busy)}>
      {busy === `text-${section}` ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}Ponovno generiraj
    </Button>
  );
  const flag = (key: string) => uncertain.includes(key) ? <Badge variant="outline" className="ml-2 text-destructive border-destructive">provjeriti</Badge> : null;

  const allImages: { path: string; label: string }[] = generatedImage ? [{ path: generatedImage, label: 'AI generiran portret' }] : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <Badge variant="secondary" className="mb-3">Administracija</Badge>
            <h1 className="font-serif text-3xl md:text-4xl flex items-center gap-3"><Wand2 className="h-8 w-8 text-accent" /> Izrada memorijala poznatih osoba</h1>
            <p className="mt-2 text-muted-foreground">Upišite osobu – alat priprema biografiju, važne godine, citat, sjećanja i fotografije. Sve možete urediti prije spremanja.</p>
          </div>

          {/* Korak 1 */}
          <Card><CardContent className="p-5 md:p-6">
            <StepTitle n={1} title="Osoba" icon={UserRound} />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Ime *</Label><Input value={person.first_name} onChange={setP('first_name')} placeholder="npr. Oliver" /></div>
              <div className="space-y-2"><Label>Prezime *</Label><Input value={person.last_name} onChange={setP('last_name')} placeholder="npr. Dragojević" /></div>
              <div className="space-y-2 md:col-span-2"><Label>Napomene za izradu (neobavezno)</Label><Textarea rows={2} value={person.notes} onChange={setP('notes')} placeholder="npr. naglasi glazbenu karijeru i vezu s Dalmacijom" /></div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Alat sam pronalazi datume, mjesta, zanimanje i fotografije te piše sav tekst. Sve možete pregledati i ispraviti prije spremanja.</p>
            <Button className="mt-5" size="lg" onClick={start} disabled={Boolean(busy)}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}Izradi memorijal
            </Button>
          </CardContent></Card>

          {step >= 2 && (<>
            {warning && <div className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm"><AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />{warning}</div>}

            <Card><CardContent className="p-5 md:p-6 space-y-6">
              <StepTitle n={2} title="Pregled i uređivanje" icon={BookOpen} />
              {busy === 'text-all' && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Pišem biografiju i važne godine…</p>}

              <section className="rounded-md bg-secondary/50 p-4 space-y-3">
                <Label className="text-base">Pronađeni podaci — provjerite i po potrebi ispravite</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1"><Label className="text-xs">Datum rođenja {flag('birth_date')}</Label><Input type="date" max={person.death_date || todayIso()} value={person.birth_date} onChange={setP('birth_date')} /></div>
                  <div className="space-y-1"><Label className="text-xs">Datum smrti {flag('death_date')}</Label><Input type="date" min={person.birth_date || undefined} max={todayIso()} value={person.death_date} onChange={setP('death_date')} /></div>
                  <div className="space-y-1"><Label className="text-xs">Mjesto rođenja {flag('birth_place')}</Label><Input value={person.birth_place} onChange={setP('birth_place')} /></div>
                  <div className="space-y-1"><Label className="text-xs">Mjesto smrti {flag('death_place')}</Label><Input value={person.death_place} onChange={setP('death_place')} /></div>
                  <div className="space-y-1 md:col-span-2"><Label className="text-xs">Zanimanje {flag('profession')}</Label><Input value={person.profession} onChange={setP('profession')} /></div>
                </div>
              </section>

              <section className="space-y-2">
                <div className="flex items-center justify-between"><Label className="text-base">Misao u spomen</Label><RegenButton section="quote" /></div>
                <Textarea rows={2} value={quote} onChange={(e) => setQuote(e.target.value)} />
              </section>

              <section className="space-y-2">
                <div className="flex items-center justify-between"><Label className="text-base">Biografija</Label><RegenButton section="biography" /></div>
                <Textarea rows={12} value={biography} onChange={(e) => setBiography(e.target.value)} />
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between"><Label className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4" />Važne godine</Label><RegenButton section="events" /></div>
                {events.map((ev, i) => (
                  <div key={i} className="grid gap-2 md:grid-cols-[90px_1fr_2fr_auto] items-start">
                    <Input type="number" placeholder="Godina" value={ev.year ?? ''} onChange={(e) => setEvents((c) => c.map((x, j) => j === i ? { ...x, year: e.target.value ? Number(e.target.value) : null } : x))} />
                    <Input placeholder="Naslov" value={ev.title} onChange={(e) => setEvents((c) => c.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
                    <Textarea rows={2} placeholder="Opis" value={ev.description} onChange={(e) => setEvents((c) => c.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
                    <Button variant="ghost" size="icon" aria-label="Ukloni događaj" onClick={() => setEvents((c) => c.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setEvents((c) => [...c, { year: null, title: '', description: '' }])}><Plus className="h-4 w-4 mr-1" />Dodaj događaj</Button>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between"><Label className="text-base">Sjećanja</Label><RegenButton section="tributes" /></div>
                {tributes.map((t, i) => (
                  <div key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_auto] rounded-md border p-3">
                    <Input placeholder="Ime i prezime" value={t.author_name} onChange={(e) => setTributes((c) => c.map((x, j) => j === i ? { ...x, author_name: e.target.value } : x))} />
                    <Input placeholder="Odnos (npr. Štovatelj)" value={t.relationship} onChange={(e) => setTributes((c) => c.map((x, j) => j === i ? { ...x, relationship: e.target.value } : x))} />
                    <Button variant="ghost" size="icon" aria-label="Ukloni sjećanje" onClick={() => setTributes((c) => c.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                    <Textarea className="md:col-span-3" rows={3} placeholder="Poruka" value={t.message} onChange={(e) => setTributes((c) => c.map((x, j) => j === i ? { ...x, message: e.target.value } : x))} />
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setTributes((c) => [...c, { author_name: '', relationship: '', message: '' }])}><Plus className="h-4 w-4 mr-1" />Dodaj sjećanje</Button>
              </section>
            </CardContent></Card>

            <Card><CardContent className="p-5 md:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-serif text-xl flex items-center gap-2"><Camera className="h-5 w-5 text-accent" />Naslovna slika</h3>
                <Button size="sm" variant="outline" onClick={generatePortrait} disabled={Boolean(busy)}>
                  {busy === 'photos' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}Ponovno generiraj sliku
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Alat automatski generira jedan dostojanstven portret osobe koji se koristi kao naslovna slika memorijala.</p>
              {!generatedImage && busy !== 'photos' && <p className="text-sm text-muted-foreground">Slika još nije generirana.</p>}
              {busy === 'photos' && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Generiranje slike u tijeku…</p>}

              {generatedImage && (
                <div className="max-w-xs rounded-md border overflow-hidden ring-2 ring-accent">
                  <div className="relative aspect-[4/5] bg-secondary">
                    <img src={mediaPublicUrl(generatedImage)} alt={fullName} className="h-full w-full object-cover object-top" />
                  </div>
                  <div className="p-2 text-xs text-muted-foreground">AI generiran portret · naslovna slika</div>
                </div>
              )}
            </CardContent></Card>

            <Card><CardContent className="p-5 md:p-6">
              <StepTitle n={3} title="Spremanje" icon={Save} />
              <p className="text-sm text-muted-foreground mb-4">Bit će spremljeno: biografija, {events.length} događaja, {tributes.length} sjećanja i {allImages.length} slika.</p>
              {duplicateSlug && (
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 p-3 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive" />Za ovu osobu memorijal već postoji.
                  <Button asChild size="sm" variant="outline"><Link to={`/memorijal/${duplicateSlug}`}>Otvori postojeći</Link></Button>
                </div>
              )}
              {saved ? (
                <div className="flex flex-wrap items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-accent" />{saved.published ? 'Memorijal je objavljen.' : 'Memorijal je spremljen kao skica.'}
                  <Button asChild><Link to={`/memorijal/${saved.slug}`}>Otvori memorijal</Link></Button>
                  <Button asChild variant="outline"><Link to={`/memorijal/${saved.slug}/uredi`}>Uredi memorijal</Link></Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" size="lg" onClick={() => save(false)} disabled={Boolean(busy)}>
                    {busy === 'draft' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Spremi kao skicu
                  </Button>
                  <Button size="lg" onClick={() => save(true)} disabled={Boolean(busy)}>
                    {busy === 'publish' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Spremi i objavi
                  </Button>
                </div>
              )}
            </CardContent></Card>
          </>)}
        </div>
      </main>
      <Footer />
    </div>
  );
};

const AdminPortraits = () => <AdminGuard><AdminPortraitsInner /></AdminGuard>;
export default AdminPortraits;
