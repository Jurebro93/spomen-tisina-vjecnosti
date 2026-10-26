import { trackFunnel, getAttribution, type FunnelStep } from '@/lib/funnel';
import { trackInitiateCheckout, trackMemorialStarted, trackPersonSelected, trackStartMemorial } from '@/lib/metaPixel';
import { trackGa4BeginCheckout, trackGa4MemorialStarted, trackGa4PersonSearch, trackGa4PersonSelected } from '@/lib/ga4Ecommerce';
import { readMemorialPrefill, trackStartFromBlog } from '@/lib/blogTracking';
import { requestBillingDetails } from '@/lib/billing';
import type { User } from '@supabase/supabase-js';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar, Check, Eye, Globe, Link2, Loader2, Lock, MapPin, UserPlus } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RichTextEditor from '@/components/memorial/RichTextEditor';
import PhotoUploader, { type MediaItem } from '@/components/memorial/PhotoUploader';
import MemorialContent from '@/components/memorial/MemorialContent';
import GuestAccountStep from '@/components/memorial/GuestAccountStep';
import MemorialHelp from '@/components/memorial/MemorialHelp';
import DraftEmailCard, { readDraftEmailAddress, writeDraftEmailState } from '@/components/memorial/DraftEmailCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  DECEASED_FIELDS, RELATIONSHIPS, formatCroatianDate, fetchDeceased, fetchMemorialForDeceased,
  lifeYears, fullName, mediaPublicUrl, memorialUrl, type Deceased, type Memorial, type MemorialVisibility,
} from '@/lib/memorial';
import { claimDraft, createDraftMemorial, DuplicateMemorialError, ensureAuthToken, updateMemorial } from '@/lib/memorialActions';
import PromoCodeField from '@/components/promo/PromoCodeField';
import PurchaseTerms, { EMPTY_CONSENT, consentBody, payButtonLabel, type PurchaseConsent } from '@/components/promo/PurchaseTerms';
import { MEMORIAL_PRICE_EUR } from '@/lib/memorial';
import MemorialValueSummary from '@/components/promo/MemorialValueSummary';
import { formatEur, type AppliedPromo } from '@/lib/promo';
import { isBot } from '@/lib/isBot';
const defaultObituaryPhoto = "/site/default-obituary-photo.jpg";

// Step 1 (e-mail for the draft) is shown to guests only; signed-in visitors go from 0 straight to 2.
const STEPS = ['Osoba', 'E-mail', 'Priča i fotografije', 'Pregled i plaćanje'];
const STEP_FUNNEL: FunnelStep[] = ['flow_osoba', 'flow_email', 'flow_prica', 'flow_pregled'];

const VISIBILITY_OPTIONS: Array<{ value: MemorialVisibility; icon: React.ElementType; title: string; text: string }> = [
  { value: 'public', icon: Globe, title: 'Javno', text: 'Svatko može pronaći i posjetiti memorijal.' },
  { value: 'unlisted', icon: Link2, title: 'Samo putem poveznice', text: 'Memorijal se ne prikazuje u pretraživanju, ali ga može otvoriti svatko tko ima poveznicu.' },
  { value: 'private', icon: Lock, title: 'Privatno', text: 'Samo pozvani članovi obitelji mogu vidjeti memorijal.' },
];

/** "Ivan Horvat" -> ime Ivan, prezime Horvat (the last word is the surname). */
const splitName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { ime: parts[0] ?? '', prezime: '' };
  return { ime: parts.slice(0, -1).join(' '), prezime: parts[parts.length - 1] };
};

const ManualDeceasedForm = ({ initialName, onCreated, onCancel }: {
  initialName: string; onCreated: (d: Deceased) => void; onCancel: () => void;
}) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [form, setForm] = useState(() => ({
    ...splitName(initialName), datum_rodenja: '', datum_smrti: '',
    mjesto_rodenja: '', mjesto_smrti: '', groblje: '', profesija: '',
  }));

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD u lokalnoj zoni

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (form.datum_rodenja > today) {
      toast({ title: 'Neispravan datum', description: 'Datum rođenja ne može biti u budućnosti.', variant: 'destructive' });
      return;
    }
    if (form.datum_smrti > today) {
      toast({ title: 'Neispravan datum', description: 'Datum smrti ne može biti u budućnosti.', variant: 'destructive' });
      return;
    }
    if (form.datum_rodenja && form.datum_smrti && form.datum_smrti < form.datum_rodenja) {
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
        <h2 className="font-serif text-2xl mb-2">Osnovni podaci o osobi</h2>
        <p className="text-muted-foreground">Dovoljno je ime i prezime. Datume upišite ako ih znate, a ako ne znate točan datum, ostavite prazno.</p>
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
          <Label htmlFor="m-rodenja">Datum rođenja</Label>
          <Input id="m-rodenja" type="date" value={form.datum_rodenja} onChange={set('datum_rodenja')} max={form.datum_smrti && form.datum_smrti < today ? form.datum_smrti : today} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="m-smrti">Datum smrti</Label>
          <Input id="m-smrti" type="date" value={form.datum_smrti} onChange={set('datum_smrti')} min={form.datum_rodenja || undefined} max={today} />
        </div>
      </div>
      {moreOpen ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      ) : (
        <button type="button" onClick={() => setMoreOpen(true)} className="text-sm text-accent underline underline-offset-4">
          + Mjesto rođenja, mjesto smrti, groblje, profesija (neobavezno)
        </button>
      )}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button type="submit" disabled={saving || !form.ime.trim() || !form.prezime.trim()}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Nastavi
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Natrag</Button>
      </div>
    </form>
  );
};

type PersonSource = 'existing' | 'new';

type OwnDraft = { id: string; updated_at: string; obituaries: { ime: string; prezime: string } | null };

type ResumeNotice = { text: string; login?: boolean };

const RESUME_NOTICES: Record<'elsewhere' | 'account' | 'done', ResumeNotice> = {
  elsewhere: {
    text: 'Ovaj nacrt spremljen je u pregledniku u kojem ste ga započeli, pa ga otvorite ondje. Ako ste si poslali poveznicu e-mailom, otvorite je iz te poruke. Za rad na više uređaja na zadnjem koraku izrade napravite račun.',
  },
  account: { text: 'Ovaj nacrt spremljen je na vašem računu. Prijavite se i nastavit ćete ondje gdje ste stali.', login: true },
  done: { text: 'Ovaj memorijal više nije nacrt, pa ga ovdje ne možete nastaviti. Pronaći ćete ga u "Moji memorijali".' },
};

const OwnDrafts = ({ drafts, onResume, busyId }: { drafts: OwnDraft[]; onResume: (id: string) => void; busyId: string | null }) => (
  <div className="space-y-3">
    <h2 className="font-serif text-xl">Nastavite započeti memorijal</h2>
    {drafts.map((d) => (
      <Card key={d.id} className="border-border">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">Memorijal za {fullName(d.obituaries) || 'osobu'}</p>
            <p className="text-sm text-muted-foreground">Nacrt, zadnja izmjena {formatCroatianDate(d.updated_at)}</p>
          </div>
          <Button type="button" onClick={() => onResume(d.id)} disabled={Boolean(busyId)}>
            {busyId === d.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Nastavi
          </Button>
        </CardContent>
      </Card>
    ))}
  </div>
);

/** Obituaries matching a typed name: with two or more words both the first name and the surname must match. */
const findObituaries = async (q: string) => {
  const parts = q.split(/\s+/).filter(Boolean).map((p) => p.replace(/[,()%]/g, ''));
  const first = parts[0];
  const last = parts[parts.length - 1];
  const filter = parts.length > 1
    ? `and(ime.ilike.%${first}%,prezime.ilike.%${last}%),and(ime.ilike.%${last}%,prezime.ilike.%${first}%)`
    : `ime.ilike.%${first}%,prezime.ilike.%${first}%`;
  const { data } = await supabase
    .from('obituaries')
    .select(DECEASED_FIELDS)
    .eq('active', true)
    .or(filter)
    .order('datum_smrti', { ascending: false, nullsFirst: false })
    .limit(6);
  return (data as Deceased[]) ?? [];
};

/**
 * One question for everyone: the name. Matching obituaries are offered to save typing, and the
 * visitor never has to decide up front whether an obituary exists; with no match the person's
 * details are entered right away, name already filled in.
 */
const DeceasedSearch = ({ onSelect, onStart }: {
  onSelect: (d: Deceased, source: PersonSource) => void;
  onStart: (method: 'search' | 'manual') => void;
}) => {
  const [term, setTerm] = useState(() => readMemorialPrefill()?.name ?? '');
  const [results, setResults] = useState<Deceased[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [manual, setManual] = useState(false);

  const enterManually = () => { onStart('manual'); setManual(true); };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    if (q.length < 3 || searching) return;
    onStart('search');
    setSearching(true);
    const found = await findObituaries(q);
    setSearching(false);
    if (!found.length) { enterManually(); return; }
    setResults(found);
    setSearched(true);
  };

  if (manual) {
    return <ManualDeceasedForm initialName={term} onCreated={(d) => onSelect(d, 'new')}
      onCancel={() => { setManual(false); setSearched(false); setResults([]); }} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl mb-2">Za koga izrađujete memorijal?</h2>
        <p className="text-muted-foreground">Upišite ime i prezime. Ako osoba već ima osmrtnicu kod nas, preuzet ćemo njezine podatke.</p>
      </div>
      <form onSubmit={search} className="flex flex-col sm:flex-row gap-3">
        <Input value={term} onChange={(e) => { setTerm(e.target.value); setSearched(false); }} placeholder="npr. Ivan Horvat"
          aria-label="Ime i prezime" maxLength={100} autoComplete="off" />
        <Button type="submit" disabled={searching || term.trim().length < 3}>
          {searching && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Nastavi
        </Button>
      </form>

      {searched && results.length > 0 && (
        <div className="space-y-3">
          <p className="font-medium">Je li to netko od ovih osoba?</p>
          {results.map((d) => (
            <Card key={d.id} className="border-border">
              <CardContent className="p-4 flex items-center gap-4">
                <img src={d.fotografija_url || defaultObituaryPhoto} alt="" className="h-16 w-16 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{fullName(d)}</p>
                  <p className="text-sm text-muted-foreground">{lifeYears(d.datum_rodenja, d.datum_smrti)}</p>
                  {d.mjesto_smrti && <p className="text-sm text-muted-foreground truncate">{d.mjesto_smrti}</p>}
                </div>
                <Button type="button" onClick={() => onSelect(d, 'existing')}>Da, to je ta osoba</Button>
              </CardContent>
            </Card>
          ))}
          <Button type="button" variant="outline" className="w-full whitespace-normal h-auto py-3" onClick={enterManually}>
            <UserPlus className="h-4 w-4 mr-2 shrink-0" />Nije među njima, nastavi s imenom „{term.trim()}”
          </Button>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Izrada traje oko 10 minuta i sve se usput sprema. Plaćate tek na kraju ({formatEur(MEMORIAL_PRICE_EUR)}), kad vidite gotov memorijal.
      </p>
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
  const { toast } = useToast();

  const deceasedIdParam = params.get('deceased_id');
  // Link back to a draft (draft list, e-mail): ?nastavi=<memorial id>, from e-mails also &k=<resume token>.
  const resumeParam = params.get('nastavi');
  const resumeKey = params.get('k');
  const [deceased, setDeceased] = useState<Deceased | null>(null);
  const [personSource, setPersonSource] = useState<PersonSource>('existing');
  const [memorial, setMemorial] = useState<Memorial | null>(null);
  const [existingSlug, setExistingSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(deceasedIdParam || resumeParam));
  const [drafts, setDrafts] = useState<OwnDraft[]>([]);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [resumeNotice, setResumeNotice] = useState<ResumeNotice | null>(null);
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
    if (deceased) void trackFunnel(STEP_FUNNEL[step]);
  }, [deceased, step]);

  // Content chosen in a blog widget (dedication / song) is offered as a starting suggestion.
  useEffect(() => {
    const p = readMemorialPrefill();
    if (!p) return;
    if (p.quote) setQuote((q) => q || p.quote!.slice(0, 160));
    if (p.song) setLifeStory((v) => v || `<p>Pjesma koja nas podsjeća na nju/njega: <strong>${p.song!.replace(/[<>&]/g, '')}</strong></p>`);
  }, []);

  // The guest session starts at the visitor's first action (search, manual entry, draft, e-mailed link), not on
  // page load: crawlers opening the page created ~13.7k empty anonymous accounts on 22-24.10.2026.
  const guestStarting = useRef<Promise<User | null> | null>(null);
  const ensureUser = useCallback(async (): Promise<User | null> => {
    if (user) return user;
    if (isBot()) return null;
    if (!guestStarting.current) {
      guestStarting.current = supabase.auth.signInAnonymously().then(({ data, error }) => {
        if (!error && data.user) return data.user;
        // Guest sign-in unavailable: fall back to the regular login.
        guestStarting.current = null;
        navigate(`/prijava?redirect=${encodeURIComponent(redirectTarget)}`, { replace: true });
        return null;
      });
    }
    return guestStarting.current;
  }, [user, navigate, redirectTarget]);

  useEffect(() => {
    if (!authLoading && user) void trackFunnel('auth', { userId: user.id });
  }, [authLoading, user]);

  // Ad events (pixel + Conversions API): StartMemorial on the first search or manual entry,
  // PersonSelected once the person is chosen or saved (also when opened from an obituary link).
  const startSent = useRef(false);
  const startMemorial = useCallback(async (method: 'search' | 'manual') => {
    const u = await ensureUser();
    void trackFunnel(method === 'search' ? 'person_search' : 'person_manual', { userId: u?.id });
    trackGa4PersonSearch(method);
    if (!u || startSent.current) return;
    startSent.current = true;
    trackStartMemorial(u.id, method);
  }, [ensureUser]);

  const personSent = useRef(false);
  useEffect(() => {
    if (!deceased || !user || personSent.current) return;
    personSent.current = true;
    trackPersonSelected(user.id, personSource);
    trackGa4PersonSelected(personSource);
  }, [deceased, user, personSource]);

  /** Loads the user's own unpaid draft into the wizard at Biografija. False when it is not theirs or not a draft. */
  const resumeDraft = useCallback(async (memorialId: string) => {
    if (!user) return false;
    const { data } = await supabase.from('memorials').select('*').eq('id', memorialId).maybeSingle();
    const draft = data as Memorial | null;
    if (!draft || draft.owner_id !== user.id || draft.status !== 'draft' || draft.paid) return false;
    const [person, events, files] = await Promise.all([
      fetchDeceased(draft.deceased_id).catch(() => null),
      supabase.from('memorial_life_events').select('title, event_year, description')
        .eq('memorial_id', draft.id).order('sort_order', { ascending: true }),
      supabase.from('memorial_media').select('*').eq('memorial_id', draft.id).order('sort_order', { ascending: true }),
    ]);
    if (!person) return false;
    const rel = draft.relationship ?? '';
    const known = RELATIONSHIPS.includes(rel);
    setRelationship(known ? rel : rel ? 'drugo' : '');
    setCustomRelationship(known ? '' : rel);
    setQuote(draft.quote ?? '');
    setLifeStory(draft.life_story ?? '');
    setVisibility(draft.visibility);
    setLifeEvents(((events.data ?? []) as Array<{ title: string; event_year: number | null; description: string | null }>)
      .map((e) => ({ title: e.title, event_year: e.event_year, description: e.description ?? '' })));
    setMedia((files.data as MediaItem[]) ?? []);
    // Reopening a draft is not a new start: no second StartMemorial or PersonSelected.
    startSent.current = true;
    personSent.current = true;
    setPersonSource(person.active === true ? 'existing' : 'new');
    setMemorial(draft);
    setDeceased(person);
    setExistingSlug(null);
    setResumeNotice(null);
    setStep(2);
    void trackFunnel('draft_resumed', { userId: user.id, memorialId: draft.id });
    return true;
  }, [user]);

  const findOwnDraftId = useCallback(async (deceasedId: string) => {
    if (!user) return null;
    const { data } = await supabase.from('memorials').select('id')
      .eq('deceased_id', deceasedId).eq('owner_id', user.id).eq('status', 'draft').maybeSingle();
    return (data as { id: string } | null)?.id ?? null;
  }, [user]);

  // The visitor's unfinished drafts, offered above the person search.
  const userId = user?.id;
  useEffect(() => {
    if (!userId || deceased) return;
    let active = true;
    supabase.from('memorials').select('id, updated_at, obituaries(ime, prezime)')
      .eq('owner_id', userId).eq('status', 'draft').eq('paid', false)
      .order('updated_at', { ascending: false }).limit(5)
      .then(({ data }) => { if (active) setDrafts((data as unknown as OwnDraft[]) ?? []); });
    return () => { active = false; };
  }, [userId, deceased]);

  const resumeFromList = async (memorialId: string) => {
    if (resumingId) return;
    setResumingId(memorialId);
    try {
      if (!(await resumeDraft(memorialId))) {
        setDrafts((prev) => prev.filter((d) => d.id !== memorialId));
        toast({ title: 'Nacrt nije moguće otvoriti', description: 'Pokušajte ponovno.', variant: 'destructive' });
      }
    } finally {
      setResumingId(null);
    }
  };

  // ?nastavi=<id>: open the draft once; from another browser the e-mailed token moves it to this session first.
  const resumeHandled = useRef(false);
  useEffect(() => {
    // Claiming a draft from the e-mailed link needs a session in this browser.
    if (resumeParam && !authLoading && !user) void ensureUser();
  }, [resumeParam, authLoading, user, ensureUser]);
  useEffect(() => {
    if (!resumeParam || authLoading || !user || resumeHandled.current) return;
    resumeHandled.current = true;
    (async () => {
      try {
        if (await resumeDraft(resumeParam)) return;
        if (!resumeKey) { setResumeNotice(RESUME_NOTICES.elsewhere); return; }
        const claim = await claimDraft(resumeParam, resumeKey);
        // Opened from the e-mailed link, so the e-mail for this draft is already known.
        if (claim === 'ok') writeDraftEmailState(resumeParam, 'sent');
        if (claim === 'ok' && await resumeDraft(resumeParam)) return;
        setResumeNotice(claim === 'has_account' ? RESUME_NOTICES.account : claim === 'not_draft' ? RESUME_NOTICES.done : RESUME_NOTICES.elsewhere);
      } catch {
        setResumeNotice(RESUME_NOTICES.elsewhere);
      } finally {
        setLoading(false);
      }
    })();
  }, [resumeParam, resumeKey, authLoading, user, resumeDraft]);

  const selectPerson = async (d: Deceased, source: PersonSource) => {
    // Picking the person of one's own draft again continues that draft instead of "already exists".
    if (source === 'existing') {
      const ownDraftId = await findOwnDraftId(d.id);
      if (ownDraftId && await resumeDraft(ownDraftId)) return;
    }
    setPersonSource(source);
    setDeceased(d);
    setStep(0);
  };

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

  // ?deceased_id= (obituary link): waits for the session check so a returning visitor's own draft is found.
  const personHandled = useRef(false);
  useEffect(() => {
    if (!deceasedIdParam) { if (!resumeParam) setLoading(false); return; }
    if (resumeParam || authLoading || personHandled.current) return;
    personHandled.current = true;
    (async () => {
      try {
        const [person, existing] = await Promise.all([
          fetchDeceased(deceasedIdParam),
          fetchMemorialForDeceased(deceasedIdParam),
        ]);
        if (existing?.status === 'draft' && user && await resumeDraft(existing.id)) return;
        setDeceased(person);
        if (existing) setExistingSlug(existing.slug);
      } catch {
        setDeceased(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [deceasedIdParam, resumeParam, authLoading, user, resumeDraft]);

  const ensureDraft = useCallback(async (rel: string | null) => {
    const owner = await ensureUser();
    if (!deceased || !owner) return null;
    if (memorial) {
      if (memorial.relationship !== rel) {
        const updated = await updateMemorial(memorial.id, { relationship: rel });
        setMemorial(updated);
        return updated;
      }
      return memorial;
    }
    const created = await createDraftMemorial(deceased, owner.id, rel);
    setMemorial(created);
    void trackFunnel('draft_saved', { userId: owner.id, memorialId: created.id });
    trackMemorialStarted(created.id);
    trackGa4MemorialStarted(created.id);
    return created;
  }, [deceased, ensureUser, memorial]);

  const goNextFromRelationship = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const rel = relationship === 'drugo' ? customRelationship.trim() : relationship;
      const draft = await ensureDraft(rel || null);
      // Straight to the story: a separate e-mail screen here lost 6 of 8 guests (23.-26.10.2026).
      // Guests are offered the draft link as a card on the story step instead.
      if (draft) setStep(2);
    } catch (error) {
      if (error instanceof DuplicateMemorialError) {
        const ownDraftId = deceased ? await findOwnDraftId(deceased.id) : null;
        if (ownDraftId && await resumeDraft(ownDraftId)) return;
        if (error.existingSlug) setExistingSlug(error.existingSlug);
        else {
          // Someone else's unpublished draft: its slug is not readable, so say so instead of doing nothing.
          toast({
            title: 'Za ovu osobu već se izrađuje memorijal',
            description: 'Netko ga je već započeo. Ako ste član obitelji, javite nam se putem stranice Kontakt.',
            variant: 'destructive',
          });
        }
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

  const handlePublish = async () => {
    // Guests set an e-mail and password first (GuestAccountStep), so every paid memorial has a login.
    if (!memorial || !user || isGuest || busy) return;
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
        chosenPromo = promo?.free ? promo.code : await requestBillingDetails(memorial.id, promo?.code ?? null);
      } catch {
        setBusy(false);
        return;
      }
      const meta = trackInitiateCheckout(memorial.id, MEMORIAL_PRICE_EUR);
      void trackFunnel('checkout_started', { userId: user.id, memorialId: memorial.id });
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

  const helpStep = !deceased ? 'Za koga izrađujete memorijal' : step === 0 ? 'Osoba' : step === 2 ? 'Priča i fotografije' : 'Pregled i plaćanje';
  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Kreirajte digitalni memorijal</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 md:py-14">
        <div className="max-w-3xl mx-auto">
          {children}
          <MemorialHelp step={helpStep} memorialId={memorial?.id} person={deceased ? fullName(deceased) : ''} />
        </div>
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
    return shell(
      <div className="space-y-10">
        {resumeNotice && (
          <Card className="border-border">
            <CardContent className="p-6 space-y-3">
              <p className="font-medium">Nacrt nije otvoren u ovom pregledniku</p>
              <p className="text-sm text-muted-foreground">{resumeNotice.text}</p>
              {resumeNotice.login && (
                <Button asChild><Link to={`/prijava?redirect=${encodeURIComponent(`/kreiraj-memorijal?nastavi=${resumeParam}`)}`}>Prijava</Link></Button>
              )}
            </CardContent>
          </Card>
        )}
        {drafts.length > 0 && <OwnDrafts drafts={drafts} onResume={resumeFromList} busyId={resumingId} />}
        <DeceasedSearch onStart={startMemorial} onSelect={selectPerson} />
      </div>
    );
  }

  const cover = media.find((m) => m.is_cover) ?? media[0] ?? null;
  const storyPreview = (quote.trim() || lifeStory.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim().slice(0, 160);
  // Index 1 (the former e-mail step) is no longer shown; indexes stay so funnel step names keep their meaning.
  const shownSteps = STEPS.map((label, index) => ({ label, index })).filter(({ index }) => index !== 1);

  return shell(
    <div className="space-y-8">
      <ol className="flex flex-wrap gap-2 text-xs" aria-label="Koraci izrade">
        {shownSteps.map(({ label, index }, position) => (
          <li key={label} className={`px-3 py-1 rounded-full border ${index === step ? 'bg-primary text-primary-foreground border-primary' : index < step ? 'border-accent text-accent' : 'border-border text-muted-foreground'}`}>
            {position + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-6">
          <h1 className="font-serif text-2xl md:text-3xl">Kreirajte digitalni memorijal za {fullName(deceased)}</h1>
          <Card className="border-border">
            <CardContent className="p-5 flex gap-5">
              <img src={deceased.fotografija_url || defaultObituaryPhoto} alt={`Fotografija: ${fullName(deceased)}`}
                className="w-20 h-24 sm:w-24 sm:h-32 object-cover rounded-md shrink-0" />
              <div className="space-y-1.5 text-sm min-w-0">
                <p className="font-serif text-xl text-foreground">{fullName(deceased)}</p>
                {(deceased.datum_rodenja || deceased.datum_smrti) && (
                  <p className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4 shrink-0" /> {lifeYears(deceased.datum_rodenja, deceased.datum_smrti)}</p>
                )}
                {(deceased.mjesto_smrti || deceased.mjesto_rodenja) && (
                  <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" /> {deceased.mjesto_smrti || deceased.mjesto_rodenja}</p>
                )}
                {deceased.groblje && <p className="text-muted-foreground">Groblje: {deceased.groblje}</p>}
                {deceased.slug && deceased.active === true && (
                  <a href={`/${deceased.slug}`} className="inline-block text-xs text-muted-foreground underline underline-offset-4">Prijavi netočan podatak</a>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="font-serif text-xl">Vi ste pokojniku… <span className="text-sm font-sans text-muted-foreground">(neobavezno)</span></h2>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Odnos s pokojnikom">
              {RELATIONSHIPS.map((option) => (
                <button key={option} type="button" role="radio" aria-checked={relationship === option}
                  onClick={() => setRelationship(relationship === option ? '' : option)}
                  className={`rounded-full border px-4 py-2 text-sm ${relationship === option ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-secondary'}`}>
                  {option}
                </button>
              ))}
            </div>
            {relationship === 'drugo' && (
              <Input
                id="rel-custom"
                aria-label="Upišite svoj odnos s pokojnikom"
                maxLength={60}
                placeholder="npr. kum, susjed, kolega s posla…"
                value={customRelationship}
                onChange={(e) => setCustomRelationship(e.target.value)}
              />
            )}
          </div>
          <Button onClick={goNextFromRelationship} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Nastavi
          </Button>
        </div>
      )}

      {step === 2 && memorial && (
        <div className="space-y-6">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl mb-2">Priča i fotografije</h1>
            <p className="text-sm text-muted-foreground">
              Sve na ovoj stranici možete preskočiti i dopuniti kasnije, i nakon objave. Važne događaje iz života (životni put) dodajete u uređivanju memorijala.
            </p>
          </div>
          {isGuest && user && <DraftEmailCard memorialId={memorial.id} userId={user.id} />}
          <div className="space-y-2">
            <Label htmlFor="quote">Kratki citat</Label>
            <Input id="quote" value={quote} maxLength={160} placeholder="Zauvijek u našim srcima."
              onChange={(e) => setQuote(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Životna priča</Label>
            <RichTextEditor value={lifeStory} onChange={setLifeStory}
              placeholder="Nekoliko rečenica je dovoljno: kakva je osoba bila, što je voljela, po čemu je pamtite…" />
          </div>
          <div className="space-y-2">
            <Label>Fotografije</Label>
            <PhotoUploader memorialId={memorial.id} media={media} onChange={setMedia} />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(0)}>Natrag</Button>
            <Button onClick={() => saveDraftFields(3)} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Nastavi
            </Button>
          </div>
        </div>
      )}

      {step === 3 && memorial && (
        <div className="space-y-6">
          <h1 className="font-serif text-2xl md:text-3xl flex items-center gap-2"><Eye className="h-5 w-5 text-accent" />Pregled memorijala</h1>
          {/* A short summary instead of the whole memorial: the full preview made this screen ~3,500 px tall on a phone. */}
          <Card className="border-border">
            <CardContent className="p-4 flex gap-4">
              <img src={(cover && mediaPublicUrl(cover.storage_path)) || deceased.fotografija_url || defaultObituaryPhoto} alt=""
                className="w-20 h-24 object-cover rounded-md shrink-0" />
              <div className="min-w-0 space-y-1">
                <p className="font-serif text-xl">{fullName(deceased)}</p>
                <p className="text-sm text-muted-foreground">{lifeYears(deceased.datum_rodenja, deceased.datum_smrti)}</p>
                {storyPreview && <p className="text-sm text-muted-foreground line-clamp-2">{storyPreview}</p>}
                <p className="text-xs text-muted-foreground">
                  {media.length ? `Fotografija: ${media.length}` : 'Fotografije možete dodati i nakon objave'}
                </p>
              </div>
            </CardContent>
          </Card>
          <details className="group">
            <summary className="cursor-pointer text-sm text-accent underline underline-offset-4">Pogledaj cijeli pregled memorijala</summary>
            <div className="mt-3 rounded-lg border border-border overflow-hidden">
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
          </details>
          <div className="space-y-3">
            <h2 className="font-serif text-xl">Tko može vidjeti memorijal?</h2>
            <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as MemorialVisibility)} className="space-y-2">
              {VISIBILITY_OPTIONS.map(({ value, icon: Icon, title, text }) => (
                <Label key={value} htmlFor={`vis-${value}`}
                  className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-secondary font-normal">
                  <RadioGroupItem id={`vis-${value}`} value={value} className="mt-1" />
                  <span>
                    <span className="flex items-center gap-2 font-medium"><Icon className="h-4 w-4 text-accent" />{title}</span>
                    <span className="block text-sm text-muted-foreground mt-0.5">{text}</span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
            <p className="text-xs text-muted-foreground">Ovo možete promijeniti i kasnije.</p>
          </div>
          <MemorialValueSummary />
          <PromoCodeField
            productType="memorial"
            productLabel="memorijala"
            basePrice={MEMORIAL_PRICE_EUR}
            applied={promo}
            onApplied={setPromo}
          />
          {isGuest && <GuestAccountStep initialEmail={readDraftEmailAddress(memorial.id)} />}
          <PurchaseTerms value={consent} onChange={setConsent} promo={promo} />
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="gold" onClick={handlePublish} disabled={busy || isGuest || !consent.termsAccepted}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              {payButtonLabel(promo)}
            </Button>
            <Button variant="outline" onClick={handleSaveDraft} disabled={busy}>Spremi kao skicu</Button>
            <Button variant="ghost" onClick={() => setStep(2)}>Natrag</Button>
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
