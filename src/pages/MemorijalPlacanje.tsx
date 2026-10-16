import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle, Share2, Flame, Pencil, Mail } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { purchaseEventId, trackEvent } from '@/lib/metaPixel';
import { trackGa4FreeActivation, trackGa4Purchase } from '@/lib/ga4Ecommerce';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import GuestAccountClaim from '@/components/memorial/GuestAccountClaim';

const MemorijalPlacanje = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { guestUser } = useAuth();
  const sessionId = params.get('session_id');
  const freePromo = params.get('besplatno') === '1';
  const promoMemorialId = params.get('memorial');
  const promoSlugParam = params.get('slug');
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [slug, setSlug] = useState<string | null>(null);
  const [memorialId, setMemorialId] = useState<string | null>(promoMemorialId);
  void navigate;
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  useEffect(() => {
    if (state !== 'success' || !memorialId) return;
    (supabase as any).from('memorials').select('scheduled_publish_at').eq('id', memorialId).maybeSingle()
      .then(({ data }: { data: { scheduled_publish_at: string | null } | null }) => setScheduledAt(data?.scheduled_publish_at ?? null));
  }, [state, memorialId]);
  const memorialUrl = slug ? `${window.location.origin}/memorijal/${slug}` : '';
  const share = async () => {
    if (!memorialUrl) return;
    if (navigator.share) { try { await navigator.share({ url: memorialUrl, title: 'Digitalni memorijal' }); } catch { /* ignore */ } }
    else { await navigator.clipboard.writeText(memorialUrl); alert('Poveznica je kopirana.'); }
  };

  // Free promo-code publication: the memorial is already activated on the server.
  useEffect(() => {
    if (!freePromo || !promoMemorialId) return;
    document.title = 'Zahvaljujemo | Digitalni memorijal';
    setSlug(promoSlugParam);
    setState('success');
    trackGa4FreeActivation(promoMemorialId, params.get('kod'));
    const key = `fb_purchase_promo_${promoMemorialId}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      // A free promo code is not a sale: a Purchase with value 0 breaks Meta's value and
      // ROAS optimisation, so free activations get their own custom event.
      trackEvent('FreeMemorialActivated', {
        content_name: 'Digitalni memorijal',
        content_ids: [promoMemorialId],
      }, `free_${promoMemorialId}`);
    }
  }, [freePromo, promoMemorialId, promoSlugParam, navigate]);

  useEffect(() => {
    if (freePromo) return;
    document.title = 'Potvrda plaćanja | Digitalni memorijal';
    if (!sessionId) {
      setState('error');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('verify-memorial-payment', {
          body: { session_id: sessionId },
        });
        if (error) throw error;
        if (cancelled) return;
        if (data?.paid) {
          setSlug(data.slug ?? null);
          setState('success');
          trackGa4Purchase(sessionId, Number(data.amount ?? 0), data.currency ?? 'EUR', data.memorial_id);
          // Meta Pixel Purchase — only after the backend confirmed the Stripe payment.
          if (!sessionStorage.getItem(`fb_purchase_${sessionId}`)) {
            sessionStorage.setItem(`fb_purchase_${sessionId}`, '1');
            trackEvent('Purchase', {
              value: Number(data.amount ?? 0),
              currency: data.currency ?? 'EUR',
              content_name: 'Digitalni memorijal',
              content_type: 'product',
              content_ids: data.memorial_id ? [data.memorial_id] : undefined,
            }, purchaseEventId(sessionId));
            // Mirror the confirmed Purchase to Conversions API with the same event_id (production only).
            if (['osmrtnica.com.hr', 'www.osmrtnica.com.hr'].includes(window.location.hostname)) {
              void supabase.functions.invoke('meta-capi-purchase', { body: { session_id: sessionId } }).catch(() => {});
            }
          }
          setMemorialId(data.memorial_id ?? null);
        } else {
          setState('error');
        }
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, navigate, freePromo]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Zahvaljujemo | Digitalni memorijal</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-16 flex items-center justify-center">
        <div className="max-w-lg w-full text-center bg-card border border-border rounded-xl p-8 shadow-sm">
          {state === 'loading' && (
            <>
              <Loader2 className="h-10 w-10 mx-auto mb-4 animate-spin text-primary" />
              <h1 className="text-2xl font-semibold mb-2">Provjeravamo vaše plaćanje…</h1>
              <p className="text-muted-foreground">Molimo pričekajte trenutak.</p>
            </>
          )}
          {state === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h1 className="text-3xl font-semibold mb-2">Hvala na kupnji!</h1>
              <p className="text-muted-foreground mb-6">
                {scheduledAt
                  ? `${freePromo ? 'Memorijal je aktiviran besplatno.' : 'Plaćanje je uspješno.'} Kako niste zatražili trenutačni početak usluge, memorijal će biti objavljen ${new Date(scheduledAt).toLocaleDateString('hr-HR')}. Do tada ga možete uređivati.`
                  : freePromo
                    ? 'Vaš digitalni memorijal je aktiviran besplatno uz promo kod.'
                    : 'Plaćanje je uspješno, a vaš digitalni memorijal je objavljen.'}
                {' Potvrdu narudžbe s uvjetima i informacijama o raskidu poslali smo na vaš e-mail.'}
                {!freePromo && ' Račun ćete primiti zasebno.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
                {slug && (
                  <Button asChild variant="gold">
                    <Link to={`/memorijal/${slug}`}>Pogledaj memorijal</Link>
                  </Button>
                )}
                {!guestUser && (
                  <Button asChild variant="outline">
                    <Link to="/moji-memorijali">Moji memorijali</Link>
                  </Button>
                )}
              </div>
              {guestUser && <GuestAccountClaim />}
              <div className="text-left border-t border-border pt-6">
                <h2 className="text-lg font-semibold mb-4">Što sada možete napraviti?</h2>
                <ul className="space-y-4 text-sm">
                  <li className="flex gap-3"><Share2 className="h-5 w-5 text-primary shrink-0" /><div><strong>Podijelite memorijal</strong> s obitelji i prijateljima kako bi i oni mogli dodati sjećanja.{slug && <button onClick={share} className="block text-primary underline mt-1">Podijeli poveznicu</button>}</div></li>
                  <li className="flex gap-3"><Pencil className="h-5 w-5 text-primary shrink-0" /><div><strong>Dopunite sadržaj</strong> — dodajte fotografije, životne događaje i priču u bilo kojem trenutku.{slug && <Link to={`/memorijal/${slug}/uredi`} className="block text-primary underline mt-1">Uredi memorijal</Link>}</div></li>
                  <li className="flex gap-3"><Flame className="h-5 w-5 text-primary shrink-0" /><div><strong>Zapalite prvu svijeću</strong> u spomen na voljenu osobu.{slug && <Link to={`/memorijal/${slug}`} className="block text-primary underline mt-1">Zapali svijeću</Link>}</div></li>
                  <li className="flex gap-3"><Mail className="h-5 w-5 text-primary shrink-0" /><div><strong>Trebate pomoć?</strong> Javite nam se na <a href="mailto:info@osmrtnica.com.hr" className="text-primary underline">info@osmrtnica.com.hr</a>.</div></li>
                </ul>
              </div>
            </>
          )}
          {state === 'error' && (
            <>
              <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h1 className="text-2xl font-semibold mb-2">Plaćanje nije uspjelo</h1>
              <p className="text-muted-foreground mb-6">
                Uplata nije potvrđena i novac nije naplaćen. Vaš memorijal je spremljen kao skica — vratite se i pokušajte ponovno.
                Ako ste ipak izvršili plaćanje, memorijal će biti objavljen automatski.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild variant="gold">
                  <Link to="/moji-memorijali">Pokušaj ponovno</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/digitalni-memorijal">Digitalni memorijal</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MemorijalPlacanje;
