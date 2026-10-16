import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Flower2 } from 'lucide-react';
import { MEMORIAL_PRICE_LABEL } from '@/lib/memorial';
import { trackObituaryEvent } from '@/lib/obituaryTracking';

interface Props {
  /** Where the banner sits, sent with the click so GA4 can compare placements. */
  placement?: string;
}

const MemorialCtaBanner = ({ placement = 'banner' }: Props) => {
  const track = (memorial_action: string) =>
    trackObituaryEvent('obituary_memorial_click', null, { placement, memorial_action });

  return (
    <section className="mt-6 sm:mt-8 mb-14 sm:mb-20">
      <div className="relative overflow-hidden bg-memorial-gold text-foreground rounded-sm border border-memorial-gold shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-foreground/40 to-transparent" />
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(255,255,255,0.8)_100%)]" />

        <div className="relative px-6 py-10 md:px-12 md:py-14 text-center">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-foreground border border-foreground/40 rounded-full px-4 py-1.5 mb-5">
            <Sparkles className="h-3.5 w-3.5" />
            Digitalni memorijal
          </div>

          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
            Sačuvajte sjećanje na voljenu osobu
          </h2>
          <p className="text-foreground/75 text-sm sm:text-base md:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            Digitalni memorijal je mirna stranica posvećena vašoj voljenoj osobi — s fotografijama, životnom pričom, porukama obitelji i virtualnim svijećama. {MEMORIAL_PRICE_LABEL} jednokratno.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              to="/digitalni-memorijal/kreiraj"
              onClick={() => track('create')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-foreground text-memorial-gold font-bold uppercase tracking-[0.15em] text-xs sm:text-sm hover:bg-foreground/90 transition-colors duration-300"
            >
              Kreiraj memorijal
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/digitalni-memorijal"
              onClick={() => track('learn_more')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-foreground/60 text-foreground font-bold uppercase tracking-[0.15em] text-xs sm:text-sm hover:bg-foreground/10 transition-colors duration-300"
            >
              <Flower2 className="w-4 h-4" />
              Saznaj više
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MemorialCtaBanner;
