import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronLeft, ChevronRight, Flame, Flower2, MapPin, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
const defaultObituaryPhoto = "/site/default-obituary-photo.jpg";
const candleFlame = "/site/candle-flame-large.png";
import {
  formatCroatianDate, fullName, mediaPublicUrl, sanitizeRichText, formatLifeStory,
  type Deceased, type Memorial,
} from '@/lib/memorial';
import type { MediaItem } from '@/components/memorial/PhotoUploader';

export interface LifeEvent {
  id: string;
  event_date: string | null;
  event_year: number | null;
  title: string;
  description: string | null;
  sort_order: number;
}

export interface PublicTribute {
  id: string;
  author_name: string;
  relationship: string | null;
  title: string | null;
  message: string;
  photo_path: string | null;
  created_at: string;
}

export interface PublicCandle {
  id: string;
  visitor_name: string | null;
  message: string | null;
  created_at: string;
}

interface Props {
  deceased: Deceased;
  memorial: Memorial;
  media: MediaItem[];
  events: LifeEvent[];
  tributes: PublicTribute[];
  candles: PublicCandle[];
  coverUrl?: string | null;
  preview?: boolean;
  tributeSlot?: React.ReactNode;
  candleSlot?: React.ReactNode;
  reportSlot?: React.ReactNode;
  sidebarSlot?: React.ReactNode;
  cemeteryHref?: string | null;
  obituaryHref?: string | null;
}

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-[187px] md:scroll-mt-[219px] py-10 md:py-14 border-t border-border">
    <h2 className="font-serif text-2xl md:text-3xl mb-6">{title}</h2>
    {children}
  </section>
);

const MemorialContent = ({
  deceased, memorial, media, events, tributes, candles, coverUrl, preview,
  tributeSlot, candleSlot, reportSlot, sidebarSlot, cemeteryHref, obituaryHref,
}: Props) => {
  const obituaryLink = obituaryHref ?? (deceased.slug && deceased.active === true ? `/${deceased.slug}` : null);
  const images = useMemo(() => media.filter((m) => m.type === 'image'), [media]);
  const videos = useMemo(() => media.filter((m) => m.type === 'video' && m.external_url), [media]);
  const sortedEvents = useMemo(
    () =>
      [...events].sort((a, b) => {
        const getTime = (e: LifeEvent) => {
          if (e.event_date) {
            const d = new Date(e.event_date);
            if (!Number.isNaN(d.getTime())) return d.getTime();
          }
          if (e.event_year) return new Date(e.event_year, 0, 1).getTime();
          return Number.POSITIVE_INFINITY;
        };
        return getTime(a) - getTime(b);
      }),
    [events]
  );
  const [lightbox, setLightbox] = useState<number | null>(null);

  const cover = coverUrl
    ? mediaPublicUrl(coverUrl)
    : mediaPublicUrl(images.find((i) => i.is_cover)?.storage_path ?? images[0]?.storage_path) || deceased.fotografija_url || defaultObituaryPhoto;

  const story = memorial.life_story ? formatLifeStory(memorial.life_story) : '';
  const hasStory = story.replace(/<[^>]*>/g, '').trim().length > 0;

  const tabs = [
    { id: 'biografija', label: 'Biografija' },
    { id: 'fotografije', label: 'Fotografije' },
    videos.length > 0 && { id: 'video', label: 'Video' },
    events.length > 0 && { id: 'zivotni-put', label: 'Životni put' },
    (tributes.length > 0 || (memorial.allow_tributes && !preview)) && { id: 'sjecanja', label: 'Sjećanja' },
    (candles.length > 0 || (memorial.allow_candles && !preview)) && { id: 'svijece', label: 'Svijeće' },
    Boolean(deceased.groblje) && { id: 'pocivaliste', label: 'Mjesto vječnog počinka' },
  ].filter(Boolean) as Array<{ id: string; label: string }>;

  const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id ?? '');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (tabs.length === 0) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveTab(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-15% 0px -80% 0px',
        threshold: 0,
      }
    );
    tabs.forEach((tab) => {
      const el = document.getElementById(tab.id);
      if (el) observerRef.current?.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, [tabs.map((t) => t.id).join(',')]);

  useEffect(() => {
    if (activeTab && tabs.length > 0 && !tabs.some((t) => t.id === activeTab)) {
      setActiveTab(tabs[0]?.id ?? '');
    }
  }, [tabs.map((t) => t.id).join(','), activeTab]);

  const showLightbox = lightbox !== null && images[lightbox];

  return (
    <div className="bg-[hsl(var(--memorial-warm))]">
      {/* HERO */}
      <header className="bg-background">
        <div className="container mx-auto px-4 py-10 md:py-16">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-[minmax(0,320px)_1fr] gap-8 md:gap-12 items-center">
            <img
              src={cover ?? defaultObituaryPhoto}
              alt={`Portret: ${fullName(deceased)}`}
              className="w-full max-w-[320px] mx-auto aspect-[3/4] object-cover rounded-lg shadow-sm"
            />
            <div className="text-center md:text-left">
              <h1 className="font-serif text-3xl md:text-5xl tracking-wide uppercase">{fullName(deceased)}</h1>
              {deceased.podnaslov && <p className="mt-2 text-muted-foreground">{deceased.podnaslov}</p>}
              <p className="mt-4 text-muted-foreground">
                {[formatCroatianDate(deceased.datum_rodenja), formatCroatianDate(deceased.datum_smrti)].filter(Boolean).join(' – ')}
              </p>
              {memorial.quote && (
                <blockquote className="mt-6 font-serif text-xl md:text-2xl text-accent italic">„{memorial.quote}”</blockquote>
              )}
              {obituaryLink && !preview && (
                <p className="mt-6">
                  <a href={obituaryLink} className="inline-flex items-center gap-2 text-sm underline hover:text-accent">
                    <FileText className="h-4 w-4" /> Pogledaj osmrtnicu
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* NAV */}
      {tabs.length > 0 && (
        <nav aria-label="Sadržaj memorijala" className="sticky top-[155px] md:top-[187px] z-40 w-full bg-white/70 backdrop-blur-xl border-b border-white/80 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)]">
          <div className="container mx-auto">
            <div className="max-w-5xl mx-auto relative">
              <div className="w-full overflow-x-auto no-scrollbar scroll-smooth px-4 py-1.5">
                <ul className="flex w-max min-w-full flex-nowrap items-center justify-start gap-1 md:justify-center">
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <li key={tab.id}>
                        <a
                          href={`#${tab.id}`}
                          onClick={() => setActiveTab(tab.id)}
                          className={`whitespace-nowrap flex items-center px-4 md:px-5 py-2 md:py-2.5 rounded-full text-sm font-medium font-serif tracking-wide transition-all duration-300 ${
                            isActive
                              ? 'bg-stone-900 text-stone-50 shadow-lg shadow-stone-900/20'
                              : 'text-stone-500 hover:text-stone-900 hover:bg-white/50'
                          }`}
                        >
                          {tab.label}
                          {isActive && (
                            <span className="ml-2 w-1 h-1 rounded-full bg-stone-300/60" aria-hidden="true" />
                          )}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-4/5 h-4 bg-stone-900/5 blur-2xl rounded-full pointer-events-none"
                aria-hidden="true"
              />
            </div>
          </div>
        </nav>
      )}

      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8 lg:gap-10 items-start">
        <div className="min-w-0 pb-16">

          <Section id="biografija" title="Biografija">
            {hasStory ? (
              <div className="memorial-prose text-[17px] leading-8" dangerouslySetInnerHTML={{ __html: story }} />
            ) : (
              <p className="text-muted-foreground">Biografija još nije dodana.</p>
            )}
          </Section>

          <Section id="fotografije" title="Fotografije i uspomene">
            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((image, index) => (
                  <button key={image.id} type="button" onClick={() => setLightbox(index)}
                    className="group relative overflow-hidden rounded-md focus-visible:ring-2 focus-visible:ring-ring">
                    <img src={mediaPublicUrl(image.storage_path) ?? ''} alt={image.title || `Fotografija ${index + 1}`}
                      loading="lazy" className={`h-32 sm:h-40 w-full object-cover transition-transform group-hover:scale-105 ${image.className ?? ''}`} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Fotografije još nisu dodane.</p>
            )}
          </Section>

          {videos.length > 0 && (
            <Section id="video" title="Video">
              <div className="space-y-6">
                {videos.map((video) => (
                  <div key={video.id} className="space-y-2">
                    <div className="aspect-video w-full overflow-hidden rounded-md border border-border">
                      <iframe src={video.external_url ?? ''} title={video.title || 'Video memorijala'}
                        className="h-full w-full" allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                        loading="lazy" />
                    </div>
                    {video.title && <p className="text-sm text-muted-foreground">{video.title}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {sortedEvents.length > 0 && (
            <Section id="zivotni-put" title="Životni put">
              <ol className="relative border-l border-border pl-6 space-y-8">
                {sortedEvents.map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full bg-accent" aria-hidden="true" />
                    <p className="font-semibold text-foreground">
                      {event.event_date ? formatCroatianDate(event.event_date) : event.event_year ? `${event.event_year}.` : 'Godina nije unesena'}
                    </p>
                    <h3 className="font-serif text-lg">{event.title}</h3>
                    {event.description && <p className="text-muted-foreground mt-1 leading-relaxed">{event.description}</p>}
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {(tributes.length > 0 || tributeSlot) && (
            <Section id="sjecanja" title="Sjećanja">
              {tributeSlot}
              <div className="space-y-4 mt-6">
                {tributes.length === 0 && (
                  <p className="text-muted-foreground">Još nema objavljenih uspomena. Budite prvi koji će podijeliti sjećanje.</p>
                )}
                {tributes.map((tribute) => (
                  <Card key={tribute.id} className="border-border">
                    <CardContent className="p-5 space-y-2">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <p className="font-medium">{tribute.author_name}</p>
                        {tribute.relationship && <span className="text-sm text-muted-foreground">· {tribute.relationship}</span>}
                        <span className="ml-auto text-xs text-muted-foreground">{formatCroatianDate(tribute.created_at)}</span>
                      </div>
                      {tribute.title && <p className="font-serif text-lg">{tribute.title}</p>}
                      <p className="whitespace-pre-line leading-relaxed text-foreground/90">{tribute.message}</p>
                      {tribute.photo_path && (
                        <img src={mediaPublicUrl(tribute.photo_path) ?? ''} alt="" loading="lazy"
                          className="mt-2 max-h-64 rounded-md object-cover" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </Section>
          )}

          {(candles.length > 0 || candleSlot) && (
            <Section id="svijece" title="Zapalite svijeću">
              {candleSlot}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                {candles.map((candle) => {
                  const lit = Date.now() - new Date(candle.created_at).getTime() < 7 * 86400000;
                  return (
                  <Card key={candle.id} className="memorial-card hover:shadow-memorial transition-all duration-300 bg-background">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
                        <img
                          src={candleFlame}
                          alt={lit ? 'Goreća svijeća' : 'Ugašena svijeća'}
                          className={lit ? 'w-14 h-14 object-contain animate-flicker' : 'w-14 h-14 object-contain grayscale opacity-50'}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display font-semibold truncate">{candle.visitor_name || 'Anonimni posjetitelj'}</p>
                        {candle.message && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{candle.message}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{formatCroatianDate(candle.created_at)} · {lit ? 'Gori' : 'Ugašena'}</p>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}

              </div>
            </Section>
          )}

          {deceased.groblje && (
            <Section id="pocivaliste" title="Mjesto vječnog počinka">
              <Card className="border-border bg-background">
                <CardContent className="p-6 space-y-3 text-sm">
                  <p className="flex items-start gap-2">
                    <Flower2 className="h-4 w-4 text-accent mt-0.5" aria-hidden="true" />
                    {cemeteryHref ? (
                      <Link to={cemeteryHref} className="underline hover:text-accent">{deceased.groblje}</Link>
                    ) : (
                      <span>{deceased.groblje}</span>
                    )}
                  </p>
                  {deceased.mjesto_smrti && (
                    <p className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 text-accent mt-0.5" aria-hidden="true" />{deceased.mjesto_smrti}
                    </p>
                  )}
                  {deceased.datum_smrti && (
                    <p className="flex items-start gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 text-accent mt-0.5" aria-hidden="true" />
                      Datum smrti: {formatCroatianDate(deceased.datum_smrti)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Section>
          )}

          {reportSlot && <div className="pt-8 border-t border-border">{reportSlot}</div>}
        </div>

        {sidebarSlot && (
          <div className="lg:pt-10 pb-16 h-full">
            <div className="lg:sticky lg:top-28">{sidebarSlot}</div>
          </div>
        )}
        </div>
      </div>


      {showLightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" role="dialog" aria-modal="true"
          aria-label="Pregled fotografije" onClick={() => setLightbox(null)}>
          <button type="button" className="absolute top-4 right-4 text-white p-2" aria-label="Zatvori"
            onClick={() => setLightbox(null)}><X className="h-6 w-6" /></button>
          <button type="button" className="absolute left-2 md:left-6 text-white p-3" aria-label="Prethodna fotografija"
            onClick={(e) => { e.stopPropagation(); setLightbox((lightbox! - 1 + images.length) % images.length); }}>
            <ChevronLeft className="h-8 w-8" />
          </button>
          <figure className="max-w-4xl w-full text-center" onClick={(e) => e.stopPropagation()}>
            <img src={mediaPublicUrl(images[lightbox!].storage_path) ?? ''} alt={images[lightbox!].title || 'Fotografija'}
              className="mx-auto max-h-[70vh] w-auto object-contain rounded" />
            <figcaption className="mt-4 text-white/90 text-sm">
              {images[lightbox!].title}
              {images[lightbox!].media_date && <span className="block text-white/60">{formatCroatianDate(images[lightbox!].media_date)}</span>}
              {images[lightbox!].description && <span className="block text-white/70 mt-1">{images[lightbox!].description}</span>}
            </figcaption>
          </figure>
          <button type="button" className="absolute right-2 md:right-6 text-white p-3" aria-label="Sljedeća fotografija"
            onClick={(e) => { e.stopPropagation(); setLightbox((lightbox! + 1) % images.length); }}>
            <ChevronRight className="h-8 w-8" />
          </button>
        </div>
      )}
    </div>
  );
};

export default MemorialContent;
