import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { readConsent, saveConsent } from '@/lib/consent';
import { OPEN_COOKIE_SETTINGS } from '@/lib/legal';

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
    setAnalytics(a); setMarketing(m);
    setVisible(false); setSettingsOpen(false);
  };

  return (
    <>
      {visible && (
        <div role="region" aria-label="Kolačići" className={inline ? 'relative z-40 border-b border-border bg-background p-3' : 'fixed bottom-0 left-0 right-0 z-50 p-3'}>
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
