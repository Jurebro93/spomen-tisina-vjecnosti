// "Tell me when a new obituary appears in <city>" signup, shown between obituary cards on /umrli/:city.
// Saves the city via the subscribe-newsletter function (obituary_city_alerts); the newsletter itself
// is joined only when the unticked marketing checkbox is ticked.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { trackNewsletterSignup } from '@/lib/newsletterTracking';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DONE_KEY = 'osm_newsletter_subscribed';

interface Props {
  /** City slug from the URL (e.g. "zagreb"), stored with the alert. */
  city: string;
  /** City name as shown on the page. */
  cityName: string;
  className?: string;
}

export default function CityObituaryAlert({ city, cityName, className = '' }: Props) {
  const [email, setEmail] = useState('');
  const [marketing, setMarketing] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error' | 'invalid'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) { setState('invalid'); return; }
    setState('sending');
    const { data, error } = await supabase.functions.invoke('subscribe-newsletter', {
      body: { email: value, city, marketing },
    });
    if (error || data?.error) { setState('error'); return; }
    if (marketing) { try { localStorage.setItem(DONE_KEY, '1'); } catch { /* storage unavailable */ } }
    trackNewsletterSignup('city_alert', marketing ? 'city_alert_marketing' : 'city_alert');
    setState('done');
  };

  return (
    <section
      aria-labelledby="city-alert-heading"
      className={`rounded-xl bg-foreground text-background p-6 sm:p-8 md:flex md:items-center md:gap-8 ${className}`}
    >
      <div className="md:flex-1 mb-5 md:mb-0">
        <div className="flex items-center gap-2 text-memorial-gold">
          <Bell className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-wide">Obavijest na e-mail</span>
        </div>
        <h2 id="city-alert-heading" className="mt-2 font-display text-xl sm:text-2xl font-bold">
          Javite mi kad izađe nova osmrtnica za {cityName}
        </h2>
        <p className="mt-2 text-sm sm:text-base text-background/75 leading-relaxed">
          Jednom dnevno, samo kad ima novih osmrtnica i sprovoda. Odjava jednim klikom.
        </p>
      </div>

      <div className="md:w-96">
        {state === 'done' ? (
          <div role="status" className="flex items-start gap-3 rounded-lg bg-background/10 p-4">
            <Check className="h-6 w-6 shrink-0 text-memorial-gold" />
            <div>
              <p className="font-semibold">Prijava je zaprimljena.</p>
              <p className="mt-1 text-sm text-background/75">Javit ćemo vam kad izađe nova osmrtnica za {cityName}.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-3">
            <label htmlFor="city-alert-email" className="sr-only">E-mail adresa</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="city-alert-email"
                type="email"
                autoComplete="email"
                placeholder="vaš e-mail"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (state === 'invalid' || state === 'error') setState('idle'); }}
                className="min-h-11 bg-background text-foreground"
                aria-invalid={state === 'invalid'}
              />
              <Button
                type="submit"
                disabled={state === 'sending'}
                className="min-h-11 bg-memorial-gold text-foreground hover:bg-memorial-gold/90 font-semibold"
              >
                {state === 'sending' ? 'Prijava...' : 'Prijavi me'}
              </Button>
            </div>
            <label className="flex items-start gap-2 text-xs sm:text-sm text-background/75 leading-snug cursor-pointer">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-memorial-gold"
              />
              Želim primati i povremene vodiče i ponude portala (npr. popust na digitalni memorijal).
            </label>
            {state === 'invalid' && <p role="alert" className="text-sm text-red-300">Molimo upišite ispravnu e-mail adresu.</p>}
            {state === 'error' && <p role="alert" className="text-sm text-red-300">Prijava trenutačno nije uspjela. Molimo pokušajte ponovno.</p>}
            <p className="text-xs text-background/60 leading-snug">
              Adresu ne dijelimo s trećima.{' '}
              <Link to="/politika-privatnosti/" className="underline hover:text-background">Politika privatnosti</Link>
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
