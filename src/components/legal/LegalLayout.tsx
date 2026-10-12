import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SEOHelmet } from '@/hooks/useSEO';
import { formatHrDate, LEGAL_EFFECTIVE_DATE } from '@/lib/legal';

interface Props {
  title: string;
  path: string;
  version: string;
  intro?: ReactNode;
  children: ReactNode;
}

const LegalLayout = ({ title, path, version, intro, children }: Props) => (
  <>
    <SEOHelmet pagePath={path} />
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <article className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">{title}</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Verzija {version} · Na snazi od {formatHrDate(LEGAL_EFFECTIVE_DATE)}
          </p>
          {intro && <div className="text-lg text-foreground/90 mb-8 leading-relaxed">{intro}</div>}
          <div className="legal-prose space-y-6 text-foreground/90 leading-relaxed">{children}</div>
        </article>
      </main>
      <Footer />
    </div>
  </>
);

export const H2 = ({ children }: { children: ReactNode }) => (
  <h2 className="text-xl md:text-2xl font-display font-semibold text-foreground pt-4">{children}</h2>
);
export const L = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className="text-primary underline underline-offset-2 hover:no-underline">{children}</Link>
);

export default LegalLayout;
