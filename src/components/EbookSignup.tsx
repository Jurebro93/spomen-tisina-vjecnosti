// E-mail gate for the free guide "Kad izgubite voljenu osobu". After the address is saved the
// download button appears right away; claim-ebook also e-mails the link.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Download, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EBOOK, claimEbook, ebookUnlocked } from '@/lib/ebook';
import { trackNewsletterSignup } from '@/lib/newsletterTracking';

export type EbookVariant = 'home' | 'obituary' | 'landing';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  variant: EbookVariant;
  /** Where the widget sits, stored with the signup and sent to GA4/Meta (e.g. "homepage"). */
  placement: string;
  className?: string;
}

const DownloadButton = ({ placement }: { placement: string }) => (
  <Button asChild size="lg" className="min-h-12 w-full sm:w-auto">
    <a href={EBOOK.pdf} download data-placement={placement}>
      <Download className="mr-2 h-5 w-5" aria-hidden="true" /> Preuzmite vodič (PDF)
    </a>
  </Button>
);

export function EbookForm({ placement, buttonLabel = 'Pošaljite mi vodič', inline = false }: { placement: string; buttonLabel?: string; inline?: boolean }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error' | 'invalid'>(() => (ebookUnlocked() ? 'done' : 'idle'));
  const [fresh, setFresh] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) { setState('invalid'); return; }
    setState('sending');
    const result = await claimEbook(value, placement);
    if (result === 'error') { setState('error'); return; }
    trackNewsletterSignup(`ebook_${placement}`, 'ebook');
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
        <DownloadButton placement={placement} />
        {fresh && <p className="text-sm text-muted-foreground">Poveznicu smo poslali i na vaš e-mail, za slučaj da vam zatreba kasnije.</p>}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <label htmlFor={`ebook-email-${placement}`} className="sr-only">E-mail adresa</label>
      <div className={inline ? 'flex flex-col gap-3 sm:flex-row' : 'space-y-3'}>
      <Input
        id={`ebook-email-${placement}`}
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

export default function EbookSignup({ variant, placement, className = '' }: Props) {
  if (variant === 'obituary') {
    // Under an obituary: a calm, roomy card. Cover and text side by side on
    // wider screens, the address and button on one line, short fine print.
    return (
      <section
        aria-labelledby={`ebook-${placement}`}
        className={`rounded-xl border border-memorial-gold/40 bg-memorial-parchment/60 p-6 sm:p-8 dark:bg-muted/40 ${className}`}
      >
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
          <Link to={EBOOK.landing} className="block w-24 shrink-0 sm:w-28" aria-label="Više o vodiču">
            <img
              src={EBOOK.cover}
              alt="Naslovnica vodiča Kad izgubite voljenu osobu"
              width={800}
              height={1132}
              loading="lazy"
              className="w-full rounded-sm shadow-lg"
            />
          </Link>
          <div className="w-full min-w-0 text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 text-memorial-gold sm:justify-start">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wide">Besplatni vodič · PDF</span>
            </div>
            <h2 id={`ebook-${placement}`} className="mt-3 text-xl font-bold leading-snug text-primary sm:text-2xl">
              Što učiniti nakon smrti bliske osobe
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Sve korake, od sprovoda do ostavine, redom kojim dolaze.
            </p>
            <div className="mt-5 text-left">
              <EbookForm placement={placement} inline />
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
      <div className={`grid gap-6 md:grid-cols-[180px_1fr_minmax(260px,320px)] md:items-center`}>
        <Link to={EBOOK.landing} className="mx-auto block w-28 sm:w-full" aria-label="Više o vodiču">
          <img
            src={EBOOK.cover}
            alt="Naslovnica vodiča Kad izgubite voljenu osobu"
            width={800}
            height={1132}
            loading="lazy"
            className="w-full rounded-sm shadow-lg"
          />
        </Link>
        <div>
          <div className="flex items-center gap-2 text-memorial-gold">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wide">Besplatni vodič · {EBOOK.pages} stranice · PDF</span>
          </div>
          <h2 id={`ebook-${placement}`} className={`mt-2 font-bold text-primary text-xl sm:text-2xl`}>
            {EBOOK.title + ': vodič korak po korak'}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Sprovod, smrtni list, obiteljska mirovina, banke i ostavina, redom kojim dolaze. Podaci su provjereni prema službenim izvorima, a na kraju su kontrolne liste za ispis.
          </p>
          <Link to={EBOOK.landing} className="mt-2 inline-block text-sm font-medium text-primary underline underline-offset-4">
            Pogledajte sadržaj vodiča
          </Link>
        </div>
        <EbookForm placement={placement} />
      </div>
    </section>
  );
}
