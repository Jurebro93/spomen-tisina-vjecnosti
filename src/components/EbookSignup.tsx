// E-mail gate for the free guides. After the address is saved the download button appears
// right away; claim-ebook also e-mails the link.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Download, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EBOOK, EBOOKS, GUIDES, claimEbook, ebookUnlocked, type GuideId } from '@/lib/ebook';
import { trackNewsletterSignup } from '@/lib/newsletterTracking';

export type EbookVariant = 'home' | 'obituary' | 'blog' | 'landing';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Widget copy per guide: a short card (obituary, blog) and the longer wide version. */
const COPY: Record<GuideId, { heading: string; blurb: string; long: string }> = {
  'kad-izgubite-voljenu-osobu': {
    heading: 'Što učiniti nakon smrti bliske osobe',
    blurb: 'Sve korake, od sprovoda do ostavine, redom kojim dolaze.',
    long: 'Sprovod, smrtni list, obiteljska mirovina, banke i ostavina, redom kojim dolaze. Podaci su provjereni prema službenim izvorima, a na kraju su kontrolne liste za ispis.',
  },
  'obiteljska-mirovina': {
    heading: 'Obiteljska mirovina: tko ima pravo i koliko iznosi',
    blurb: 'Uvjeti, iznosi, rokovi i dokumenti za zahtjev HZMO-u na jednom mjestu.',
    long: 'Tko ima pravo, kako se računa iznos, kada se isplati model od 27 % i kako predati zahtjev na vrijeme. Provjereno prema Zakonu o mirovinskom osiguranju i HZMO-u, s kontrolnim popisom dokumenata.',
  },
  'smrt-u-inozemstvu': {
    heading: 'Bližnji je umro u inozemstvu: što sada',
    blurb: 'Prijava smrti vani, prijevoz tijela ili urne kući, mirovine i ostavina.',
    long: 'Što napraviti kad bližnji umre u Njemačkoj, Austriji, Švicarskoj ili Irskoj: prijava smrti, sprovodnica, prijevoz tijela ili urne, troškovi, mirovine i ostavina preko granice, s kontrolnim popisom dokumenata.',
  },
  'digitalna-ostavstina': {
    heading: 'Digitalna ostavština: profili, fotografije i pretplate',
    blurb: 'Facebook, Instagram, Google i Apple računi preminule osobe, mobitel i pretplate.',
    long: 'Kako sačuvati fotografije i poruke, memorijalizirati ili ugasiti Facebook, Instagram i Google račune, doći do iClouda te otkazati pretplate i mobitel. Uz obrazac za vlastitu digitalnu ostavštinu.',
  },
};

interface Props {
  variant: EbookVariant;
  /** Where the widget sits, stored with the signup and sent to GA4/Meta (e.g. "homepage"). */
  placement: string;
  guide?: GuideId;
  className?: string;
}

const DownloadButton = ({ placement, guide }: { placement: string; guide: GuideId }) => (
  <Button asChild size="lg" className="min-h-12 w-full sm:w-auto">
    <a href={EBOOKS[guide].pdf} download data-placement={placement}>
      <Download className="mr-2 h-5 w-5" aria-hidden="true" /> Preuzmite vodič (PDF)
    </a>
  </Button>
);

export function EbookForm({ placement, guide = EBOOK.id, buttonLabel = 'Pošaljite mi vodič', inline = false }: { placement: string; guide?: GuideId; buttonLabel?: string; inline?: boolean }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error' | 'invalid'>(() => (ebookUnlocked(guide) ? 'done' : 'idle'));
  const [fresh, setFresh] = useState(false);
  const inputId = `ebook-email-${guide}-${placement}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) { setState('invalid'); return; }
    setState('sending');
    const result = await claimEbook(value, placement, guide);
    if (result === 'error') { setState('error'); return; }
    // The first guide keeps its original event names so existing reports stay comparable.
    trackNewsletterSignup(guide === EBOOK.id ? `ebook_${placement}` : `ebook_${guide}_${placement}`, 'ebook');
    setFresh(true);
    setState('done');
  };

  if (state === 'done') {
    return (
      <div role="status" className="space-y-3">
        <p className="flex items-start gap-2 font-semibold text-primary">
          <Check className="mt-0.5 h-5 w-5 shrink-0 text-memorial-gold" aria-hidden="true" />
          {fresh ? 'Hvala vam. Vodič je spreman za preuzimanje.' : 'Vodič vam je već otključan.'}
        </p>
        <DownloadButton placement={placement} guide={guide} />
        {fresh && <p className="text-sm text-muted-foreground">Poveznicu smo poslali i na vaš e-mail, za slučaj da vam zatreba kasnije.</p>}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <label htmlFor={inputId} className="sr-only">E-mail adresa</label>
      <div className={inline ? 'flex flex-col gap-3 sm:flex-row' : 'space-y-3'}>
      <Input
        id={inputId}
        type="email"
        autoComplete="email"
        placeholder="vaš e-mail"
        value={email}
        onChange={(e) => { setEmail(e.target.value); if (state === 'invalid' || state === 'error') setState('idle'); }}
        className="min-h-12 bg-background text-base"
        aria-invalid={state === 'invalid'}
      />
      <Button type="submit" size="lg" className={`min-h-12 ${inline ? 'w-full sm:w-auto sm:shrink-0' : 'w-full'}`} disabled={state === 'sending'}>
        {state === 'sending' ? 'Šaljemo...' : buttonLabel}
      </Button>
      </div>
      {state === 'invalid' && <p role="alert" className="text-sm text-destructive">Molimo upišite ispravnu e-mail adresu.</p>}
      {state === 'error' && <p role="alert" className="text-sm text-destructive">Slanje trenutačno nije uspjelo. Molimo pokušajte ponovno.</p>}
      <p className="text-xs leading-snug text-muted-foreground">
        Vodič je besplatan. Uz njega ćemo vam povremeno poslati praktične savjete; odjaviti se možete u svakom trenutku, a adresu ne dijelimo s trećima.{' '}
        <Link to="/politika-privatnosti/" className="underline hover:text-foreground">Politika privatnosti</Link>
      </p>
    </form>
  );
}

const Cover = ({ guide, className }: { guide: GuideId; className: string }) => (
  <Link to={EBOOKS[guide].landing} className={className} aria-label="Više o vodiču">
    <img
      src={EBOOKS[guide].cover}
      alt={`Naslovnica vodiča ${EBOOKS[guide].title}`}
      width={800}
      height={1132}
      loading="lazy"
      className="w-full rounded-sm shadow-lg"
    />
  </Link>
);

/** Suffix of the homepage placement per guide. The first two keep their original values so earlier signups stay comparable. */
const HOME_PLACEMENT: Record<GuideId, string> = {
  'kad-izgubite-voljenu-osobu': '',
  'obiteljska-mirovina': '_mirovina',
  'smrt-u-inozemstvu': '_inozemstvo',
  'digitalna-ostavstina': '_digitalna',
};

/** Homepage: all guides in a grid, each with its own form. */
function HomeGuides({ placement, className }: { placement: string; className: string }) {
  return (
    <section aria-labelledby={`ebook-${placement}`} className={className}>
      <div className="flex items-center gap-2 text-memorial-gold">
        <BookOpen className="h-5 w-5" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wide">Besplatni vodiči · PDF</span>
      </div>
      <h2 id={`ebook-${placement}`} className="mt-2 text-2xl font-bold text-primary sm:text-3xl">Vodiči za obitelji</h2>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Praktični vodiči koje smo napisali za obitelji koje prolaze kroz gubitak. Besplatni su, provjereni prema službenim izvorima i stižu vam na e-mail.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {GUIDES.map((g) => (
          <article key={g.id} className="flex flex-col gap-5 rounded-xl border border-memorial-gold/40 bg-memorial-parchment/60 p-6 dark:bg-muted/40 sm:flex-row sm:p-7">
            <Cover guide={g.id} className="mx-auto block w-28 shrink-0 sm:mx-0 sm:w-32" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-memorial-gold">{g.pagesLabel} · PDF</p>
              <h3 className="mt-1 text-xl font-bold leading-snug text-primary">{g.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{COPY[g.id].blurb}</p>
              <Link to={g.landing} className="mt-1 inline-block text-sm font-medium text-primary underline underline-offset-4">
                Pogledajte sadržaj vodiča
              </Link>
              <div className="mt-4">
                                <EbookForm placement={HOME_PLACEMENT[g.id] ? `${placement}${HOME_PLACEMENT[g.id]}` : placement} guide={g.id} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function EbookSignup({ variant, placement, guide = EBOOK.id, className = '' }: Props) {
  if (variant === 'home') return <HomeGuides placement={placement} className={className} />;

  const g = EBOOKS[guide];
  if (variant === 'obituary' || variant === 'blog') {
    // Under an obituary or a blog post: a calm, roomy card. Cover and text side by side on
    // wider screens, the address and button on one line, short fine print.
    return (
      <section
        aria-labelledby={`ebook-${placement}`}
        className={`rounded-xl border border-memorial-gold/40 bg-memorial-parchment/60 p-6 sm:p-8 dark:bg-muted/40 ${className}`}
      >
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
          <Cover guide={guide} className="block w-24 shrink-0 sm:w-28" />
          <div className="w-full min-w-0 text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 text-memorial-gold sm:justify-start">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wide">Besplatni vodič · PDF</span>
            </div>
            <h2 id={`ebook-${placement}`} className="mt-3 text-xl font-bold leading-snug text-primary sm:text-2xl">
              {COPY[guide].heading}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              {COPY[guide].blurb}{' '}
              {variant === 'blog' && <>Upišite e-mail i poslat ćemo vam vodič „{g.title}”.</>}
            </p>
            <div className="mt-5 text-left">
              <EbookForm placement={placement} guide={guide} inline />
            </div>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section
      aria-labelledby={`ebook-${placement}`}
      className={`rounded-xl border border-memorial-gold/40 bg-memorial-parchment/60 dark:bg-muted/40 p-6 sm:p-8 ${className}`}
    >
      <div className="grid gap-6 md:grid-cols-[180px_1fr_minmax(260px,320px)] md:items-center">
        <Cover guide={guide} className="mx-auto block w-28 sm:w-full" />
        <div>
          <div className="flex items-center gap-2 text-memorial-gold">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wide">Besplatni vodič · {g.pagesLabel} · PDF</span>
          </div>
          <h2 id={`ebook-${placement}`} className="mt-2 text-xl font-bold text-primary sm:text-2xl">
            {g.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{COPY[guide].long}</p>
          <Link to={g.landing} className="mt-2 inline-block text-sm font-medium text-primary underline underline-offset-4">
            Pogledajte sadržaj vodiča
          </Link>
        </div>
        <EbookForm placement={placement} guide={guide} />
      </div>
    </section>
  );
}
