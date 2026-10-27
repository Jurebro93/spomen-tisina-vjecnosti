import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  AlertTriangle, Archive, Check, CreditCard, Eye, Globe, Loader2, Lock, Mail, Plus, Save,
  Trash2, UserPlus, X,
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CitiesSection from '@/components/CitiesSection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RichTextEditor from '@/components/memorial/RichTextEditor';
import PhotoUploader, { type MediaItem } from '@/components/memorial/PhotoUploader';
import ShareBar from '@/components/memorial/ShareBar';
import PayMemorialDialog from '@/components/promo/PayMemorialDialog';
import { supabase } from '@/integrations/supabase/client';
import {
  DECEASED_FIELDS, VISIBILITY_LABELS, formatCroatianDate, friendlyError, fullName,
  lifeYears, mediaPublicUrl, memorialAbsoluteUrl, type Deceased, type ManagerRole, type Memorial,
} from '@/lib/memorial';
import { currentMemorialPriceLabel } from '@/lib/seasonalPromo';
import {
  addManagerByEmailInvite, archiveMemorial, changeVisibility, deleteMemorial, moderateEntry,
  publishMemorial, resolveAccessRequest, startMemorialPayment, updateMemorial,
} from '@/lib/memorialActions';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { validLifeEventYear } from '@/lib/lifeEventYear';

interface EventRow {
  id: string;
  event_year: number | null;
  event_date: string | null;
  title: string;
  description: string | null;
  sort_order: number;
}

interface TributeRow {
  id: string;
  author_name: string;
  relationship: string | null;
  title: string | null;
  message: string;
  photo_path: string | null;
  status: string;
  created_at: string;
}

interface CandleRow {
  id: string;
  visitor_name: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

interface RequestRow {
  id: string;
  requester_user_id: string;
  relationship: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

interface ManagerRow {
  id: string;
  user_id: string;
  role: ManagerRole;
}

const UrediMemorijal = () => {
  const { slug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [canModerate, setCanModerate] = useState(false);
  const [memorial, setMemorial] = useState<Memorial | null>(null);
  const [deceased, setDeceased] = useState<Deceased | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [tributes, setTributes] = useState<TributeRow[]>([]);
  const [candles, setCandles] = useState<CandleRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [managers, setManagers] = useState<ManagerRow[]>([]);

  const [quote, setQuote] = useState('');
  const [story, setStory] = useState('');
  const [saving, setSaving] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Exclude<ManagerRole, 'owner'>>('editor');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/prijava?redirect=${encodeURIComponent(`/memorijal/${slug}/uredi${searchParams.get('tab') === 'uspomene' ? '?tab=uspomene' : ''}`)}`, { replace: true });
    }
  }, [authLoading, user, navigate, slug, searchParams]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data: m } = await supabase.from('memorials').select('*').eq('slug', slug).maybeSingle();
      if (!active) return;
      if (!m) { setLoading(false); setAllowed(false); return; }
      const mem = m as Memorial;
      setMemorial(mem);
      setQuote(mem.quote ?? '');
      setStory(mem.life_story ?? '');

      const [edit, moderate] = await Promise.all([
        supabase.rpc('can_edit_memorial', { _memorial_id: mem.id }),
        supabase.rpc('can_moderate_memorial', { _memorial_id: mem.id }),
      ]);
      if (!active) return;
      setAllowed(edit.data === true);
      setCanModerate(moderate.data === true);
      if (edit.data !== true) { setLoading(false); return; }

      const [d, md, ev, tr, ca, rq, mg] = await Promise.all([
        supabase.from('obituaries').select(DECEASED_FIELDS).eq('id', mem.deceased_id).maybeSingle(),
        supabase.from('memorial_media').select('*').eq('memorial_id', mem.id).order('sort_order', { ascending: true }),
        supabase.from('memorial_life_events').select('*').eq('memorial_id', mem.id).order('sort_order', { ascending: true }),
        supabase.from('memorial_tributes').select('id,author_name,relationship,title,message,photo_path,status,created_at')
          .eq('memorial_id', mem.id).order('created_at', { ascending: false }),
        supabase.from('memorial_candles').select('id,visitor_name,message,status,created_at')
          .eq('memorial_id', mem.id).order('created_at', { ascending: false }),
        supabase.from('memorial_access_requests').select('id,requester_user_id,relationship,message,status,created_at')
          .eq('memorial_id', mem.id).order('created_at', { ascending: false }),
        supabase.from('memorial_managers').select('id,user_id,role').eq('memorial_id', mem.id),
      ]);
      if (!active) return;
      setDeceased((d.data as Deceased) ?? null);
      setMedia((md.data as MediaItem[]) ?? []);
      setEvents((ev.data as EventRow[]) ?? []);
      setTributes((tr.data as TributeRow[]) ?? []);
      setCandles((ca.data as CandleRow[]) ?? []);
      setRequests((rq.data as RequestRow[]) ?? []);
      setManagers((mg.data as ManagerRow[]) ?? []);
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [user, slug]);

  const patch = async (values: Partial<Memorial>, message = 'Promjene su spremljene.') => {
    if (!memorial) return;
    setSaving(true);
    try {
      const updated = await updateMemorial(memorial.id, values);
      setMemorial(updated);
      toast({ title: message });
    } catch (error) {
      toast({ title: 'Nije spremljeno', description: friendlyError(error), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const addEvent = async () => {
    if (!memorial) return;
    const { data, error } = await supabase
      .from('memorial_life_events')
      .insert({ memorial_id: memorial.id, title: 'Novi događaj', sort_order: events.length })
      .select('*')
      .single();
    if (error) {
      toast({ title: 'Nije dodano', description: friendlyError(error), variant: 'destructive' });
      return;
    }
    setEvents((prev) => [...prev, data as EventRow]);
  };

  const saveEvent = async (row: EventRow) => {
    if (!row.event_date && !validLifeEventYear(row.event_year)) {
      toast({ title: 'Unesite godinu događaja prije spremanja.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase
      .from('memorial_life_events')
      .update({ title: row.title, event_year: row.event_year, event_date: row.event_date, description: row.description })
      .eq('id', row.id);
    toast(error
      ? { title: 'Nije spremljeno', description: friendlyError(error), variant: 'destructive' }
      : { title: 'Događaj je spremljen.' });
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase.from('memorial_life_events').delete().eq('id', id);
    if (error) {
      toast({ title: 'Nije obrisano', description: friendlyError(error), variant: 'destructive' });
      return;
    }
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const moderate = async (
    table: 'memorial_tributes' | 'memorial_candles',
    id: string,
    decision: 'approved' | 'rejected'
  ) => {
    if (!memorial || !user || !canModerate) return;
    try {
      await moderateEntry(table, id, memorial.id, user.id, decision);
      if (table === 'memorial_tributes') {
        setTributes((prev) => prev.map((t) => (t.id === id ? { ...t, status: decision } : t)));
      } else {
        setCandles((prev) => prev.map((c) => (c.id === id ? { ...c, status: decision } : c)));
      }
      toast({ title: decision === 'approved' ? 'Sjećanje je odobreno i objavljeno.' : 'Sjećanje je odbijeno.' });
    } catch (error) {
      toast({ title: 'Nije uspjelo', description: friendlyError(error), variant: 'destructive' });
    }
  };

  const resolveRequest = async (row: RequestRow, decision: 'approved' | 'rejected') => {
    if (!memorial || !user) return;
    try {
      await resolveAccessRequest(row.id, memorial.id, row.requester_user_id, user.id, decision);
      setRequests((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: decision } : r)));
      toast({ title: decision === 'approved' ? 'Pristup je odobren.' : 'Zahtjev je odbijen.' });
    } catch (error) {
      toast({ title: 'Nije uspjelo', description: friendlyError(error), variant: 'destructive' });
    }
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memorial || !user) return;
    setInviting(true);
    try {
      await addManagerByEmailInvite(memorial.id, user.id, inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      toast({ title: 'Pozivnica je poslana', description: 'Osoba će e-mailom dobiti poziv za suradnju.' });
    } catch (error) {
      toast({ title: 'Pozivnica nije poslana', description: friendlyError(error), variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  const removeManager = async (row: ManagerRow) => {
    const { error } = await supabase.from('memorial_managers').delete().eq('id', row.id);
    if (error) {
      toast({ title: 'Nije uklonjeno', description: friendlyError(error), variant: 'destructive' });
      return;
    }
    setManagers((prev) => prev.filter((m) => m.id !== row.id));
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center py-32"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  if (!memorial || !allowed) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-20 max-w-xl text-center space-y-4">
          <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
          <h1 className="font-serif text-2xl">Nemate pristup uređivanju</h1>
          <p className="text-muted-foreground">
            Ovaj memorijal ne postoji ili vam obitelj još nije odobrila uređivanje.
          </p>
          <Button asChild><Link to="/moji-memorijali">Moji memorijali</Link></Button>
        </main>
        <CitiesSection />
        <Footer />
      </div>
    );
  }

  const name = fullName(deceased);
  const pendingTributes = tributes.filter((t) => t.status === 'pending').length;
  const pendingCandles = candles.filter((c) => c.status === 'pending').length;
  const pendingRequests = requests.filter((r) => r.status === 'pending').length;
  const isPaid = memorial.paid === true;
  const isOwner = memorial.owner_id === user?.id;

  const handleDelete = async () => {
    if (!window.confirm(`Trajno obrisati memorijal za ${name}? Sve fotografije, uspomene i svijeće bit će obrisane. Ovu radnju nije moguće vratiti.`)) return;
    setSaving(true);
    try {
      await deleteMemorial(memorial.id);
      toast({ title: 'Memorijal je obrisan.' });
      navigate('/moji-memorijali', { replace: true });
    } catch (error) {
      toast({ title: 'Nije obrisano', description: friendlyError(error), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{`Uredi memorijal — ${name}`.slice(0, 60)}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-sm text-muted-foreground">Uređivanje memorijala</p>
            <h1 className="font-serif text-3xl md:text-4xl">{name}</h1>
            <p className="text-muted-foreground mt-1">{lifeYears(deceased?.datum_rodenja, deceased?.datum_smrti)}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="secondary">{memorial.status === 'published' ? 'Objavljen' : memorial.status === 'draft' ? 'Skica' : 'Arhiviran'}</Badge>
              <Badge variant="outline">{VISIBILITY_LABELS[memorial.visibility]}</Badge>
              <Badge variant={isPaid ? 'outline' : 'destructive'}>{isPaid ? 'Plaćeno' : 'Nije plaćeno'}</Badge>
            </div>
            {!isPaid && (
              <p className="text-sm text-muted-foreground mt-3 max-w-md">
                Memorijal je vidljiv samo vama. Nakon uplate ({currentMemorialPriceLabel()}) automatski se objavljuje
                i možete ga podijeliti s drugima.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to={`/memorijal/${memorial.slug}`}><Eye className="h-4 w-4 mr-2" /> Pogledaj memorijal</Link>
            </Button>
            {!isPaid ? (
              <Button variant="gold" disabled={saving || !isOwner} onClick={() => setPayOpen(true)}>
                <CreditCard className="h-4 w-4 mr-2" /> Plati i objavi ({currentMemorialPriceLabel()})
              </Button>
            ) : memorial.status !== 'published' ? (
              <Button disabled={saving} onClick={async () => {
                if (!user) return;
                setSaving(true);
                try {
                  setMemorial(await publishMemorial(memorial.id, user.id));
                  toast({ title: 'Memorijal je objavljen.' });
                } catch (error) {
                  toast({ title: 'Nije objavljeno', description: friendlyError(error), variant: 'destructive' });
                } finally { setSaving(false); }
              }}>
                <Globe className="h-4 w-4 mr-2" /> Objavi memorijal
              </Button>
            ) : (
              <Button variant="outline" disabled={saving || !canModerate} onClick={async () => {
                if (!user) return;
                setSaving(true);
                try {
                  setMemorial(await archiveMemorial(memorial.id, user.id));
                  toast({ title: 'Memorijal je arhiviran.' });
                } catch (error) {
                  toast({ title: 'Nije arhivirano', description: friendlyError(error), variant: 'destructive' });
                } finally { setSaving(false); }
              }}>
                <Archive className="h-4 w-4 mr-2" /> Arhiviraj
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue={searchParams.get('tab') === 'uspomene' ? 'uspomene' : 'sadrzaj'} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="sadrzaj">Sadržaj</TabsTrigger>
            <TabsTrigger value="fotografije">Fotografije</TabsTrigger>
            <TabsTrigger value="dogadaji">Životni put</TabsTrigger>
            <TabsTrigger value="uspomene">
              Uspomene{pendingTributes + pendingCandles > 0 ? ` (${pendingTributes + pendingCandles})` : ''}
            </TabsTrigger>
            <TabsTrigger value="pristup">
              Pristup{pendingRequests > 0 ? ` (${pendingRequests})` : ''}
            </TabsTrigger>
            <TabsTrigger value="privatnost">Privatnost</TabsTrigger>
            <TabsTrigger value="dijeljenje">Dijeljenje</TabsTrigger>
          </TabsList>

          <TabsContent value="sadrzaj">
            <Card>
              <CardHeader><CardTitle className="font-serif">Citat i biografija</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="quote">Citat ili misao</Label>
                  <Textarea id="quote" rows={3} maxLength={300} value={quote} onChange={(e) => setQuote(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Biografija</Label>
                  <RichTextEditor value={story} onChange={setStory} placeholder="Ispričajte priču o životu voljene osobe…" />
                </div>
                <Button disabled={saving} onClick={() => patch({ quote: quote.trim() || null, life_story: story || null })}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Spremi promjene
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fotografije">
            <Card>
              <CardHeader><CardTitle className="font-serif">Galerija</CardTitle></CardHeader>
              <CardContent>
                <PhotoUploader memorialId={memorial.id} media={media} onChange={setMedia} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dogadaji">
            <Card>
              <CardHeader><CardTitle className="font-serif">Životni put</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {events.length === 0 && (
                  <p className="text-sm text-muted-foreground">Dodajte važne trenutke — rođenje, školovanje, brak, djecu, karijeru.</p>
                )}
                {events.map((row, index) => (
                  <div key={row.id} className="rounded-lg border border-border p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Naslov</Label>
                        <Input value={row.title} maxLength={140}
                          onChange={(e) => setEvents((prev) => prev.map((x, i) => (i === index ? { ...x, title: e.target.value } : x)))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Godina *</Label>
                        <Input type="number" value={row.event_year ?? ''}
                          onChange={(e) => setEvents((prev) => prev.map((x, i) => (i === index ? { ...x, event_year: e.target.value ? Number(e.target.value) : null } : x)))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Opis</Label>
                      <Textarea rows={3} maxLength={800} value={row.description ?? ''}
                        onChange={(e) => setEvents((prev) => prev.map((x, i) => (i === index ? { ...x, description: e.target.value } : x)))} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEvent(row)}><Save className="h-4 w-4 mr-2" /> Spremi</Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteEvent(row.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Ukloni
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={addEvent}><Plus className="h-4 w-4 mr-2" /> Dodaj događaj</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="uspomene" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="font-serif">Poslane uspomene</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {tributes.length === 0 && <p className="text-sm text-muted-foreground">Još nema poslanih uspomena.</p>}
                {tributes.map((t) => (
                  <div key={t.id} className="rounded-lg border border-border p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <div>
                        <p className="font-medium">{t.author_name}{t.relationship ? ` — ${t.relationship}` : ''}</p>
                        <p className="text-xs text-muted-foreground">{formatCroatianDate(t.created_at)}</p>
                      </div>
                      <Badge variant={t.status === 'approved' ? 'secondary' : 'outline'}>
                        {t.status === 'approved' ? 'Objavljeno' : t.status === 'rejected' ? 'Odbijeno' : 'Čeka odobrenje'}
                      </Badge>
                    </div>
                    {t.title && <p className="font-serif text-lg">{t.title}</p>}
                    <p className="text-sm whitespace-pre-line">{t.message}</p>
                    {t.photo_path && (
                      <img src={mediaPublicUrl(t.photo_path) ?? ''} alt={`Fotografija — ${t.author_name}`} loading="lazy"
                        className="max-h-48 rounded-md object-cover" />
                    )}
                    <div className="flex gap-2">
                      {canModerate && t.status !== 'approved' && (
                        <Button size="sm" onClick={() => moderate('memorial_tributes', t.id, 'approved')}>
                          <Check className="h-4 w-4 mr-2" /> Odobri
                        </Button>
                      )}
                      {canModerate && t.status !== 'rejected' && (
                        <Button size="sm" variant="ghost" onClick={() => moderate('memorial_tributes', t.id, 'rejected')}>
                          <X className="h-4 w-4 mr-2" /> Odbij
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-serif">Svijeće</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {candles.length === 0 && <p className="text-sm text-muted-foreground">Još nema zapaljenih svijeća.</p>}
                {candles.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
                    <div>
                      <p className="font-medium">{c.visitor_name || 'Anonimno'}</p>
                      {c.message && <p className="text-sm text-muted-foreground">{c.message}</p>}
                      <p className="text-xs text-muted-foreground">{formatCroatianDate(c.created_at)}</p>
                    </div>
                    <div className="flex gap-2">
                      {c.status !== 'approved' && (
                        <Button size="sm" onClick={() => moderate('memorial_candles', c.id, 'approved')}>
                          <Check className="h-4 w-4 mr-2" /> Odobri
                        </Button>
                      )}
                      {c.status !== 'rejected' && (
                        <Button size="sm" variant="ghost" onClick={() => moderate('memorial_candles', c.id, 'rejected')}>
                          <X className="h-4 w-4 mr-2" /> Odbij
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pristup" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="font-serif">Zahtjevi za pristup</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {requests.length === 0 && <p className="text-sm text-muted-foreground">Nema zahtjeva za pristup.</p>}
                {requests.map((r) => (
                  <div key={r.id} className="rounded-lg border border-border p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{r.relationship || 'Odnos nije naveden'}</p>
                      <Badge variant="outline">
                        {r.status === 'pending' ? 'Čeka odluku' : r.status === 'approved' ? 'Odobreno' : 'Odbijeno'}
                      </Badge>
                    </div>
                    {r.message && <p className="text-sm text-muted-foreground">{r.message}</p>}
                    <p className="text-xs text-muted-foreground">{formatCroatianDate(r.created_at)}</p>
                    {r.status === 'pending' && canModerate && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => resolveRequest(r, 'approved')}>
                          <Check className="h-4 w-4 mr-2" /> Odobri uređivanje
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => resolveRequest(r, 'rejected')}>
                          <X className="h-4 w-4 mr-2" /> Odbij
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-serif">Suradnici</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {managers.map((m) => (
                    <li key={m.id} className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                      <span className="text-sm">
                        {m.user_id === user?.id ? 'Vi' : 'Suradnik'} — {m.role === 'owner' ? 'Vlasnik' : m.role === 'admin' ? 'Administrator' : 'Urednik'}
                      </span>
                      {canModerate && m.role !== 'owner' && (
                        <Button size="sm" variant="ghost" onClick={() => removeManager(m)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
                {canModerate && (
                  <form onSubmit={invite} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Pozovi suradnika e-mailom</Label>
                      <Input id="invite-email" type="email" required maxLength={255} value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)} placeholder="ime@primjer.hr" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-role">Uloga</Label>
                      <select id="invite-role" value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as Exclude<ManagerRole, 'owner'>)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="editor">Urednik</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                    <Button type="submit" disabled={inviting}>
                      {inviting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                      Pošalji poziv
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privatnost">
            <Card>
              <CardHeader><CardTitle className="font-serif">Privatnost i interakcije</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="visibility">Vidljivost memorijala</Label>
                  <select id="visibility" value={memorial.visibility}
                    onChange={async (e) => {
                      if (!user) return;
                      const value = e.target.value as Memorial['visibility'];
                      try {
                        setMemorial(await changeVisibility(memorial.id, user.id, value));
                        toast({ title: 'Vidljivost je promijenjena.' });
                      } catch (error) {
                        toast({ title: 'Nije spremljeno', description: friendlyError(error), variant: 'destructive' });
                      }
                    }}
                    className="h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm">
                    <option value="public">Javno — vidljivo svima i tražilicama</option>
                    <option value="unlisted">Samo s poveznicom — nije u tražilicama</option>
                    <option value="private">Privatno — samo obitelj i suradnici</option>
                  </select>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="font-medium">Dopusti uspomene posjetitelja</p>
                    <p className="text-sm text-muted-foreground">Posjetitelji mogu ostaviti uspomenu na memorijalu.</p>
                  </div>
                  <Switch checked={memorial.allow_tributes}
                    onCheckedChange={(v) => patch({ allow_tributes: v }, 'Postavka je spremljena.')} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="font-medium">Odobravaj uspomene prije objave</p>
                    <p className="text-sm text-muted-foreground">Uključeno: uspomene čekaju vaše odobrenje. Isključeno: objavljuju se odmah.</p>
                  </div>
                  <Switch checked={memorial.tributes_require_approval !== false}
                    onCheckedChange={(v) => patch({ tributes_require_approval: v }, 'Postavka je spremljena.')} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="font-medium">Dopusti zapaljene svijeće</p>
                    <p className="text-sm text-muted-foreground">Posjetitelji mogu zapaliti virtualnu svijeću.</p>
                  </div>
                  <Switch checked={memorial.allow_candles}
                    onCheckedChange={(v) => patch({ allow_candles: v }, 'Postavka je spremljena.')} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="font-medium">Dopusti preuzimanje fotografija</p>
                    <p className="text-sm text-muted-foreground">Posjetitelji mogu preuzeti fotografije iz galerije.</p>
                  </div>
                  <Switch checked={memorial.allow_media_download}
                    onCheckedChange={(v) => patch({ allow_media_download: v }, 'Postavka je spremljena.')} />
                </div>
              </CardContent>
            </Card>

            {isOwner && (
              <Card className="border-destructive/40 mt-6">
                <CardHeader>
                  <CardTitle className="font-serif flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" /> Brisanje memorijala
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Trajno brisanje uklanja memorijal, sve fotografije, uspomene, svijeće i suradnike.
                    Ovu radnju nije moguće vratiti, a uplata se ne vraća.
                  </p>
                  <Button variant="destructive" disabled={saving} onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 mr-2" /> Obriši memorijal
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="dijeljenje">
            <Card>
              <CardHeader><CardTitle className="font-serif">Podijelite memorijal</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {isPaid ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" /> Poveznica: <span className="break-all">{memorialAbsoluteUrl(memorial.slug)}</span>
                    </div>
                    <ShareBar url={memorialAbsoluteUrl(memorial.slug)} title={`Memorijal — ${name}`} compact />
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center space-y-4">
                    <Lock className="h-6 w-6 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Dijeljenje je dostupno nakon uplate. Memorijal se objavljuje automatski čim je uplata potvrđena.
                    </p>
                    <Button variant="gold" disabled={saving || !isOwner} onClick={() => setPayOpen(true)}>
                      <CreditCard className="h-4 w-4 mr-2" /> Plati i objavi ({currentMemorialPriceLabel()})
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <CitiesSection />
      <Footer />
      <PayMemorialDialog
        memorialId={memorial.id}
        open={payOpen}
        onOpenChange={setPayOpen}
        onAlreadyPaid={() => setMemorial({ ...memorial, paid: true })}
      />
    </div>
  );
};

export default UrediMemorijal;
