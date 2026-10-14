import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MapPin, Clock, Phone, FileText, Flame } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MemorialCtaBanner from '@/components/MemorialCtaBanner';
import VirtualCandles from '@/components/VirtualCandles';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { fetchCemeteries, type Cemetery } from '@/lib/cemeteries';
import { breadcrumbJsonLd } from '@/lib/seo';

const MAIN_CITIES = ['Zagreb', 'Split', 'Osijek', 'Zadar', 'Rijeka', 'Pula', 'Makarska', 'Imotski', 'Šibenik', 'Trogir', 'Solin', 'Metković'];

const toSlug = (v: string) =>
  v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${Number(d)}.${Number(m)}.${y}.`;
};

const linkCls =
  'group flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 hover:border-memorial-gold/60 hover:shadow-sm transition-colors';

type Props = { kind: 'sprovodi' | 'groblja' };

type Funeral = {
  ime: string; prezime: string; datum_sprovoda: string; vrijeme_sprovoda: string | null;
  groblje: string | null; grad: string | null; tip_sprovoda: string | null;
};

const CityIndexPage = ({ kind }: Props) => {
  const isSprovodi = kind === 'sprovodi';
  const [cemeteries, setCemeteries] = useState<Cemetery[]>([]);
  const [funerals, setFunerals] = useState<Funeral[]>([]);
  const [visible, setVisible] = useState(10);

  useEffect(() => {
    fetchCemeteries().then(setCemeteries);
    const today = new Date();
    const from = new Date(today.getTime() - 7 * 864e5).toISOString().slice(0, 10);
    const to = new Date(today.getTime() + 7 * 864e5).toISOString().slice(0, 10);
    supabase
      .from('sprovodi')
      .select('ime, prezime, datum_sprovoda, vrijeme_sprovoda, groblje, grad, tip_sprovoda')
      .gte('datum_sprovoda', from)
      .lte('datum_sprovoda', to)
      .order('datum_sprovoda', { ascending: false })
      .order('vrijeme_sprovoda', { ascending: true })
      .limit(500)
      .then(({ data }) => setFunerals((data as Funeral[]) ?? []));
  }, []);

  // All cities that have a cemetery or a funeral — every subpage gets a link.
  const allCities = useMemo(() => {
    const map = new Map<string, string>();
    MAIN_CITIES.forEach((c) => map.set(toSlug(c), c));
    cemeteries.forEach((c) => c.grad && !map.has(toSlug(c.grad)) && map.set(toSlug(c.grad), c.grad.trim()));
    funerals.forEach((f) => f.grad && !map.has(toSlug(f.grad)) && map.set(toSlug(f.grad), f.grad.trim()));
    return [...map.entries()].filter(([s]) => s).sort((a, b) => a[1].localeCompare(b[1], 'hr'));
  }, [cemeteries, funerals]);

  const cemeteriesByCity = useMemo(() => {
    const groups = new Map<string, { name: string; items: Cemetery[] }>();
    cemeteries.forEach((c) => {
      const name = c.grad?.trim() || 'Ostalo';
      const key = toSlug(name) || 'ostalo';
      if (!groups.has(key)) groups.set(key, { name, items: [] });
      groups.get(key)!.items.push(c);
    });
    return [...groups.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name, 'hr'));
  }, [cemeteries]);

  const title = isSprovodi ? 'Sprovodi u Hrvatskoj – raspored po gradovima' : 'Groblja u Hrvatskoj – popis po gradovima';
  const description = isSprovodi
    ? 'Raspored sprovoda i ispraćaja za zadnjih i idućih 7 dana, po gradovima i grobljima u Hrvatskoj.'
    : 'Popis svih groblja u Hrvatskoj po gradovima – adrese, kontakti, radno vrijeme i raspored sprovoda.';

  const cityLinks = (target: 'sprovodi' | 'groblja', label: string) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {allCities.map(([slug, name]) => (
        <Link key={slug} to={`/${target}/${slug}`} className={linkCls}>
          <span className="font-medium text-foreground group-hover:text-memorial-gold transition-colors">{label} {name}</span>
          <MapPin size={16} className="text-memorial-gold flex-shrink-0" />
        </Link>
      ))}
    </div>
  );

  const funeralTable = (
    <section className="mb-12">
      <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-6">Raspored sprovoda i ispraćaja</h2>
      <div className="bg-card rounded-lg shadow-lg overflow-hidden border border-border">
        <div className="px-6 py-4 bg-memorial-gold/10 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Sprovodi zadnjih 7 dana i idućih 7 dana</h3>
          <p className="text-sm text-muted-foreground mt-1">Svi gradovi, sortirano od najnovijeg</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                {['Datum', 'Vrijeme', 'Ime i prezime', 'Vrsta', 'Groblje', 'Grad'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {funerals.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nema sprovoda u zadnjih 7 niti idućih 7 dana</td></tr>
              ) : (
                funerals.slice(0, visible).map((f, i) => (
                  <tr key={i} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(f.datum_sprovoda)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{f.vrijeme_sprovoda?.slice(0, 5)}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{f.ime} {f.prezime}</td>
                    <td className="px-4 py-3 text-muted-foreground">{f.tip_sprovoda}</td>
                    <td className="px-4 py-3 text-muted-foreground">{f.groblje}</td>
                    <td className="px-4 py-3">
                      {f.grad ? (
                        <Link to={`/sprovodi/${toSlug(f.grad)}`} className="text-memorial-gold underline underline-offset-2">{f.grad}</Link>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {funerals.length > visible && (
          <div className="px-6 py-4 text-center border-t border-border">
            <Button variant="outline" onClick={() => setVisible((v) => v + 10)}>Prikaži više</Button>
          </div>
        )}
      </div>
    </section>
  );

  const cemeteryDirectory = (
    <section className="mb-12">
      <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">Sva groblja po gradovima</h2>
      <p className="text-muted-foreground mb-6">Kliknite groblje za adresu, kontakt i radno vrijeme.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cemeteriesByCity.map(([slug, g]) => (
          <div key={slug} className="rounded-lg border border-memorial-gold/30 bg-card p-5">
            <h3 className="font-display text-lg font-semibold mb-3">
              {slug !== 'ostalo' ? (
                <Link to={`/groblja/${slug}`} className="hover:text-memorial-gold">Groblja {g.name}</Link>
              ) : g.name}
            </h3>
            <ul className="space-y-1.5 text-sm">
              {g.items.map((c) => (
                <li key={c.naziv}>
                  {c.slug ? (
                    <Link to={`/groblje/${c.slug}`} className="text-foreground hover:text-memorial-gold underline-offset-2 hover:underline">{c.displayNaziv}</Link>
                  ) : (
                    <span className="text-muted-foreground">{c.displayNaziv}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );

  const infoItems = isSprovodi
    ? [
        { icon: Clock, t: 'Vrijeme sprovoda', d: 'Dođite 15–30 minuta ranije. Raspored se može promijeniti, pa ga provjerite na dan sprovoda.' },
        { icon: MapPin, t: 'Mjesto okupljanja', d: 'Okupljanje je najčešće ispred mrtvačnice ili oproštajne dvorane na groblju.' },
        { icon: Phone, t: 'Pogrebno poduzeće', d: 'Za promjene termina i dodatne informacije obratite se pogrebnom poduzeću ili upravi groblja.' },
        { icon: FileText, t: 'Osmrtnica', d: 'Obavijest o smrti i sprovodu možete objaviti online – brzo i dostupno svima.' },
      ]
    : [
        { icon: Clock, t: 'Radno vrijeme', d: 'Groblja ljeti i zimi imaju različito radno vrijeme – provjerite stranicu pojedinog groblja.' },
        { icon: MapPin, t: 'Pronalazak groba', d: 'Uprava groblja pomoći će vam pronaći grobno mjesto prema imenu pokojnika.' },
        { icon: Phone, t: 'Uprava groblja', d: 'Za grobna mjesta, naknade i održavanje obratite se izravno upravi groblja.' },
        { icon: Flame, t: 'Svijeća na daljinu', d: 'Ako ne možete doći, zapalite virtualnu svijeću i ostavite poruku sjećanja.' },
      ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`${title} | Osmrtnica.com.hr`}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://osmrtnica.com.hr/${kind}`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbJsonLd([{ name: 'Naslovnica', path: '/' }, { name: isSprovodi ? 'Sprovodi' : 'Groblja' }]))}
        </script>
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-display font-bold mb-3">{isSprovodi ? 'Sprovodi u Hrvatskoj' : 'Groblja u Hrvatskoj'}</h1>
        <p className="text-muted-foreground mb-8 max-w-3xl">{description}</p>

        <section className="mb-12">
          <h2 className="text-2xl font-display font-bold mb-2">{isSprovodi ? 'Sprovodi po gradovima' : 'Groblja po gradovima'}</h2>
          <p className="text-muted-foreground mb-6">Izaberite grad.</p>
          {cityLinks(kind, isSprovodi ? 'Sprovodi' : 'Groblja')}
        </section>

        {isSprovodi && funeralTable}

        <MemorialCtaBanner />

        {!isSprovodi && funeralTable}


        <section className="mb-12">
          <h2 className="text-2xl font-display font-bold mb-2">{isSprovodi ? 'Groblja po gradovima' : 'Sprovodi po gradovima'}</h2>
          <p className="text-muted-foreground mb-6">{isSprovodi ? 'Adrese, kontakti i radno vrijeme groblja.' : 'Raspored sprovoda i ispraćaja.'}</p>
          {cityLinks(isSprovodi ? 'groblja' : 'sprovodi', isSprovodi ? 'Groblja' : 'Sprovodi')}
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-display font-bold mb-6">Umrli po gradovima</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <Link to="/umrli" className={linkCls}><span className="font-medium">Svi umrli</span><MapPin size={16} className="text-memorial-gold" /></Link>
            {MAIN_CITIES.map((c) => (
              <Link key={c} to={`/umrli/${toSlug(c)}`} className={linkCls}>
                <span className="font-medium text-foreground group-hover:text-memorial-gold transition-colors">Umrli {c}</span>
                <MapPin size={16} className="text-memorial-gold flex-shrink-0" />
              </Link>
            ))}
            <Link to="/gradovi" className={linkCls}><span className="font-medium">Svi gradovi</span><MapPin size={16} className="text-memorial-gold" /></Link>
          </div>
        </section>

        <VirtualCandles />

        <section className="mt-12 sm:mt-16">
          <div className="bg-card text-foreground border border-memorial-gold/40 p-8 md:p-12 shadow-lg">
            <h2 className="font-display text-2xl md:text-3xl text-center mb-10">Korisne informacije</h2>
            <div className="grid sm:grid-cols-2 gap-8">
              {infoItems.map(({ icon: Icon, t, d }) => (
                <div key={t} className="flex gap-4">
                  <Icon className="text-memorial-gold flex-shrink-0 mt-1" size={22} />
                  <div>
                    <h3 className="font-semibold mb-1">{t}</h3>
                    <p className="text-sm text-muted-foreground">{d}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-10">
              <Button asChild><Link to="/objavi-osmrtnicu">Objavi osmrtnicu</Link></Button>
              <Button asChild variant="outline"><Link to="/zapali-svijecu">Zapali svijeću</Link></Button>
              <Button asChild variant="outline"><Link to="/digitalni-memorijal">Digitalni memorijal</Link></Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CityIndexPage;
