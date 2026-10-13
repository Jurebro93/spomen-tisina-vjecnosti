import { Link, Navigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Sparkles, Info } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import MemorialContent from '@/components/memorial/MemorialContent';
import MemorialSidebar from '@/components/memorial/MemorialSidebar';
import { getMemorialExample } from '@/lib/memorialExamples';
import { fullName, lifeYears } from '@/lib/memorial';

const MemorijalPrimjer = () => {
  const { slug } = useParams();
  const example = getMemorialExample(slug);

  if (!example) return <Navigate to="/digitalni-memorijal" replace />;

  const name = fullName(example.deceased);
  const years = lifeYears(example.deceased.datum_rodenja, example.deceased.datum_smrti);
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const description = `Primjer digitalnog memorijala: ${name} (${years}) — životna priča, fotografije, životni put, sjećanja i virtualne svijeće.`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{`${name} — primjer digitalnog memorijala`.slice(0, 60)}</title>
        <meta name="description" content={description.slice(0, 158)} />
        <meta name="robots" content="noindex,follow" />
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={`${name} (${years}) — primjer memorijala`} />
        <meta property="og:description" content={description.slice(0, 158)} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      <Header />

      <main className="flex-1">
        <div className="bg-secondary/60 border-b border-border">
          <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Info className="h-4 w-4 shrink-0" />
              Ovo je primjer digitalnog memorijala — ovako izgleda stranica koju možete izraditi za svoju voljenu osobu.
            </p>
            <Button asChild size="sm" className="bg-memorial-gold text-white hover:bg-memorial-gold/90">
              <Link to="/digitalni-memorijal/kreiraj">
                <Sparkles className="h-4 w-4 mr-2" /> Kreiraj svoj memorijal
              </Link>
            </Button>
          </div>
        </div>

        <MemorialContent
          preview
          deceased={example.deceased}
          memorial={example.memorial}
          media={example.media}
          events={example.events}
          tributes={example.tributes}
          candles={example.candles}
          coverUrl={example.coverUrl}
          sidebarSlot={<MemorialSidebar url={url} title={`Memorijal — ${name}`} personName={name} />}
        />
      </main>

      <Footer />
    </div>
  );
};

export default MemorijalPrimjer;
