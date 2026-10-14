import { useEffect, useRef, useState } from 'react';
import { Newspaper } from 'lucide-react';

const MENTIONS = [
  {
    name: 'Narod.hr',
    logo: '/site/logos/logo-narod.png',
    url: 'https://narod.hr/dom-i-obitelj/digitalni-memorijal-novi-nacin-cuvanja-uspomena-na-voljene-osobe',
  },
  {
    name: 'Novi Život',
    logo: '/site/logos/logo-novizivot.png',
    url: 'https://www.novizivot.net/digitalni-memorijal-novi-nacin-cuvanja-uspomena-na-voljene-osobe/',
  },
  {
    name: 'Poslovni dnevnik',
    logo: '/site/logos/logo-poslovni.png',
    url: 'https://www.poslovni.hr/hrvatska/nova-hrvatska-digitalna-platforma-za-cuvanje-zivotnih-prica-i-obiteljskih-uspomena-4556342',
  },
  {
    name: 'Story',
    logo: '/site/logos/logo-story-dark.png',
    url: 'https://story.hr/Promo/a409874/mjesto-tisine-zahvalnosti-i-zajednickog-prisjecanja.html',
  },
  {
    name: 'Telegram',
    logo: '/site/logos/logo-telegram.png',
    url: 'https://www.telegram.hr/partneri/digitalni-memorijal-novi-nacin-cuvanja-uspomena-na-voljene-osobe/',
  },
  {
    name: 'IstraIN',
    logo: '/site/logos/logo-istrain.png',
    url: 'https://istrain.hr/ostalo/zanimljivosti/6ac88bf19ff81/digitalni-memorijal-novi-nacin-cuvanja-uspomena-na-voljene-osobe/vijest',
  },
  {
    name: 'Dnevno',
    logo: '/site/logos/logo-dnevno.png',
    url: 'https://www.dnevno.hr/magazin/digitalni-memorijal-novi-nacin-cuvanja-uspomena-na-voljene-osobe-3440989/',
  },
];

const MediaLogo = ({ name, logo }: { name: string; logo: string }) => {
  const [retry, setRetry] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span className="text-lg font-bold text-foreground">{name}</span>;
  }

  return (
    <img
      src={retry ? `${logo}?retry=1` : logo}
      alt={`Logotip portala ${name}`}
      className="h-10 w-full object-contain grayscale contrast-125 transition-opacity duration-200 hover:opacity-80"
      loading="eager"
      decoding="async"
      onError={() => {
        if (!retry) setRetry(true);
        else setFailed(true);
      }}
    />
  );
};

const MediaMentionsSection = () => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const touchTimerRef = useRef<number | null>(null);

  // Na mobitelu: 2 logotipa u redu, automatsko skrolanje svakih 1.5 s
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const interval = window.setInterval(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        const firstCard = el.querySelector('[data-mention-card]') as HTMLElement | null;
        if (!firstCard) return;
        const styles = window.getComputedStyle(el);
        const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
        el.scrollBy({ left: firstCard.offsetWidth + gap, behavior: 'smooth' });
      }
    }, 1500);

    return () => window.clearInterval(interval);
  }, []);

  const pauseResume = () => {
    if (touchTimerRef.current) window.clearTimeout(touchTimerRef.current);
  };

  return (
    <section aria-label="Portali koji su pisali o nama" className="py-4 md:py-6 border-y border-border/60 bg-muted/30">
      <div className="container mx-auto px-4">
        <p className="flex items-center justify-center gap-2 text-[11px] md:text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          <Newspaper className="h-4 w-4 text-accent" aria-hidden="true" />
          O nama su pisali
        </p>

        {/* Desktop: svi logotipi u redu */}
        <div className="hidden md:flex flex-wrap items-center justify-center gap-x-6 gap-y-4 mt-4">
          {MENTIONS.map((m) => (
            <a
              key={m.name}
              href={m.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              aria-label={`Članak na portalu ${m.name}`}
              className="hover-scale flex h-10 w-32 max-w-full items-center justify-center"
            >
              <MediaLogo name={m.name} logo={m.logo} />
            </a>
          ))}
        </div>

        {/* Mobitel: 2 logotipa u redu, automatsko skrolanje */}
        <div
          ref={scrollerRef}
          className="md:hidden flex gap-4 mt-4 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar overscroll-x-contain"
          onTouchStart={pauseResume}
          onTouchEnd={() => {
            if (touchTimerRef.current) window.clearTimeout(touchTimerRef.current);
          }}
        >
          {MENTIONS.map((m) => (
            <a
              key={m.name}
              data-mention-card
              href={m.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              aria-label={`Članak na portalu ${m.name}`}
              className="snap-start shrink-0 basis-[calc((100%-1rem)/2)] h-10 min-w-0 flex items-center justify-center"
            >
              <MediaLogo name={m.name} logo={m.logo} />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MediaMentionsSection;
