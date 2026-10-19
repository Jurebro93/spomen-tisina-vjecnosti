import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { readConsent, saveConsent } from '@/lib/consent';
import { OPEN_COOKIE_SETTINGS } from '@/lib/legal';
import { trackFunnel } from '@/lib/funnel';

const CookieConsent = () => {
  const { pathname } = useLocation();
  const inline = ['/homepage-2', '/homepage-2/', '/homepage-3', '/homepage-3/'].includes(pathname);
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const c = readConsent();
    if (!c) { const t = setTimeout(() => setVisible(true), 800); return () => clearTimeout(t); }
    setAnalytics(c.analytics); setMarketing(c.marketing);
  }, []);

  useEffect(() => {
    const open = () => {
      const c = readConsent();
      setAnalytics(c?.analytics ?? false); setMarketing(c?.marketing ?? false);
      setSettingsOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS, open);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS, open);
  }, []);

  const decide = (a: boolean, m: boolean) => {
    saveConsent({ analytics: a, marketing: m });
    // Anonymous count of decisions (no visitor id without consent), to measure the acceptance rate.
    void trackFunnel(a && m ? 'consent_accepted' : !a && !m ? 'consent_rejected' : 'consent_custom', { once: false });
    setAnalytics(a); setMarketing(m);
    setVisible(false); setSettingsOpen(false);
  };

  return (
    <>
      {visible && inline && (
        <div role="region" aria-label="Kolačići" className="relative z-40 border-b border-border bg-background p-3">
          <div className="container mx-auto max-w-3xl rounded-lg border border-border bg-background shadow-lg p-4">
            <div className="flex gap-3">
              <Cookie className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 space-y-3">
                <p className="text-sm text-foreground">
                  Nužne kolačiće koristimo za rad stranice. Analitičke i marketinške uključujemo samo uz vaš izbor.{' '}
                  <Link to="/kolacici" className="text-primary underline">Saznajte više</Link>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => decide(true, true)}>Prihvati sve</Button>
                  <Button size="sm" onClick={() => decide(false, false)}>Odbij nenužne</Button>
                  <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>Postavke</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {visible && !inline && !settingsOpen && (
        // Full-screen prompt: the page stays readable behind it, and accepting or refusing is one equal tap.
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-title"
            className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl"
          >
            <Cookie className="w-8 h-8 text-primary mb-3" aria-hidden="true" />
            <p id="cookie-title" className="font-serif text-xl font-semibold text-foreground mb-2">Kolačići</p>
            <p className="text-base text-foreground mb-2">
              Nužne kolačiće koristimo za rad stranice. Uz vaše dopuštenje koristimo i kolačiće za analitiku i mjerenje oglasa, kako bismo znali što ljudima pomaže.
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              Odluku možete promijeniti bilo kada u podnožju stranice.{' '}
              <Link to="/kolacici" className="text-primary underline">Saznajte više</Link>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button size="lg" className="w-full" onClick={() => decide(false, false)}>Odbij</Button>
              <Button size="lg" className="w-full" onClick={() => decide(true, true)}>Prihvaćam</Button>
            </div>
            <button
              type="button"
              className="mt-4 w-full text-sm text-muted-foreground underline"
              onClick={() => setSettingsOpen(true)}
            >
              Postavke
            </button>
          </div>
        </div>
      )}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Postavke kolačića</DialogTitle>
            <DialogDescription>Odaberite koje nenužne tehnologije dopuštate. Izbor možete promijeniti u bilo kojem trenutku putem poveznice u podnožju stranice.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {[
              { id: 'c-nec', label: 'Nužni', text: 'Prijava, sigurnost, plaćanje i pamćenje vašeg izbora. Uvijek uključeni.', checked: true, disabled: true, set: () => {} },
              { id: 'c-an', label: 'Analitika', text: 'Razumijevanje korištenja stranice (Google Tag Manager, praćenje koraka izrade memorijala).', checked: analytics, disabled: false, set: setAnalytics },
              { id: 'c-mk', label: 'Marketing', text: 'Mjerenje oglasa (Meta Pixel i Meta Conversions API).', checked: marketing, disabled: false, set: setMarketing },
            ].map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-4">
                <label htmlFor={r.id} className="text-sm"><span className="font-semibold block">{r.label}</span><span className="text-muted-foreground">{r.text}</span></label>
                <Switch id={r.id} checked={r.checked} disabled={r.disabled} onCheckedChange={r.set} />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={() => decide(analytics, marketing)}>Spremi izbor</Button>
            <Button variant="outline" onClick={() => decide(true, true)}>Prihvati sve</Button>
            <Button variant="outline" onClick={() => decide(false, false)}>Odbij nenužne</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CookieConsent;
