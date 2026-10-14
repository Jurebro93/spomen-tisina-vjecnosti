import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Info, Sparkles } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MemorialContent, { type LifeEvent, type PublicCandle, type PublicTribute } from '@/components/memorial/MemorialContent';
import { Button } from '@/components/ui/button';
const marijaPortret = "/site/marija-kovac-portret.jpg";
const marijaMlada = "/site/marija-kovac-mlada.jpg";
const marijaKuhinja = "/site/marija-kovac-kuhinja.jpg";
const marijaVrt = "/site/marija-kovac-vrt.jpg";
import type { Deceased, Memorial } from '@/lib/memorial';
import type { MediaItem } from '@/components/memorial/PhotoUploader';

const deceased: Deceased = {
  id: 'ogledni-memorijal', ime: 'Marija', prezime: 'Kovač', datum_rodenja: '1932-04-18', datum_smrti: '2004-11-09',
  mjesto_rodenja: 'Karlovac', mjesto_smrti: 'Zagreb', biografija: null, fotografija_url: marijaPortret,
  groblje: null, profesija: null, podnaslov: 'Baka čije priče i danas okupljaju obitelj', slug: null, active: false,
};

const memorial: Memorial = {
  id: 'ogledni-memorijal', deceased_id: deceased.id, slug: 'obiteljske-uspomene', owner_id: 'ogledni', relationship: 'unuka',
  quote: 'Najvažnije je da se obitelj uvijek ima gdje vratiti.',
  life_story: '<p>Marija je voljela nedjeljna okupljanja, miris svježe pečenog kruha i duge razgovore za kuhinjskim stolom. Ovaj ogledni memorijal pokazuje kako obitelj može okupiti priče i male uspomene i mnogo godina nakon smrti voljene osobe.</p><h2>Priče koje ostaju</h2><p>Njezini unuci i danas pamte izreke kojima ih je hrabrila, vrt o kojem je brinula i način na koji je svaki obiteljski susret pretvarala u mali praznik.</p>',
  visibility: 'public', status: 'published', allow_tributes: true, allow_candles: true, allow_media_download: false,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', published_at: '2026-01-01T00:00:00Z', archived_at: null, paid: true,
};

const events: LifeEvent[] = [
  { id: 'e1', memorial_id: memorial.id, event_date: null, event_year: 1932, title: 'Rođena u Karlovcu', description: 'Odrasla je u velikoj obitelji uz četiri sestre.', sort_order: 0 } as LifeEvent,
  { id: 'e2', memorial_id: memorial.id, event_date: null, event_year: 1956, title: 'Osnovala obitelj', description: 'Dom joj je uvijek bio otvoren rodbini i prijateljima.', sort_order: 1 } as LifeEvent,
];
const tributes: PublicTribute[] = [{ id: 't1', author_name: 'Ogledni član obitelji', relationship: 'unuka', title: 'Bakine priče', message: 'Priče koje si nam pričala sada prenosimo svojoj djeci.', photo_path: null, created_at: '2026-01-01T00:00:00Z' }];
const candles: PublicCandle[] = [{ id: 'c1', visitor_name: 'Ogledni posjetitelj', message: 'U znak sjećanja.', created_at: '2026-01-01T00:00:00Z' }];

const media: MediaItem[] = [
  { id: 'ogledni-img-0', memorial_id: memorial.id, type: 'image', storage_path: marijaMlada, external_url: null, title: 'Marija Kovač u mladosti', description: null, media_date: null, sort_order: 0, is_cover: false, className: 'grayscale' },
  { id: 'ogledni-img-1', memorial_id: memorial.id, type: 'image', storage_path: marijaKuhinja, external_url: null, title: 'Marija Kovač u kuhinji', description: null, media_date: null, sort_order: 1, is_cover: false, className: 'grayscale' },
  { id: 'ogledni-img-2', memorial_id: memorial.id, type: 'image', storage_path: marijaVrt, external_url: null, title: 'Marija Kovač s unukom u vrtu', description: null, media_date: null, sort_order: 2, is_cover: false, className: 'grayscale' },
];

const MemorijalOgledni = () => (
  <div className="min-h-screen bg-background">
    <Helmet><title>Ogledni digitalni memorijal | Osmrtnica</title><meta name="robots" content="noindex,follow" /></Helmet>
    <Header />
    <main>
      <div className="border-b border-border bg-secondary">
        <div className="container mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Info className="h-4 w-4 shrink-0" aria-hidden="true" /><strong className="text-foreground">Ogledni memorijal — izmišljeni podaci.</strong></p>
          <Button asChild variant="gold" className="min-h-11"><Link to="/digitalni-memorijal/kreiraj"><Sparkles aria-hidden="true" />Započni izradu</Link></Button>
        </div>
      </div>
      <MemorialContent preview deceased={deceased} memorial={memorial} media={media} events={events} tributes={tributes} candles={candles} coverUrl={marijaPortret} />
    </main>
    <Footer />
  </div>
);

export default MemorijalOgledni;