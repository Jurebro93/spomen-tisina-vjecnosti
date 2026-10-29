import { Link } from 'react-router-dom';
import { ArrowRight, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MemorialPrice from '@/components/promo/MemorialPrice';

interface Props {
  heading: string;
  text: string;
  cta: string;
  to?: string;
  onClick?: () => void;
  className?: string;
}

/** Compact digital-memorial card for the middle of long pages (blog text, city lists). Shows the current price. */
const MemorialInlineCard = ({ heading, text, cta, to = '/digitalni-memorijal', onClick, className = 'my-10' }: Props) => (
  <aside className={`not-prose rounded-xl border-l-4 border-memorial-gold bg-memorial-parchment/60 p-5 sm:p-6 dark:bg-muted/40 ${className}`}>
    <div className="flex items-center gap-1.5 text-memorial-gold">
      <Heart className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="text-[0.7rem] font-semibold uppercase tracking-wide">Digitalni memorijal</span>
    </div>
    <p className="mt-1 font-display text-lg font-bold leading-snug text-primary">{heading}</p>
    <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">{text}</p>
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <Button asChild size="sm" className="bg-memorial-gold text-white hover:bg-memorial-gold/90">
        <Link to={to} onClick={onClick}>{cta} <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" /></Link>
      </Button>
      <span className="text-sm font-semibold text-foreground">Jednokratno <MemorialPrice /></span>
    </div>
  </aside>
);

export default MemorialInlineCard;
