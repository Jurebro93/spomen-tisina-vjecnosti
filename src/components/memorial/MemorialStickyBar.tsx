import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { currentMemorialPriceLabel } from '@/lib/seasonalPromo';

const CLOSED_KEY = 'osm_memorial_bar_closed';

interface Props {
  to: string;
  /** Short text before the price, e.g. "Memorijal za Ivana Kovačić". */
  label: string;
  /** Verb after the price. */
  action?: string;
  onClick?: () => void;
  onClose?: () => void;
  /** Id of the page's own memorial card: the bar shows only once that card exists, and hides while it is on screen. */
  watchId?: string;
}

const wasClosed = () => {
  try { return localStorage.getItem(CLOSED_KEY) === '1'; } catch { return false; }
};

/** Thin mobile-only bar at the bottom of the screen, shown after the visitor scrolls; closing it hides it for good. */
const MemorialStickyBar = ({ to, label, action = 'Izradi', onClick, onClose, watchId }: Props) => {
  const [closed, setClosed] = useState(wasClosed);
  const [scrolled, setScrolled] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const [cardFound, setCardFound] = useState(!watchId);

  useEffect(() => {
    if (closed) return;
    const onScroll = () => setScrolled(window.scrollY > 700);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [closed]);

  useEffect(() => {
    if (closed || !watchId || typeof IntersectionObserver === 'undefined') return;
    let observer: IntersectionObserver | null = null;
    // The card renders after its data loads, so look for it for up to 30 s.
    let tries = 0;
    const timer = window.setInterval(() => {
      const el = document.getElementById(watchId);
      if (!el) { if (++tries >= 60) window.clearInterval(timer); return; }
      window.clearInterval(timer);
      setCardFound(true);
      observer = new IntersectionObserver(([entry]) => setCardVisible(entry.isIntersecting));
      observer.observe(el);
    }, 500);
    return () => { window.clearInterval(timer); observer?.disconnect(); };
  }, [closed, watchId]);

  if (closed) return null;
  const show = scrolled && cardFound && !cardVisible;

  const close = () => {
    try { localStorage.setItem(CLOSED_KEY, '1'); } catch { /* ignore */ }
    setClosed(true);
    onClose?.();
  };

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-memorial-gold/50 bg-background/95 px-3 py-2 pb-[max(.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur transition-transform duration-200 md:hidden ${show ? 'translate-y-0' : 'pointer-events-none translate-y-full'}`}
      aria-hidden={!show}
    >
      <div className="flex items-center gap-2">
        <Link to={to} onClick={onClick} tabIndex={show ? 0 : -1} className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md bg-memorial-gold px-3 py-2.5 text-white">
          <span className="truncate text-sm font-semibold">{label}</span>
          <span className="shrink-0 text-sm font-bold">{currentMemorialPriceLabel()} · {action}</span>
        </Link>
        <button type="button" onClick={close} tabIndex={show ? 0 : -1} aria-label="Zatvori" className="shrink-0 rounded-md p-2 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default MemorialStickyBar;
