import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Flower2, Heart, Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import MemorialQuickSearch from '@/components/MemorialQuickSearch';
const oliverPhoto = { url: "https://umpvnepxsqfkxjpclkxc.supabase.co/storage/v1/object/public/obituary-photos/site/oliver.png" };
const dinoPhoto = { url: "https://umpvnepxsqfkxjpclkxc.supabase.co/storage/v1/object/public/obituary-photos/site/dino.png" };
const massimoPhoto = { url: "https://umpvnepxsqfkxjpclkxc.supabase.co/storage/v1/object/public/obituary-photos/site/masimo.png" };

interface ExampleMemorial {
  slug: string;
  name: string;
  years: string;
  location: string;
  quote: string;
  description: string;
  image: string;
  imagePosition?: string;
}

const fallbackExamples: ExampleMemorial[] = [
  {
    slug: 'oliver-dragojevic',
    name: 'Oliver Dragojević',
    years: '1947. – 2018.',
    location: 'Split, Hrvatska',
    quote: '„Moja pjesma je pjesma mora, sunca i ljubavi."',
    description: 'Jedan od najvećih hrvatskih glazbenika čije su pjesme obilježile generacije i postale neprolazna uspomena na ljepotu života.',
    image: oliverPhoto.url,
  },
  {
    slug: 'dino-dvornik',
    name: 'Dino Dvornik',
    years: '1964. – 2008.',
    location: 'Split, Hrvatska',
    quote: '„Ti si mi u mislima, ostala si mi u snovima."',
    description: 'Kralj hrvatskog funka i neponovljiv umjetnik čija je energija i glazba ostavila dubok trag u hrvatskoj pop kulturi.',
    image: dinoPhoto.url,
    imagePosition: 'center 70%',
  },
  {
    slug: 'masimo-savic',
    name: 'Massimo Savić',
    years: '1961. – 2022.',
    location: 'Zadar, Hrvatska',
    quote: '„Stranac u noći, tražim tebe."',
    description: 'Legendarni hrvatski pjevač i skladatelj poznat po emotivnim baladama koje i danas diraju srca mnogih.',
    image: massimoPhoto.url,
  },
];

// Days until the next death-date anniversary (today = 0)
const daysUntilAnniversary = (datumSmrti: string): number => {
  const [, month, day] = datumSmrti.split('-').map(Number);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), month - 1, day);
  if (next < today) next = new Date(now.getFullYear() + 1, month - 1, day);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
};

const formatYear = (date: string | null): string => (date ? `${new Date(date).getFullYear()}.` : '');

const stripHtml = (value: string): string =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

interface DbMemorial {
  slug: string;
  quote: string | null;
  life_story: string | null;
  obituaries: {
    ime: string;
    prezime: string;
    datum_rodenja: string | null;
    datum_smrti: string | null;
    mjesto_smrti: string | null;
    fotografija_url: string | null;
  } | null;
  memorial_media: { storage_path: string | null; is_cover: boolean }[];
}

const MemorialExamplesSection = () => {
  const [examples, setExamples] = useState<ExampleMemorial[]>(fallbackExamples);

  useEffect(() => {
    let dailyInterval: number | undefined;

    const load = async () => {
      const { data, error } = await supabase
        .from('memorials')
        .select(
          'slug, quote, life_story, obituaries!deceased_id(ime, prezime, datum_rodenja, datum_smrti, mjesto_smrti, fotografija_url), memorial_media(storage_path, is_cover)'
        )
        .eq('status', 'published')
        .eq('visibility', 'public')
        .eq('paid', true)
        .limit(500);

      if (error || !data) return;

      const withAnniversary = (data as unknown as DbMemorial[])
        .flatMap((m) => {
          const deathDate = m.obituaries?.datum_smrti;
          if (!deathDate) return [];
          return [{ m, days: daysUntilAnniversary(deathDate) }];
        })
        .filter(({ days }) => days > 0)
        .sort((a, b) => a.days - b.days)
        .slice(0, 6);

      if (withAnniversary.length === 0) return;

      const mapped: ExampleMemorial[] = withAnniversary.map(({ m }) => {
        const ob = m.obituaries;
        if (!ob) throw new Error('Nedostaju podaci o osobi za memorijal.');
        const cover = m.memorial_media?.find((md) => md.is_cover) ?? m.memorial_media?.[0];
        const image = cover?.storage_path || ob.fotografija_url || oliverPhoto.url;
        const story = stripHtml(m.life_story || '');
        return {
          slug: m.slug,
          name: `${ob.ime} ${ob.prezime}`,
          years: `${formatYear(ob.datum_rodenja)} – ${formatYear(ob.datum_smrti)}`,
          location: ob.mjesto_smrti ? `${ob.mjesto_smrti}, Hrvatska` : 'Hrvatska',
          quote: m.quote ? `„${m.quote.replace(/^„|“$/g, '')}“` : '',
          description: story.length > 160 ? `${story.slice(0, 157).trim()}…` : story,
          image,
        };
      });

      // Top up without duplicating memorials if fewer than 6 published entries exist.
      const mappedSlugs = new Set(mapped.map((item) => item.slug));
      const fallbacks = fallbackExamples.filter((item) => !mappedSlugs.has(item.slug));
      setExamples([...mapped, ...fallbacks].slice(0, 6));
    };

    load();

    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeout = window.setTimeout(() => {
      load();
      dailyInterval = window.setInterval(load, 24 * 60 * 60 * 1000);
    }, nextMidnight.getTime() - now.getTime() + 1000);

    return () => {
      window.clearTimeout(timeout);
      if (dailyInterval !== undefined) window.clearInterval(dailyInterval);
    };
  }, []);

  return (
    <section className="py-16 md:py-24 bg-memorial-warm">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-accent-foreground bg-accent rounded-full px-4 py-1.5 mb-4 shadow-sm ring-1 ring-accent/40">
            <Flower2 className="h-4 w-4" /> Primjeri uspomena
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-medium mb-4">
            Digitalni memorijali poznatih osoba
          </h2>
        </div>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 mb-12">
          <div className="w-full md:w-96 shrink-0">
            <MemorialQuickSearch />
          </div>
          <p className="max-w-2xl text-lg text-muted-foreground leading-relaxed md:text-right">
            Pogledajte kako bi izgledalo trajno mjesto sjećanja na neke od najvećih hrvatskih glazbenika.
            Svaki memorijal čuva životnu priču, fotografije, poruke obožavatelja i virtualne svijeće.
          </p>
        </div>





        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {examples.map((example) => (
            <Card
              key={example.slug}
              className="memorial-card group overflow-hidden hover:shadow-memorial transition-all duration-300 h-full flex flex-col"
            >
              {/* Header with photo */}
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={example.image}
                  alt={example.name}
                  className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-4 right-4">
                  <Heart className="h-5 w-5 text-memorial-gold/80 drop-shadow-sm" />
                </div>
              </div>

              <CardContent className="p-6 pt-5 flex-1 flex flex-col">
                <div className="text-center mb-4">
                  <div className="inline-block bg-card rounded-xl px-5 py-2.5 shadow-elegant border border-border">
                    <h3 className="font-display text-xl font-semibold text-foreground">
                      {example.name}
                    </h3>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-muted-foreground mb-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className="h-4 w-4 text-accent" />
                    <span>{example.years}</span>
                  </div>
                  <div>{example.location}</div>
                </div>

                {example.quote && (
                  <blockquote className="text-center italic text-foreground/80 text-sm mb-4 px-2">
                    {example.quote}
                  </blockquote>
                )}

                <p className="text-sm text-muted-foreground leading-relaxed text-center mb-6 flex-1">
                  {example.description}
                </p>

                <Button
                  asChild
                  variant="outline"
                  className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                >
                  <Link to={`/memorijal/${example.slug}`}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Pogledaj memorijal
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Želite stvoriti sličan digitalni memorijal za svoju voljenu osobu?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto border-accent text-accent hover:bg-accent hover:text-accent-foreground"
            >
              <Link to="/digitalni-memorijal">
                Pročitaj više o memorijalu
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="elegant-button w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Link to="/digitalni-memorijal/kreiraj">
                <Sparkles className="mr-2 h-5 w-5" />
                Kreiraj digitalni memorijal
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

      </div>
    </section>
  );
};

export default MemorialExamplesSection;
