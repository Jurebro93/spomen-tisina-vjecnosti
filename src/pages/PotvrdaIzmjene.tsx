import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

// "Potvrdi izmjenu" from a reply to an e-mail sent to info@. The link in the e-mail only opens this page; the
// click on the button makes the change, so mail scanners that open links never change anything.
type Change = { field: string; before: string; after: string };
type View = { ok: boolean; done?: boolean; code?: string; summary?: string; changes?: Change[] };

const LABELS: Record<string, string> = {
  ime: 'Ime', prezime: 'Prezime', datum_rodenja: 'Datum rođenja', datum_smrti: 'Datum smrti', datum_ukopa: 'Datum ukopa',
  vrijeme_ukopa: 'Vrijeme ukopa', mjesto_rodenja: 'Mjesto rođenja', mjesto_smrti: 'Mjesto smrti', groblje: 'Groblje',
  mjesna_zajednica: 'Mjesna zajednica', profesija: 'Zanimanje', podnaslov: 'Podnaslov', biografija: 'Biografija',
  ozalosceni: 'Ožalošćeni', kontakt_osoba_ime: 'Kontakt osoba', kontakt_osoba_telefon: 'Telefon kontakt osobe',
  life_story: 'Životna priča', quote: 'Citat', relationship: 'Odnos', allow_candles: 'Dopuštene svijeće',
  allow_tributes: 'Dopuštena sjećanja', tributes_require_approval: 'Sjećanja čekaju odobrenje', visibility: 'Vidljivost',
  zapalio_ime: 'Vaše ime', pokojnik_ime: 'Ime pokojnika', pokojnik_prezime: 'Prezime pokojnika', poruka: 'Poruka',
  visitor_name: 'Vaše ime', message: 'Poruka', author_name: 'Vaše ime', title: 'Naslov',
};

const PotvrdaIzmjene = () => {
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';
  const [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    supabase.functions.invoke('email-assistant-confirm', { body: { token, action: 'preview' } })
      .then(({ data }) => setView((data as View) ?? { ok: false, code: 'error' }));
  }, [token]);

  const confirm = async () => {
    setBusy(true);
    const { data } = await supabase.functions.invoke('email-assistant-confirm', { body: { token, action: 'confirm' } });
    setView((data as View) ?? { ok: false, code: 'error' });
    setBusy(false);
  };

  const failed = !token || (view && !view.ok);
  const message = !token || view?.code === 'not_found' || view?.code === 'invalid'
    ? 'Poveznica nije potpuna ili ne vrijedi. Pišite nam na info@osmrtnica.com.hr.'
    : view?.code === 'expired'
    ? 'Poveznica je istekla (vrijedi 72 sata). Pišite nam ponovno na info@osmrtnica.com.hr.'
    : 'Izmjena trenutno nije uspjela. Pišite nam na info@osmrtnica.com.hr i napravit ćemo je ručno.';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Potvrda izmjene | Osmrtnica.com.hr</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-xl">
        <h1 className="text-2xl font-serif mb-4">{view?.done ? 'Izmjena je spremljena' : 'Potvrda izmjene'}</h1>
        {failed ? (
          <p className="text-muted-foreground">{message}</p>
        ) : !view ? (
          <p className="text-muted-foreground">Učitavanje…</p>
        ) : (
          <>
            {view.summary && <p className="text-muted-foreground mb-4">{view.summary}</p>}
            <div className="space-y-3 mb-6">
              {(view.changes ?? []).map((c) => (
                <div key={c.field} className="rounded border border-border p-3">
                  <p className="text-sm text-muted-foreground mb-1">{LABELS[c.field] ?? c.field}</p>
                  <p className="text-sm line-through text-muted-foreground break-words">{c.before}</p>
                  <p className="break-words">{c.after}</p>
                </div>
              ))}
            </div>
            {view.done ? (
              <p className="text-muted-foreground">Hvala, promjena je vidljiva na stranici.</p>
            ) : (
              <Button onClick={confirm} disabled={busy}>Potvrdi izmjenu</Button>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PotvrdaIzmjene;
