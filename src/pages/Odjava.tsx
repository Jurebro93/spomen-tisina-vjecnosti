import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

// Unsubscribe from e-mails. The link in the e-mail only opens this page; the click on the button
// unsubscribes, so mail scanners that open links never unsubscribe anyone.
const Odjava = () => {
  const [params] = useSearchParams();
  const rid = params.get('r') ?? '';
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  const confirm = async () => {
    setState('busy');
    const { data, error } = await supabase.functions.invoke('guide-email-sequence', { body: { mode: 'unsubscribe', r: rid } });
    setState(!error && data?.ok ? 'done' : 'error');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Odjava s e-mailova | Osmrtnica.com.hr</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-xl">
        <h1 className="text-2xl font-serif mb-4">{state === 'done' ? 'Odjavljeni ste' : 'Odjava s e-mailova'}</h1>
        {state === 'done' ? (
          <p className="text-muted-foreground">Više vam nećemo slati e-mailove. Ako je to bila greška, pišite nam na info@osmrtnica.com.hr.</p>
        ) : !rid ? (
          <p className="text-muted-foreground">Poveznica nije potpuna. Za odjavu nam pišite na info@osmrtnica.com.hr.</p>
        ) : (
          <>
            <p className="text-muted-foreground mb-6">Potvrdite da više ne želite primati e-mailove s osmrtnica.com.hr.</p>
            <Button onClick={confirm} disabled={state === 'busy'}>Potvrdi odjavu</Button>
            {state === 'error' && <p className="text-destructive mt-4">Odjava nije uspjela. Pišite nam na info@osmrtnica.com.hr i odjavit ćemo vas ručno.</p>}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Odjava;
