import { useEffect, useState } from 'react';
import { hasConsent } from '@/lib/consent';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Heart, ImageIcon, QrCode, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import MemorialPrice from '@/components/promo/MemorialPrice';

const memorialFeatures = [
  { icon: ImageIcon, title: 'Fotografije i priča', description: 'Životna priča, fotografije i najvažniji trenuci na jednom mjestu.' },
  { icon: Share2, title: 'Jednostavno dijeljenje', description: 'Pošaljite link obitelji i prijateljima, bilo gdje u svijetu.' },
  { icon: QrCode, title: 'QR kod za spomenik', description: 'QR kod koji vodi izravno na stranicu memorijala.' },
  { icon: Heart, title: 'Svijeće i poruke', description: 'Bližnji mogu zapaliti svijeću i ostaviti riječi sjećanja.' },
];

const CREATE_PATH = '/digitalni-memorijal/kreiraj';

type BlogPost = { id: string; title: string; excerpt: string | null; image_url: string | null; slug: string | null };

export const trackHomepageAction = (position: string) => {
  if (typeof window === 'undefined') return;
  try {
    if (!hasConsent('analytics')) return;
    const analyticsWindow = window as Window & { dataLayer?: unknown[] };
    analyticsWindow.dataLayer = analyticsWindow.dataLayer ?? [];
    analyticsWindow.dataLayer.push({ event: 'homepage_memorial_action', position });
  } catch { /* Analytics must never interrupt navigation. */ }
};

const CreateButton = ({ label, position }: { label: string; position: string }) => (
  <Button asChild variant="gold" size="lg" className="min-h-12 px-6 text-base">
    <Link to={CREATE_PATH} onClick={() => trackHomepageAction(position)}>{label}<ArrowRight aria-hidden="true" /></Link>
  </Button>
);

export const MemorialHeroSection = ({ variant = 'section' }: { variant?: 'hero' | 'section' }) => {
  const isHero = variant === 'hero';
  const Heading = isHero ? 'h1' : 'h2';
  return (
    <section className={`border-b border-border ${isHero ? 'bg-memorial-warm' : 'bg-background'}`}>
      <div className={`container mx-auto grid items-center gap-8 px-4 lg:grid-cols-2 lg:gap-12 ${isHero ? 'min-h-[calc(100svh-72px)] py-10 lg:py-14' : 'py-10 md:py-14'}`}>
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Digitalni memorijal</p>
          <Heading className={`mt-4 max-w-3xl font-semibold leading-tight ${isHero ? 'text-4xl sm:text-5xl lg:text-6xl' : 'text-3xl md:text-4xl'}`}>Sačuvajte priču o osobi koju volite</Heading>
          <p className={`max-w-2xl text-muted-foreground ${isHero ? 'mt-6 text-lg leading-8' : 'mt-4 text-base leading-7'}`}>Okupite fotografije, životnu priču i poruke sjećanja na jednoj memorijalnoj stranici koju možete podijeliti s obitelji i prijateljima.</p>
          <p className={`max-w-xl border-l-2 border-accent pl-4 font-semibold leading-7 ${isHero ? 'mt-6 text-lg' : 'mt-4 text-base'}`}>Za osobu koja je preminula nedavno ili prije mnogo godina.</p>
          <p className={`font-display font-semibold ${isHero ? 'mt-7 text-3xl' : 'mt-5 text-2xl'}`}><MemorialPrice /> <span className="font-body text-base font-normal text-muted-foreground">jednokratno · Bez pretplate</span></p>
          <div className={`flex flex-col gap-3 sm:flex-row ${isHero ? 'mt-7' : 'mt-5'}`}>
            <CreateButton label="Izradi memorijal" position="create_hero" />
            <Button asChild variant="outline" size="lg" className="min-h-12 bg-background px-6 text-base"><a href="#javni-memorijali" onClick={() => trackHomepageAction('open_example')}>Pogledaj memorijale</a></Button>
          </div>
          {isHero && (
            <a href="#pretraga-osmrtnica" className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground">Tražite osmrtnicu? Pretražite po imenu ili gradu.</a>
          )}
        </div>

        <ul className={`mx-auto grid w-full gap-4 sm:grid-cols-2 ${isHero ? 'max-w-xl' : 'max-w-lg'}`} aria-label="Što sadrži digitalni memorijal">
          {memorialFeatures.map((feature) => (
            <li key={feature.title} className="rounded-lg border border-border bg-card p-5">
              <feature.icon className="h-7 w-7 text-accent" aria-hidden="true" />
              <p className="mt-3 font-display text-lg font-semibold">{feature.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{feature.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export const MemorialArticlesSection = () => {
  const [articles, setArticles] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data, error: fetchError } = await supabase.from('blogs').select('id, title, excerpt, image_url, slug').order('created_at', { ascending: false }).limit(3);
      if (fetchError) setError(true);
      else setArticles((data ?? []) as BlogPost[]);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <section className="border-y border-border bg-secondary py-16" aria-labelledby="articles-shared-heading">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 id="articles-shared-heading">Kako sačuvati uspomene i pronaći riječi sjećanja</h2><p className="mt-2 text-base text-muted-foreground">Najnovije objavljeni članci.</p></div>
          <Link to="/blog" className="inline-flex min-h-11 items-center font-semibold text-accent hover:underline">Pogledaj sve članke<ArrowRight aria-hidden="true" /></Link>
        </div>
        {loading ? (
          <div className="grid gap-5 md:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-80 rounded-lg" />)}</div>
        ) : error ? (
          <p role="alert" className="rounded-md border border-destructive/30 p-4">Članci se trenutačno ne mogu učitati.</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">{articles.map((article) => (
            <Card key={article.id} className="overflow-hidden border-border">
              <div className="aspect-[16/9] bg-muted">{article.image_url ? <img src={article.image_url} alt="" className="h-full w-full object-cover" width={640} height={360} loading="lazy" /> : <div className="flex h-full items-center justify-center"><BookOpen className="h-10 w-10 text-muted-foreground" /></div>}</div>
              <CardContent className="flex min-h-[220px] flex-col p-5"><h3 className="text-xl font-semibold leading-snug">{article.title}</h3><p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{article.excerpt}</p>{article.slug && <Link to={`/blog/${article.slug}`} className="mt-auto inline-flex min-h-11 items-center pt-4 font-semibold text-accent hover:underline">Pročitaj članak<ArrowRight aria-hidden="true" /></Link>}</CardContent>
            </Card>
          ))}</div>
        )}
      </div>
    </section>
  );
};

export const MemorialFinalCtaSection = () => (
  <section className="bg-primary py-16 text-primary-foreground">
    <div className="container mx-auto px-4 text-center">
      <h2 className="text-primary-foreground">Sačuvajte priču koju želite prenijeti dalje</h2>
      <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-primary-foreground/75">Započnite fotografijom, kratkom pričom ili uspomenom na osobu koja vam je važna.</p>
      <p className="mt-6 font-display text-3xl font-semibold text-accent"><MemorialPrice /> <span className="font-body text-base font-normal text-primary-foreground/70">jednokratno · Bez pretplate</span></p>
      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <CreateButton label="Izradi memorijal" position="create_final" />
        <Link to="/digitalni-memorijal" onClick={() => trackHomepageAction('memorial_details_final')} className="inline-flex min-h-12 items-center px-5 font-semibold text-primary-foreground underline underline-offset-4">Saznaj više o digitalnom memorijalu</Link>
      </div>
    </div>
  </section>
);
