import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { breadcrumbJsonLd } from '@/lib/seo';
import { NAMES_HUB, fetchNameList, firstLetter, formatImendan, sortHr, todayMd, type NameListItem } from '@/lib/clusters';

const SITE = 'https://osmrtnica.com.hr';

const ZnacenjeImenaHub = () => {
  const [params, setParams] = useSearchParams();
  const [names, setNames] = useState<NameListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [letter, setLetter] = useState('');
  const [gender, setGender] = useState('');
  const q = params.get('q') ?? '';

  useEffect(() => {
    fetchNameList()
      .then(setNames)
      .finally(() => setLoading(false));
  }, []);

  const letters = useMemo(() => [...new Set(names.map((n) => firstLetter(n.name)))].sort(sortHr), [names]);
  const today = todayMd();
  const todays = names.filter((n) => n.imendani.some((i) => i.d === today));
  const shown = names
    .filter((n) => (!letter || firstLetter(n.name) === letter) && (!gender || n.gender === gender) && (!q || n.name.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => sortHr(a.name, b.name));

  const title = 'Značenje imena i imendani – podrijetlo imena od A do Ž';
  const description = 'Značenje, podrijetlo i imendan za stotine hrvatskih imena, uz čestitke za imendan i zanimljive brojke iz osmrtnica.';

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={SITE + NAMES_HUB} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbJsonLd([{ name: 'Naslovnica', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Značenje imena' }]))}
        </script>
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <nav className="mb-6 text-sm text-muted-foreground" aria-label="breadcrumb">
          <Link to="/" className="hover:text-memorial-gold">Početna</Link> › <Link to="/blog" className="hover:text-memorial-gold">Blog</Link> › <span className="text-memorial-gold">Značenje imena</span>
        </nav>
        <h1 className="font-serif text-3xl font-semibold md:text-4xl">Značenje imena i imendani</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
        <input
          value={q}
          onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
          placeholder="Upiši ime, npr. Lucija"
          className="my-5 w-full max-w-xl rounded-md border border-input px-4 py-3 text-base"
          aria-label="Traži ime"
        />
        {todays.length > 0 && (
          <div className="mb-5 rounded-xl border border-[hsl(var(--memorial-parchment-border))] bg-[hsl(var(--memorial-parchment-card))] p-4">
            <b>Imendan danas ({formatImendan(today)}):</b>{' '}
            {todays.map((n, i) => (
              <span key={n.slug}>
                {i > 0 && ', '}
                <Link to={`${NAMES_HUB}/${n.slug}`} className="text-memorial-gold hover:underline">{n.name}</Link>
              </span>
            ))}
          </div>
        )}
        <div className="mb-3 flex flex-wrap gap-2">
          {[['', 'Sva imena'], ['muško', 'Muška imena'], ['žensko', 'Ženska imena']].map(([v, l]) => (
            <button key={l} onClick={() => setGender(v)} className={`rounded-full border px-3 py-1 text-sm ${gender === v ? 'border-memorial-gold bg-memorial-gold text-white' : 'border-border hover:border-memorial-gold'}`}>{l}</button>
          ))}
        </div>
        <div className="mb-5 flex flex-wrap gap-1.5">
          <button onClick={() => setLetter('')} className={`h-9 rounded-md border px-3 text-sm font-semibold ${!letter ? 'border-memorial-gold bg-memorial-gold text-white' : 'border-border'}`}>Sve</button>
          {letters.map((l) => (
            <button key={l} onClick={() => setLetter(l)} className={`h-9 min-w-9 rounded-md border px-2 text-sm font-semibold ${letter === l ? 'border-memorial-gold bg-memorial-gold text-white' : 'border-border hover:border-memorial-gold'}`}>{l}</button>
          ))}
        </div>
        {loading ? (
          <p className="text-muted-foreground">Učitavanje...</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {shown.map((n) => (
              <Link key={n.slug} to={`${NAMES_HUB}/${n.slug}`} className="rounded-lg border border-border bg-white p-3 text-sm hover:border-memorial-gold">
                {n.name}
                <small className="block text-xs text-muted-foreground">{n.imendani[0] ? `imendan ${formatImendan(n.imendani[0].d)}` : n.gender === 'žensko' ? 'žensko ime' : 'muško ime'}</small>
              </Link>
            ))}
            {shown.length === 0 && <p className="text-muted-foreground">Nema imena za taj upit.</p>}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ZnacenjeImenaHub;
