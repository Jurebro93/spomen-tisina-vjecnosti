import { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { saveDraftEmail } from '@/lib/memorialActions';
import { trackFunnel } from '@/lib/funnel';

const storageKey = (memorialId: string) => `osm_draft_email_${memorialId}`;

const readState = (memorialId: string) => {
  try { return localStorage.getItem(storageKey(memorialId)); } catch { return null; }
};

const writeState = (memorialId: string, value: 'sent' | 'dismissed') => {
  try { localStorage.setItem(storageKey(memorialId), value); } catch { /* storage blocked */ }
};

/**
 * Optional for guests: an e-mail with a link back to the draft, so it is not lost when the browser
 * closes and the hourly reminder can reach them. Hidden once sent or dismissed for this draft.
 */
const DraftEmailCard = ({ memorialId, userId }: { memorialId: string; userId: string }) => {
  const [state, setState] = useState<string | null>(() => readState(memorialId));
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (state === 'dismissed') return null;

  if (state === 'sent') {
    return (
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <Mail className="h-4 w-4 text-accent" />Poveznica na nacrt poslana je na vaš e-mail.
      </p>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) { setError('Upišite ispravnu e-mail adresu.'); return; }
    setBusy(true);
    const result = await saveDraftEmail(memorialId, cleanEmail);
    setBusy(false);
    if (result === 'ok') {
      writeState(memorialId, 'sent');
      setState('sent');
      void trackFunnel('draft_email', { userId, memorialId });
    } else if (result === 'too_soon') {
      setError('Poveznica je upravo poslana. Provjerite poštu, a novu možete zatražiti za nekoliko minuta.');
    } else if (result === 'invalid_email') {
      setError('Upišite ispravnu e-mail adresu.');
    } else {
      setError('Poveznicu nije bilo moguće poslati. Pokušajte ponovno.');
    }
  };

  return (
    <Card className="border-border bg-secondary/40">
      <CardContent className="p-5 space-y-3">
        <p className="font-medium">Pošaljite si poveznicu na nacrt</p>
        <p className="text-sm text-muted-foreground">
          Nacrt je spremljen u ovom pregledniku. Upišite e-mail i poslat ćemo vam poveznicu kojom ga možete nastaviti bilo kada, i na drugom uređaju.
        </p>
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vas@email.hr"
            aria-label="E-mail adresa" maxLength={255} autoComplete="email" />
          <Button type="submit" variant="outline" disabled={busy || !email.trim()}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Pošalji poveznicu
          </Button>
          <Button type="button" variant="ghost" onClick={() => { writeState(memorialId, 'dismissed'); setState('dismissed'); }}>
            Ne sada
          </Button>
        </form>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
};

export default DraftEmailCard;
