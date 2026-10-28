import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CreditCard, Loader2, Lock, Pencil, Check } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import MemorialContent, { type LifeEvent, type PublicCandle, type PublicTribute } from '@/components/memorial/MemorialContent';
import type { MediaItem } from '@/components/memorial/PhotoUploader';
import TributeForm from '@/components/memorial/TributeForm';
import CandleForm from '@/components/memorial/CandleForm';
import ReportDialog from '@/components/memorial/ReportDialog';
import RequestAccessDialog from '@/components/memorial/RequestAccessDialog';
import MemorialSidebar from '@/components/memorial/MemorialSidebar';
import { supabase } from '@/integrations/supabase/client';
import {
  DECEASED_FIELDS, MEMORIAL_PRICE_EUR, friendlyError, fullName, lifeYears, mediaPublicUrl,
  memorialAbsoluteUrl, type Deceased, type Memorial,
} from '@/lib/memorial';
import { currentMemorialPriceLabel } from '@/lib/seasonalPromo';
import PayMemorialDialog from '@/components/promo/PayMemorialDialog';
import { trackEvent } from '@/lib/metaPixel';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { fetchCemeteryBySlug, slugifyCemeteryName } from '@/lib/cemeteries';
import { breadcrumbJsonLd } from '@/lib/seo';

const MemorijalStranica = () => {
  const { slug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [memorial, setMemorial] = useState<Memorial | null>(null);
  const [deceased, setDeceased] = useState<Deceased | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [tributes, setTributes] = useState<PublicTribute[]>([]);
  const [candles, setCandles] = useState<PublicCandle[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [canModerate, setCanModerate] = useState(false);
  const [pendingTributes, setPendingTributes] = useState(0);
  const [paying] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [cemeteryHref, setCemeteryHref] = useState<string | null>(null);
  const [obituaryHref, setObituaryHref] = useState<string | null>(null);
  const [privateMemorialId, setPrivateMemorialId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data: m } = await supabase
        .from('memorials')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (!active) return;
      if (!m) {
        setMemorial(null);
        // The memorial may exist but be private/unpublished — RLS hides it.
        const { data: stub } = await supabase.rpc('memorial_stub_by_slug', { _slug: slug });
        const found = Array.isArray(stub) ? stub[0] : stub;
        if (!active) return;
        setPrivateMemorialId((found as { id: string } | null)?.id ?? null);
        setLoading(false);
        return;
      }
      setPrivateMemorialId(null);
      setMemorial(m as Memorial);

       const [d, md, ev, tr, ca, edit, moderate] = await Promise.all([
        supabase.from('obituaries').select(DECEASED_FIELDS).eq('id', m.deceased_id).maybeSingle(),
        supabase.from('memorial_media').select('*').eq('memorial_id', m.id).order('sort_order', { ascending: true }),
        supabase.from('memorial_life_events').select('*').eq('memorial_id', m.id).order('sort_order', { ascending: true }),
        supabase.from('memorial_tributes').select('id,author_name,relationship,title,message,photo_path,created_at')
          .eq('memorial_id', m.id).eq('status', 'approved').order('created_at', { ascending: false }),
        supabase.from('memorial_candles').select('id,visitor_name,message,created_at,expires_at')
          .eq('memorial_id', m.id).eq('status', 'approved').order('created_at', { ascending: false }).limit(60),
        supabase.rpc('can_edit_memorial', { _memorial_id: m.id }),
         supabase.rpc('can_moderate_memorial', { _memorial_id: m.id }),
      ]);
      if (!active) return;
      setDeceased((d.data as Deceased) ?? null);
      setMedia((md.data as MediaItem[]) ?? []);
      setEvents((ev.data as LifeEvent[]) ?? []);
      setTributes((tr.data as PublicTribute[]) ?? []);
      setCandles((ca.data as PublicCandle[]) ?? []);
      setCanEdit(edit.data === true);
       setCanModerate(moderate.data === true);
       if (moderate.data === true) {
         const { count } = await supabase.from('memorial_tributes').select('id', { count: 'exact', head: true }).eq('memorial_id', m.id).eq('status', 'pending');
         if (active) setPendingTributes(count ?? 0);
       }
      setLoading(false);

      // Poveznica na osmrtnicu postoji samo ako osoba stvarno ima objavljenu osmrtnicu.
      // Osobe kreirane samo za memorijal (active=false) nemaju gumb, ali ako je ista
      // osoba kasnije objavljena u bazi osmrtnica, dohvatimo njezinu osmrtnicu po imenu.
      const dRow = d.data as Deceased | null;
      setObituaryHref(null);
      if (dRow && dRow.active === true && dRow.slug) {
        setObituaryHref(`/${dRow.slug}`);
      } else if (dRow?.ime && dRow?.prezime) {
        let realQuery = supabase.from('obituaries').select('slug').eq('active', true)
          .eq('ime', dRow.ime).eq('prezime', dRow.prezime);
        if (dRow.datum_smrti) realQuery = realQuery.eq('datum_smrti', dRow.datum_smrti);
        const { data: realObit } = await realQuery.limit(1);
        if (active && realObit?.[0]?.slug) setObituaryHref(`/${realObit[0].slug}`);
      }

      const groblje = (d.data as Deceased | null)?.groblje;
      if (groblje) {
        const cemeterySlug = slugifyCemeteryName(groblje);
        const found = await fetchCemeteryBySlug(cemeterySlug);
        if (active) setCemeteryHref(found ? `/groblje/${cemeterySlug}` : null);
      }
    };
    load();
    return () => { active = false; };
  }, [slug, user?.id]);

  // Meta Pixel: ViewContent when a single memorial page is opened.
  useEffect(() => {
    if (!memorial?.id) return;
    trackEvent('ViewContent', {
      content_name: 'Digitalni memorijal',
      content_type: 'product',
      content_ids: [memorial.id],
      currency: 'EUR',
      value: MEMORIAL_PRICE_EUR,
    });
  }, [memorial?.id]);

  const coverUrl = useMemo(() => {
    const cover = media.find((m) => m.is_cover) ?? media.find((m) => m.type === 'image');
    return mediaPublicUrl(cover?.storage_path) ?? deceased?.fotografija_url ?? null;
  }, [media, deceased]);

  const name = fullName(deceased);
  const years = lifeYears(deceased?.datum_rodenja, deceased?.datum_smrti);
  const absoluteUrl = memorialAbsoluteUrl(slug);
  const metaDescription = memorial?.quote
    ? `${name} (${years}) — ${memorial.quote}`.slice(0, 155)
    : `Digitalni memorijal i mjesto sjećanja na ${name} (${years}). Podijelite uspomene, zapalite svijeću i pogledajte fotografije.`.slice(0, 155);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!memorial && privateMemorialId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-20 max-w-2xl">
          <Helmet>
            <title>Privatni memorijal | Digitalni memorijal</title>
            <meta name="robots" content="noindex" />
          </Helmet>
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
              <h1 className="font-serif text-2xl">Ovaj memorijal je privatan</h1>
              <p className="text-muted-foreground">
                Sadržaj je dostupan samo obitelji i osobama koje su dobile pristup.
              </p>
              <div className="flex justify-center">
                <RequestAccessDialog
                  memorialId={privateMemorialId}
                  redirectPath={`/memorijal/${slug}?zatrazi=1`}
                  autoOpen={searchParams.get('zatrazi') === '1'}
                />
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (!memorial || !deceased) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-20">
          <Helmet>
            <title>Memorijal nije pronađen | Digitalni memorijal</title>
            <meta name="robots" content="noindex" />
          </Helmet>
          <h1 className="font-serif text-3xl mb-4">Memorijal nije pronađen</h1>
          <p className="text-muted-foreground mb-6">
            Ova memorijalna stranica ne postoji ili je privatna.
          </p>
          <Button asChild><Link to="/memorijali">Pregledajte memorijale</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  const isVisible = memorial.status === 'published' && memorial.visibility !== 'private';
  if (!isVisible && !canEdit) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-20 max-w-2xl">
          <Helmet>
            <title>Privatni memorijal | Digitalni memorijal</title>
            <meta name="robots" content="noindex" />
          </Helmet>
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
              <h1 className="font-serif text-2xl">Ovaj memorijal je privatan</h1>
              <p className="text-muted-foreground">
                Sadržaj je dostupan samo obitelji i osobama koje su dobile pristup.
              </p>
              <div className="flex justify-center">
                <RequestAccessDialog
                  memorialId={memorial.id}
                  redirectPath={`/memorijal/${slug}?zatrazi=1`}
                  autoOpen={searchParams.get('zatrazi') === '1'}
                />
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const noIndex = memorial.visibility !== 'public' || memorial.status !== 'published';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{`${name} (${years}) — memorijal i sjećanja`.slice(0, 60)}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={absoluteUrl} />
        {noIndex && <meta name="robots" content="noindex,follow" />}
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={absoluteUrl} />
        <meta property="og:title" content={`${name} (${years})`} />
        <meta property="og:description" content={metaDescription} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${name} (${years})`} />
        <meta name="twitter:description" content={metaDescription} />
        {coverUrl && <meta property="og:image" content={coverUrl} />}
        {coverUrl && <meta name="twitter:image" content={coverUrl} />}
        {!noIndex && (
          <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd([
            { name: 'Naslovnica', path: '/' },
            { name: 'Digitalni memorijal', path: '/digitalni-memorijal' },
            { name },
          ]))}</script>
        )}
        {!noIndex && (
          <script type="application/ld+json">{JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name,
            birthDate: deceased.datum_rodenja || undefined,
            deathDate: deceased.datum_smrti || undefined,
            birthPlace: deceased.mjesto_rodenja || undefined,
            url: absoluteUrl,
            image: coverUrl || undefined,
          })}</script>
        )}
      </Helmet>
      <Header />

      <main className="flex-1">
        {canEdit && (
          <div className="bg-secondary/60 border-b border-border">
            <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {memorial.paid !== true
                  ? `Memorijal još nije plaćen — vidljiv je samo vama. Nakon uplate (${currentMemorialPriceLabel()}) automatski se objavljuje i možete ga dijeliti.`
                  : `Vi upravljate ovim memorijalom${memorial.status !== 'published' ? ' (nije javno objavljen)' : ''}.`}
              </p>
              <div className="flex flex-wrap gap-2">
                 {canModerate && (
                   <Button asChild size="sm" variant="gold">
                     <Link to={`/memorijal/${slug}/uredi?tab=uspomene`}><Check className="h-4 w-4 mr-2" /> Potvrdi sjećanja{pendingTributes ? ` (${pendingTributes})` : ''}</Link>
                   </Button>
                 )}
                {memorial.paid !== true && memorial.owner_id === user?.id && (
                  <Button variant="gold" size="sm" disabled={paying} onClick={() => setPayOpen(true)}>
                    <CreditCard className="h-4 w-4 mr-2" /> Plati i objavi ({currentMemorialPriceLabel()})
                  </Button>
                )}
                <Button asChild size="sm" variant="outline">
                  <Link to={`/memorijal/${slug}/uredi`}><Pencil className="h-4 w-4 mr-2" /> Uredi memorijal</Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        <MemorialContent
          deceased={deceased}
          memorial={memorial}
          media={media}
          events={events}
          tributes={tributes}
          candles={candles}
          coverUrl={coverUrl}
          cemeteryHref={cemeteryHref}
          obituaryHref={obituaryHref}
          tributeSlot={memorial.allow_tributes ? (
            <TributeForm
              memorialId={memorial.id}
              personName={name}
              autoApprove={memorial.tributes_require_approval === false}
              onPosted={async () => {
                const { data } = await supabase.from('memorial_tributes')
                  .select('id,author_name,relationship,title,message,photo_path,created_at')
                  .eq('memorial_id', memorial.id).eq('status', 'approved').order('created_at', { ascending: false });
                setTributes((data as PublicTribute[]) ?? []);
              }}
            />
          ) : null}
          candleSlot={memorial.allow_candles ? (
            <CandleForm
              memorialId={memorial.id}
              personName={name}
              onLit={async () => {
                const { data } = await supabase
                  .from('memorial_candles')
                  .select('id,visitor_name,message,created_at,expires_at')
                  .eq('memorial_id', memorial.id)
                  .eq('status', 'approved')
                  .order('created_at', { ascending: false })
                  .limit(60);
                setCandles((data as PublicCandle[]) ?? []);
              }}
            />
          ) : null}
          reportSlot={<ReportDialog memorialId={memorial.id} />}
          sidebarSlot={
            <MemorialSidebar
              url={absoluteUrl}
              title={`Memorijal — ${name}`}
              personName={name}
              extraSlot={!canEdit ? (
                <div className="rounded-2xl border border-border/80 bg-background/80 p-4 text-center">
                  <RequestAccessDialog
                    memorialId={memorial.id}
                    redirectPath={`/memorijal/${slug}?zatrazi=1`}
                    autoOpen={searchParams.get('zatrazi') === '1'}
                    label="Ovo je moj član obitelji — zatraži uređivanje"
                  />
                </div>
              ) : null}
            />
          }
        />

      </main>

      <Footer />
      <PayMemorialDialog memorialId={memorial.id} open={payOpen} onOpenChange={setPayOpen} />
    </div>
  );
};

export default MemorijalStranica;
