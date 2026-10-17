// Inline email signup shown on high-traffic pages (blog posts, obituaries, guides).
// Stores subscribers via the existing subscribe-newsletter function (newsletter_users table)
// and pushes a `newsletter_signup` dataLayer event for GA4 when analytics consent is given.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { hasConsent } from '@/lib/consent';

export type NewsletterVariant = 'blog' | 'obituary' | 'guide';

const COPY: Record<NewsletterVariant, { title: string; text: string; points: string[]; button: string }> = {
  blog: {
    title: 'Ne morate sve znati odjednom',
    text: 'Kad izgubimo blisku osobu, pitanja stižu jedno za drugim: dokumenti, ostavina, sprovod, prva godišnjica. Ostavite svoj e-mail i povremeno ćemo vam poslati praktične vodiče koji olakšavaju korake koji slijede.',
    points: [
      'Jasni vodiči: dokumenti, ostavinska rasprava, troškovi pogreba',
      'Tekstovi koji pružaju utjehu u razdoblju tugovanja',
      'Bez reklamnih poruka, odjava u svakom trenutku',
    ],
    button: 'Želim primati savjete',
  },
  obituary: {
    title: 'Uz vas i nakon oproštaja',
    text: 'Ako ste izgubili blisku osobu, povremeno ćemo vam poslati savjete o koracima nakon smrti i tekstove koji pružaju utjehu. Bez žurbe i bez obveze.',
    points: [],
    button: 'Prijavi se',
  },
  guide: {
    title: 'Korisni savjeti kad su najpotrebniji',
    text: 'Što učiniti nakon smrti, kako organizirati sprovod, koji su dokumenti potrebni za ostavinu. Ostavite e-mail i šaljemo vam jasne, provjerene vodiče, tako da ništa važno ne promakne.',
    points: [
      'Praktični koraci objašnjeni jednostavno',
      'Odjava u svakom trenutku',
    ],
    button: 'Želim primati savjete',
  },
};

const DONE_KEY = 'osm_newsletter_subscribed';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const alreadySubscribed = () => {
  try { return localStorage.getItem(DONE_KEY) === '1'; } catch { return false; }
};

const trackSignup = (placement: string, variant: NewsletterVariant) => {
  if (typeof window === 'undefined' || !hasConsent('analytics')) return;
  const w = window as Window & { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push({
    event: 'newsletter_signup',
    newsletter_placement: placement,
    newsletter_variant: variant,
    page_path: window.location.pathname,
  });
};

interface Props {
  variant?: NewsletterVariant;
  /** Where on the site the widget sits, sent to GA4 (e.g. "blog_post", "obituary"). */
  placement: string;
  className?: string;
}

export default function NewsletterSignup({ variant = 'blog', placement, className = '' }: Props) {
  const copy = COPY[variant];
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'exists' | 'error' | 'invalid'>('idle');
  const [hidden] = useState(alreadySubscribed);

  if (hidden) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) { setState('invalid'); return; }
    setState('sending');
    const { data, error } = await supabase.functions.invoke('subscribe-newsletter', { body: { email: value } });
    const status = (error as { context?: { status?: number } } | null)?.context?.status;
    if (status === 409 || data?.error === 'Email already subscribed') { setState('exists'); return; }
    if (error || data?.error) { setState('error'); return; }
    try { localStorage.setItem(DONE_KEY, '1'); } catch { /* storage unavailable */ }
    trackSignup(placement, variant);
    setState('done');
  };

  const compact = variant === 'obituary';

  return (
    <section
      aria-labelledby={`newsletter-${placement}`}
      className={`rounded-xl border border-memorial-gold/40 bg-memorial-parchment/60 dark:bg-muted/40 ${compact ? 'p-5' : 'p-6 sm:p-8'} ${className}`}
    >
      {state === 'done' || state === 'exists' ? (
        <div role="status" className="flex items-start gap-3">
          <Check className="h-6 w-6 shrink-0 text-memorial-gold" />
          <div>
            <p className="font-semibold text-primary">{state === 'done' ? 'Hvala vam, prijava je zaprimljena.' : 'Ova adresa je već prijavljena.'}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {state === 'done' ? 'Javit ćemo vam se samo sa sadržajem koji može pomoći.' : 'Nastavit ćete primati naše savjete, ne morate ništa poduzimati.'}
            </p>
          </div>
        </div>
      ) : (
        <div className={compact ? '' : 'sm:flex sm:gap-8'}>
          <div className={compact ? 'mb-4' : 'mb-5 sm:mb-0 sm:flex-1'}>
            <div className="flex items-center gap-2 text-memorial-gold">
              <Mail className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wide">Besplatni savjeti na e-mail</span>
            </div>
            <h2 id={`newsletter-${placement}`} className={`mt-2 font-bold text-primary ${compact ? 'text-lg' : 'text-xl sm:text-2xl'}`}>{copy.title}</h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">{copy.text}</p>
            {copy.points.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-sm text-foreground/80">
                {copy.points.map((p) => (
                  <li key={p} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-memorial-gold" />{p}</li>
                ))}
              </ul>
            )}
          </div>
          <form onSubmit={submit} noValidate className={compact ? 'space-y-3' : 'space-y-3 sm:w-80 sm:self-center'}>
            <label htmlFor={`newsletter-email-${placement}`} className="sr-only">E-mail adresa</label>
            <Input
              id={`newsletter-email-${placement}`}
              type="email"
              autoComplete="email"
              placeholder="vaš e-mail"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (state === 'invalid' || state === 'error') setState('idle'); }}
              className="min-h-11 bg-background"
              aria-invalid={state === 'invalid'}
            />
            <Button type="submit" className="min-h-11 w-full" disabled={state === 'sending'}>
              {state === 'sending' ? 'Prijava...' : copy.button}
            </Button>
            {state === 'invalid' && <p role="alert" className="text-sm text-destructive">Molimo upišite ispravnu e-mail adresu.</p>}
            {state === 'error' && <p role="alert" className="text-sm text-destructive">Prijava trenutačno nije uspjela. Molimo pokušajte ponovno.</p>}
            <p className="text-xs text-muted-foreground leading-snug">
              Prijavom pristajete na primanje e-mailova s portala osmrtnica.com.hr. Adresu ne dijelimo s trećima, a odjaviti se možete u svakom trenutku.{' '}
              <Link to="/politika-privatnosti/" className="underline hover:text-foreground">Politika privatnosti</Link>
            </p>
          </form>
        </div>
      )}
    </section>
  );
}
