import { trackFunnel, getAttribution, type FunnelStep } from '@/lib/funnel';
import { trackInitiateCheckout, trackMemorialStarted, trackStartMemorial } from '@/lib/metaPixel';
import { trackGa4BeginCheckout, trackGa4MemorialStarted } from '@/lib/ga4Ecommerce';
import { readMemorialPrefill, trackStartFromBlog } from '@/lib/blogTracking';
import { requestBillingDetails } from '@/lib/billing';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar, Check, Eye, Globe, Link2, Loader2, Lock, MapPin, Plus, Search, Trash2, UserPlus } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RichTextEditor from '@/components/memorial/RichTextEditor';
import PhotoUploader, { type MediaItem } from '@/components/memorial/PhotoUploader';
import MemorialContent from '@/components/memorial/MemorialContent';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  DECEASED_FIELDS, RELATIONSHIPS, formatCroatianDate, fetchDeceased, fetchMemorialForDeceased,
  lifeYears, fullName, memorialUrl, type Deceased, type Memorial, type MemorialVisibility,
} from '@/lib/memorial';
import { createDraftMemorial, DuplicateMemorialError, ensureAuthToken, updateMemorial } from '@/lib/memorialActions';
import PromoCodeField from '@/components/promo/PromoCodeField';
import PurchaseTerms, { EMPTY_CONSENT, consentBody, payButtonLabel, type PurchaseConsent } from '@/components/promo/PurchaseTerms';
import { MEMORIAL_PRICE_EUR } from '@/lib/memorial';
import MemorialValueSummary from '@/components/promo/MemorialValueSummary';
import { validLifeEventYear } from '@/lib/lifeEventYear';
import { formatEur, type AppliedPromo } from '@/lib/promo';
const defaultObituaryPhoto = "/site/default-obituary-photo.jpg";

const STEPS = ['Osoba', 'Vaš odnos', 'Biografija', 'Životni put', 'Fotografije', 'Privatnost', 'Pregled'];

const VISIBILITY_OPTIONS: Array<{ value: MemorialVisibility; icon: React.ElementType; title: string; text: string }> = [
  { value: 'public', icon: Globe, title: 'Javno', text: 'Svatko može pronaći i posjetiti memorijal.' },
  { value: 'unlisted', icon: Link2, title: 'Samo putem poveznice', text: 'Memorijal se ne prikazuje u pretraživanju, ali ga može otvoriti svatko tko ima poveznicu.' },
  { value: 'private', icon: Lock, title: 'Privatno', text: 'Samo pozvani članovi obitelji mogu vidjeti memorijal.' },
];

const ManualDeceasedForm = ({ onCreated, onCancel }: { onCreated: (d: Deceased) => void; onCancel: () => void }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    ime: '', prezime: '', datum_rodenja: '', datum_smrti: '',
    mjesto_rodenja: '', mjesto_smrti: '', groblje: '', profesija: '',
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD u lokalnoj zoni

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.datum_rodenja) {
      toast({ title: 'Nedostaje datum', description: 'Unesite datum rođenja.', variant: 'destructive' });
      return;
    }
    if (!form.datum_smrti) {
      toast({ title: 'Nedostaje datum', description: 'Unesite datum smrti.', variant: 'destructive' });
      return;
    }
    if (form.datum_rodenja > today) {
      toast({ title: 'Neispravan datum', description: 'Datum rođenja ne može biti u budućnosti.', variant: 'destructive' });
      return;
    }
    if (form.datum_smrti > today) {
      toast({ title: 'Neispravan datum', description: 'Datum smrti ne može biti u budućnosti.', variant: 'destructive' });
      return;
    }
    if (form.datum_smrti < form.datum_rodenja) {
      toast({ title: 'Neispravan datum', description: 'Datum smrti ne može biti prije datuma rođenja.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('create_memorial_person', {
        _ime: form.ime.trim(),
        _prezime: form.prezime.trim(),
        _datum_rodenja: form.datum_rodenja || null,
        _datum_smrti: form.datum_smrti || null,
        _mjesto_rodenja: form.mjesto_rodenja.trim() || null,
        _mjesto_smrti: form.mjesto_smrti.trim() || null,
        _groblje: form.groblje.trim() || null,
        _profesija: form.profesija.trim() || null,
      });
      if (error) throw error;
      if (!data) throw new Error('No data');
      onCreated(data as unknown as Deceased);
    } catch {
      toast({
        title: 'Nije uspjelo',
        description: 'Podatke nije bilo moguće spremiti. Pokušajte ponovno.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl mb-2">Unesite podatke o osobi</h2>
        <p className="text-muted-foreground">
          Osoba nije u našoj bazi osmrtnica, pa ćete osnovne podatke unijeti sami. Memorijal će biti u potpunosti
          funkcionalan, samo neće imati poveznicu na osmrtnicu.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="m-ime">Ime *</Label>
          <Input id="m-ime" value={form.ime} onChange={set('ime')} maxLength={60} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="m-prezime">Prezime *</Label>
          <Input id="m-prezime" value={form.prezime} onChange={set('prezime')} maxLength={60} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="m-rodenja">Datum rođenja *</Label>
          <Input id="m-rodenja" type="date" value={form.datum_rodenja} onChange={set('datum_rodenja')} required max={form.datum_smrti && form.datum_smrti < today ? form.datum_smrti : today} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="m-smrti">Datum smrti *</Label>
          <Input id="m-smrti" type="date" value={form.datum_smrti} onChange={set('datum_smrti')} required min={form.datum_rodenja || undefined} max={today} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="m-mjesto-r">Mjesto rođenja</Label>
          <Input id="m-mjesto-r" value={form.mjesto_rodenja} onChange={set('mjesto_rodenja')} maxLength={80} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="m-mjesto-s">Mjesto smrti</Label>
          <Input id="m-mjesto-s" value={form.mjesto_smrti} onChange={set('mjesto_smrti')} maxLength={80} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="m-groblje">Groblje</Label>
          <Input id="m-groblje" value={form.groblje} onChange={set('groblje')} maxLength={80} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="m-profesija">Profesija</Label>
          <Input id="m-profesija" value={form.profesija} onChange={set('profesija')} maxLength={80} />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button type="submit" disabled={saving || !form.ime.trim() || !form.prezime.trim() || !form.datum_rodenja || !form.datum_smrti}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Nastavi
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Natrag na pretragu</Button>
      </div>
    </form>
  );
};

const DeceasedSearch = ({ onSelect }: { onSelect: (d: Deceased) => void }) => {
  const [term, setTerm] = useState(() => readMemorialPrefill()?.name ?? '');
  const [results, setResults] = useState<Deceased[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [manual, setManual] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    if (q.length < 3 || searching) return;
    setSearching(true);
    const parts = q.split(/\s+/);
    const filters = [`ime.ilike.%${q}%`, `prezime.ilike.%${q}%`];
    if (parts.length > 1) {
      filters.push(`ime.ilike.%${parts[0]}%`, `prezime.ilike.%${parts[parts.length - 1]}%`);
    }
    const { data } = await supabase
      .from('obituaries')
      .select(DECEASED_FIELDS)
      .eq('active', true)
      .or(filters.join(','))
      .limit(20);
    setResults((data as Deceased[]) ?? []);
    setSearched(true);
    setSearching(false);
  };

  if (manual) return <ManualDeceasedForm onCreated={onSelect} onCancel={() => setManual(false)} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl mb-2">Postoji li osmrtnica ove osobe na našoj stranici?</h2>
        <p className="text-muted-foreground">Pretražite našu bazu osmrtnica kako ne bismo ponovno unosili podatke koje već imamo.</p>
      </div>
      <form onSubmit={search} className="flex flex-col sm:flex-row gap-3">
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Ime i prezime" aria-label="Ime i prezime"
          maxLength={100} />
        <Button type="submit" disabled={searching || term.trim().length < 3}>
          {searching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
          Pretraži
        </Button>
      </form>

      {searched && !results.length && (
        <Card className="border-border">
          <CardContent className="p-6 space-y-3">
            <p className="font-medium">Ne mogu pronaći osobu</p>
            <p className="text-sm text-muted-foreground">
              Nema problema – memorijal možete kreirati i bez postojeće osmrtnice. Podatke o osobi unijet ćete sami,
              a memorijal neće imati poveznicu na osmrtnicu.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button type="button" onClick={() => setManual(true)}>
                <UserPlus className="h-4 w-4 mr-2" />Unesi podatke ručno
              </Button>
              <Button asChild variant="outline"><Link to="/objavi-osmrtnicu">Objavi osmrtnicu</Link></Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {results.map((d) => (
          <Card key={d.id} className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <img src={d.fotografija_url || defaultObituaryPhoto} alt="" className="h-16 w-16 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{fullName(d)}</p>
                <p className="text-sm text-muted-foreground">{lifeYears(d.datum_rodenja, d.datum_smrti)}</p>
                {d.mjesto_smrti && <p className="text-sm text-muted-foreground truncate">{d.mjesto_smrti}</p>}
              </div>
              <Button type="button" onClick={() => onSelect(d)}>Odaberi</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="border-t border-border pt-6">
        <p className="text-sm text-muted-foreground mb-3">
          Osoba nije u našoj bazi osmrtnica? Memorijal možete kreirati i bez osmrtnice – podatke unosite sami.
        </p>
        <Button type="button" variant="outline" onClick={() => setManual(true)}>
          <UserPlus className="h-4 w-4 mr-2" />Kreiraj memorijal bez osmrtnice
        </Button>
      </div>
    </div>
  );
};

const KreirajMemorijal = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user: accountUser, guestUser, loading: authLoading } = useAuth();
  // Visitors may start without an account: a guest session holds the draft until checkout.
  const user = accountUser ?? guestUser;
  const isGuest = !accountUser && Boolean(guestUser);
  const guestStarting = useRef(false);
  const { toast } = useToast();

  const deceasedIdParam = params.get('deceased_id');
  const [deceased, setDeceased] = useState<Deceased | null>(null);
  const [memorial, setMemorial] = useState<Memorial | null>(null);
  const [existingSlug, setExistingSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(deceasedIdParam));
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [consent, setConsent] = useState<PurchaseConsent>(EMPTY_CONSENT);

  const [relationship, setRelationship] = useState('');
  const [customRelationship, setCustomRelationship] = useState('');

  const [quote, setQuote] = useState('');
  const [lifeStory, setLifeStory] = useState('');
  const [visibility, setVisibility] = useState<MemorialVisibility>('public');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [lifeEvents, setLifeEvents] = useState<Array<{ title: string; event_year: number | null; description: string }>>([]);

  useLayoutEffect(() => {
    const scrollToPageTop = () => {
      if (window.location.hash) {
        window.history.replaceState(
          window.history.state,
          '',
          `${window.location.pathname}${window.location.search}`
        );
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    scrollToPageTop();
    const frame = window.requestAnimationFrame(scrollToPageTop);
    return () => window.cancelAnimationFrame(frame);
  }, [step, deceased]);

  const redirectTarget = useMemo(
    () => `/kreiraj-memorijal${deceasedIdParam ? `?deceased_id=${encodeURIComponent(deceasedIdParam)}` : ''}`,
    [deceasedIdParam]
  );

  useEffect(() => { void trackFunnel('start_create'); trackStartFromBlog(); }, []);
  // Wizard drop-off: one count per step reached in this tab (shown in Admin → Statistika → Google i ponašanje).
  useEffect(() => {
    if (deceased) void trackFunnel(`wizard_${step + 1}` as FunnelStep);
  }, [deceased, step]);

  // Content chosen in a blog widget (dedication / song) is offered as a starting suggestion.
  useEffect(() => {
    const p = readMemorialPrefill();
    if (!p) return;
    if (p.quote) setQuote((q) => q || p.quote!.slice(0, 160));
    if (p.song) setLifeStory((v) => v || `<p>Pjesma koja nas podsjeća na nju/njega: <strong>${p.song!.replace(/[<>&]/g, '')}</strong></p>`);
  }, []);

  useEffect(() => {
    if (!authLoading && !user && !guestStarting.current) {
      guestStarting.current = true;
      supabase.auth.signInAnonymously().then(({ error }) => {
        // Guest sign-in unavailable: fall back to the regular login.
        if (error) navigate(`/prijava?redirect=${encodeURIComponent(redirectTarget)}`, { replace: true });
      });
    }
    if (!authLoading && user) void trackFunnel('auth', { userId: user.id });
  }, [authLoading, user, navigate, redirectTarget]);

  const startSent = useRef(false);
  useEffect(() => {
    if (!deceased || !user || startSent.current) return;
    startSent.current = true;
    trackStartMemorial(user.id);
  }, [deceased, user]);

  // Returned from Stripe via the cancel link — a separate event, never "abandoned".
  useEffect(() => {
    const returnedFor = params.get('otkazano') ? params.get('memorial') : null;
    if (!returnedFor || !user) return;
    void supabase.rpc('mark_checkout_returned' as never, { _memorial_id: returnedFor } as never);
    void trackFunnel('checkout_returned', { userId: user.id, memorialId: returnedFor });
    toast({
      title: 'Plaćanje nije dovršeno',
      description: 'Uplata nije izvršena. Memorijal je spremljen kao skica — možete ponovno pokušati plaćanje.',
      variant: 'destructive',
    });
  }, [params, user]);

  useEffect(() => {
    if (!deceasedIdParam) { setLoading(false); return; }
    let active = true;
    (async () => {
      try {
        const [person, existing] = await Promise.all([
          fetchDeceased(deceasedIdParam),
          fetchMemorialForDeceased(deceasedIdParam),
        ]);
        if (!active) return;
        setDeceased(person);
        if (existing) setExistingSlug(existing.slug);
      } catch {
        if (active) setDeceased(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [deceasedIdParam]);

  const ensureDraft = useCallback(async (rel: string | null) => {
    if (!deceased || !user) return null;
    if (memorial) {
      if (memorial.relationship !== rel) {
        const updated = await updateMemorial(memorial.id, { relationship: rel });
        setMemorial(updated);
        return updated;
      }
      return memorial;
    }
    const created = await createDraftMemorial(deceased, user.id, rel);
    setMemorial(created);
    void trackFunnel('draft_saved', { userId: user.id, memorialId: created.id });
    trackMemorialStarted(created.id);
    trackGa4MemorialStarted(created.id);
    return created;
  }, [deceased, user, memorial]);

  const goNextFromRelationship = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const rel = relationship === 'drugo' ? customRelationship.trim() : relationship;
      await ensureDraft(rel || null);

      setStep(2);
    } catch (error) {
      if (error instanceof DuplicateMemorialError) {
        setExistingSlug(error.existingSlug ?? null);
      } else {
        toast({ title: 'Nije uspjelo', description: 'Memorijal nije bilo moguće kreirati. Pokušajte ponovno.', variant: 'destructive' });
      }
    } finally {
      setBusy(false);
    }
  };

  const saveDraftFields = async (nextStep: number) => {
    if (!memorial || busy) return;
    setBusy(true);
    try {
      const updated = await updateMemorial(memorial.id, { quote: quote.trim() || null, life_story: lifeStory || null, visibility });
      setMemorial(updated);
      setStep(nextStep);
    } catch {
      toast({ title: 'Nije spremljeno', description: 'Promjene nije bilo moguće spremiti. Pokušajte ponovno.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const saveLifeEvents = async () => {
    if (!memorial || busy) return;
    const rows = lifeEvents
      .map((e, i) => ({ ...e, title: e.title.trim(), sort_order: i }))
      .filter((e) => e.title);
    if (rows.some((e) => !validLifeEventYear(e.event_year))) {
      toast({ title: 'Unesite godinu za svaki događaj.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const { error: deleteError } = await supabase.from('memorial_life_events').delete().eq('memorial_id', memorial.id);
      if (deleteError) throw deleteError;
      if (rows.length) {
        const { error } = await supabase.from('memorial_life_events').insert(
          rows.map((e) => ({
            memorial_id: memorial.id,
            title: e.title,
            event_year: e.event_year,
            description: e.description.trim() || null,
            sort_order: e.sort_order,
          }))
        );
        if (error) throw error;
      }
      setStep(4);
    } catch {
      toast({ title: 'Nije spremljeno', description: 'Događaje nije bilo moguće spremiti. Pokušajte ponovno.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = async () => {
    if (!memorial || !user || busy) return;
    setBusy(true);
    try {
      await updateMemorial(memorial.id, { quote: quote.trim() || null, life_story: lifeStory || null, visibility });
      const token = await ensureAuthToken();
      if (!token) {
        toast({
          title: 'Prijava je istekla',
          description: 'Ponovno se prijavite pa nastavite s plaćanjem. Memorijal je spremljen kao skica.',
          variant: 'destructive',
        });
        navigate(`/prijava?redirect=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`);
        return;
      }
      // Billing dialog (legal entity + promo) is always shown before Stripe.
      let chosenPromo: string | null;
      try {
        // A 100 % promo code needs no billing data — publish straight away.
        // Guests always pass through billing, which is where we first get their e-mail.
        chosenPromo = promo?.free && !isGuest ? promo.code : await requestBillingDetails(memorial.id, promo?.code ?? null);
      } catch {
        setBusy(false);
        return;
      }
      const meta = trackInitiateCheckout(memorial.id, MEMORIAL_PRICE_EUR);
      // The server re-validates the promo code and decides the amount; we only send the code.
      const { data, error } = await supabase.functions.invoke('create-memorial-payment', {
        body: { memorial_id: memorial.id, promo_code: chosenPromo, attribution: getAttribution(), ...consentBody(consent), meta },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) {
        let message = '';
        try {
          const body = await (error as { context?: Response }).context?.json();
          message = body?.error ?? '';
        } catch { /* ignore */ }
        if (message === 'Neautorizirani korisnik') {
          toast({
            title: 'Prijava je istekla',
            description: 'Ponovno se prijavite pa nastavite s plaćanjem. Memorijal je spremljen kao skica.',
            variant: 'destructive',
          });
          navigate(`/prijava?redirect=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`);
          return;
        }
        if (message) {
          toast({ title: 'Promo kod', description: message, variant: 'destructive' });
          setPromo(null);
          setBusy(false);
          return;
        }
        throw error;
      }
      if (data?.free) {
        const params = new URLSearchParams({ besplatno: '1', memorial: memorial.id });
        if (data.slug) params.set('slug', data.slug as string);
        if (data.promo_code) params.set('kod', data.promo_code as string);
        navigate(`/zahvaljujemo?${params.toString()}`, { replace: true });
        return;
      }
      if (!data?.url) throw new Error('Nema URL-a za plaćanje');
      trackGa4BeginCheckout(memorial.id, MEMORIAL_PRICE_EUR);
      window.location.href = data.url as string;
    } catch {
      toast({ title: 'Plaćanje nije moguće započeti', description: 'Pokušajte ponovno ili nas kontaktirajte.', variant: 'destructive' });
      setBusy(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!memorial || busy) return;
    setBusy(true);
    try {
      await updateMemorial(memorial.id, { quote: quote.trim() || null, life_story: lifeStory || null, visibility });
      if (isGuest) {
        // "Moji memorijali" needs an account, so a guest keeps working here.
        toast({ title: 'Skica je spremljena', description: 'Skica ostaje u ovom pregledniku. Dovršite memorijal kad budete spremni.' });
        return;
      }
      toast({ title: 'Skica je spremljena', description: 'Memorijal možete dovršiti kasnije iz "Moji memorijali".' });
      navigate('/moji-memorijali');
    } catch {
      toast({ title: 'Nije spremljeno', description: 'Promjene nije bilo moguće spremiti. Pokušajte ponovno.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></main>
        <Footer />
      </div>
    );
  }

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Kreirajte digitalni memorijal</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 md:py-14">
        <div className="max-w-3xl mx-auto">{children}</div>
      </main>
      <Footer />
    </div>
  );

  if (existingSlug) {
    return shell(
      <Card className="border-border">
        <CardContent className="p-8 text-center space-y-4">
          <h1 className="font-serif text-2xl">Za ovu osobu već postoji digitalni memorijal.</h1>
          <p className="text-muted-foreground">Možete ga posjetiti ili zatražiti pristup uređivanju kao član obitelji.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild><Link to={memorialUrl(existingSlug)}>Posjetite memorijal</Link></Button>
            <Button asChild variant="outline"><Link to={`${memorialUrl(existingSlug)}?zatrazi=1`}>Zatražite pristup</Link></Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!deceased) {
    return shell(<DeceasedSearch onSelect={(d) => { setDeceased(d); setStep(0); }} />);
  }

  const cover = media.find((m) => m.is_cover) ?? media[0] ?? null;

  return shell(
    <div className="space-y-8">
      <ol className="flex flex-wrap gap-2 text-xs" aria-label="Koraci izrade">
        {STEPS.map((label, index) => (
          <li key={label} className={`px-3 py-1 rounded-full border ${index === step ? 'bg-primary text-primary-foreground border-primary' : index < step ? 'border-accent text-accent' : 'border-border text-muted-foreground'}`}>
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-6">
          <h1 className="font-serif text-2xl md:text-3xl">Kreirajte digitalni memorijal za {fullName(deceased)}</h1>
          <Card className="border-border">
            <CardContent className="p-6 flex flex-col sm:flex-row gap-6">
              <img src={deceased.fotografija_url || defaultObituaryPhoto} alt={`Fotografija: ${fullName(deceased)}`}
                className="w-32 h-40 object-cover rounded-md" />
              <div className="space-y-2 text-sm">
                <p className="font-serif text-xl text-foreground">{fullName(deceased)}</p>
                {deceased.datum_rodenja && (
                  <p className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4" /> Rođena/rođen {formatCroatianDate(deceased.datum_rodenja)}</p>
                )}
                {deceased.datum_smrti && (
                  <p className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4" /> Preminula/preminuo {formatCroatianDate(deceased.datum_smrti)}</p>
                )}
                {(deceased.mjesto_smrti || deceased.mjesto_rodenja) && (
                  <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> {deceased.mjesto_smrti || deceased.mjesto_rodenja}</p>
                )}
                {deceased.groblje && <p className="text-muted-foreground">Groblje: {deceased.groblje}</p>}
              </div>
            </CardContent>
          </Card>
          <p className="text-sm text-muted-foreground">
            {deceased.active === true
              ? 'Osnovne podatke preuzeli smo iz postojeće osmrtnice.'
              : 'Podatke ste unijeli sami – memorijal neće imati poveznicu na osmrtnicu.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => setStep(1)}>Nastavi</Button>
            {deceased.slug && deceased.active === true && (
              <Button asChild variant="ghost">
                <a href={`/${deceased.slug}`}>Prijavi netočan podatak</a>
              </Button>
            )}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <h1 className="font-serif text-2xl md:text-3xl">U kakvom ste odnosu s pokojnikom?</h1>
          <RadioGroup value={relationship} onValueChange={setRelationship} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {RELATIONSHIPS.map((option) => (
              <Label key={option} htmlFor={`rel-${option}`}
                className="flex items-center gap-3 rounded-md border border-border p-4 cursor-pointer hover:bg-secondary font-normal">
                <RadioGroupItem id={`rel-${option}`} value={option} />
                {option}
              </Label>
            ))}
          </RadioGroup>
          {relationship === 'drugo' && (
            <div className="space-y-2">
              <Label htmlFor="rel-custom">Upišite svoj odnos s pokojnikom</Label>
              <Input
                id="rel-custom"
                maxLength={60}
                placeholder="npr. kum, susjed, kolega s posla…"
                value={customRelationship}
                onChange={(e) => setCustomRelationship(e.target.value)}
              />
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(0)}>Natrag</Button>
            <Button onClick={goNextFromRelationship} disabled={!relationship || (relationship === 'drugo' && !customRelationship.trim()) || busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Nastavi
            </Button>

          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <h1 className="font-serif text-2xl md:text-3xl">Biografija</h1>
          <div className="space-y-2">
            <Label htmlFor="quote">Kratki citat</Label>
            <Input id="quote" value={quote} maxLength={160} placeholder="Zauvijek u našim srcima."
              onChange={(e) => setQuote(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Biografija</Label>
            <RichTextEditor value={lifeStory} onChange={setLifeStory}
              placeholder="Opišite život, karakter i najdraže uspomene…" />
            <p className="text-xs text-muted-foreground">Ovaj korak možete preskočiti i dopuniti kasnije.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>Natrag</Button>
            <Button onClick={() => saveDraftFields(3)} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Nastavi
            </Button>
          </div>
        </div>
      )}

      {step === 3 && memorial && (
        <div className="space-y-6">
          <h1 className="font-serif text-2xl md:text-3xl">Životni put</h1>
          <p className="text-sm text-muted-foreground">
            Dodajte važne trenutke — rođenje, školovanje, brak, djecu, karijeru. Ovaj korak možete preskočiti i dopuniti kasnije.
          </p>
          {lifeEvents.map((row, index) => (
            <div key={index} className="rounded-lg border border-border p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor={`ev-title-${index}`}>Naslov</Label>
                  <Input id={`ev-title-${index}`} value={row.title} maxLength={140} placeholder="npr. Rođenje, Vjenčanje…"
                    onChange={(e) => setLifeEvents((prev) => prev.map((x, i) => (i === index ? { ...x, title: e.target.value } : x)))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`ev-year-${index}`}>Godina</Label>
                  <Input id={`ev-year-${index}`} type="number" value={row.event_year ?? ''}
                    onChange={(e) => setLifeEvents((prev) => prev.map((x, i) => (i === index ? { ...x, event_year: e.target.value ? Number(e.target.value) : null } : x)))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`ev-desc-${index}`}>Opis</Label>
                <Textarea id={`ev-desc-${index}`} rows={3} maxLength={800} value={row.description}
                  onChange={(e) => setLifeEvents((prev) => prev.map((x, i) => (i === index ? { ...x, description: e.target.value } : x)))} />
              </div>
              <Button size="sm" variant="ghost" onClick={() => setLifeEvents((prev) => prev.filter((_, i) => i !== index))}>
                <Trash2 className="h-4 w-4 mr-2" />Ukloni
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={() => setLifeEvents((prev) => [...prev, { title: '', event_year: null, description: '' }])}>
            <Plus className="h-4 w-4 mr-2" />Dodaj događaj
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)}>Natrag</Button>
            <Button onClick={saveLifeEvents} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Nastavi
            </Button>
          </div>
        </div>
      )}

      {step === 4 && memorial && (
        <div className="space-y-6">
          <h1 className="font-serif text-2xl md:text-3xl">Fotografije</h1>
          <PhotoUploader memorialId={memorial.id} media={media} onChange={setMedia} />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(3)}>Natrag</Button>
            <Button onClick={() => setStep(5)}>Nastavi</Button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-6">
          <h1 className="font-serif text-2xl md:text-3xl">Privatnost</h1>
          <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as MemorialVisibility)} className="space-y-3">
            {VISIBILITY_OPTIONS.map(({ value, icon: Icon, title, text }) => (
              <Label key={value} htmlFor={`vis-${value}`}
                className="flex items-start gap-3 rounded-md border border-border p-4 cursor-pointer hover:bg-secondary font-normal">
                <RadioGroupItem id={`vis-${value}`} value={value} className="mt-1" />
                <span>
                  <span className="flex items-center gap-2 font-medium"><Icon className="h-4 w-4 text-accent" />{title}</span>
                  <span className="block text-sm text-muted-foreground mt-1">{text}</span>
                </span>
              </Label>
            ))}
          </RadioGroup>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(4)}>Natrag</Button>
            <Button onClick={() => saveDraftFields(6)} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Nastavi
            </Button>
          </div>
        </div>
      )}

      {step === 6 && memorial && (
        <div className="space-y-6">
          <h1 className="font-serif text-2xl md:text-3xl flex items-center gap-2"><Eye className="h-5 w-5 text-accent" />Pregled memorijala</h1>
          <div className="rounded-lg border border-border overflow-hidden">
            <MemorialContent
              deceased={deceased}
              memorial={{ ...memorial, quote: quote.trim() || null, life_story: lifeStory || null, visibility }}
              media={media}
              events={lifeEvents
                .filter((e) => e.title.trim())
                .map((e, i) => ({
                  id: `preview-${i}`,
                  event_date: null,
                  event_year: e.event_year,
                  title: e.title,
                  description: e.description || null,
                  sort_order: i,
                }))}
              tributes={[]}
              candles={[]}
              coverUrl={cover?.storage_path ?? null}
              preview
            />
          </div>
          <MemorialValueSummary />
          <PromoCodeField
            productType="memorial"
            productLabel="memorijala"
            basePrice={MEMORIAL_PRICE_EUR}
            applied={promo}
            onApplied={setPromo}
          />
          <PurchaseTerms value={consent} onChange={setConsent} promo={promo} />
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="gold" onClick={handlePublish} disabled={busy || !consent.termsAccepted}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              {payButtonLabel(promo)}
            </Button>
            <Button variant="outline" onClick={handleSaveDraft} disabled={busy}>Spremi kao skicu</Button>
            <Button variant="ghost" onClick={() => setStep(5)}>Natrag</Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Sigurno plaćanje karticom putem Stripea. Memorijal se objavljuje nakon potvrde uspješne naplate, prema odabranom početku usluge.
          </p>
        </div>
      )}
    </div>
  );
};

export default KreirajMemorijal;
