import { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { saveDraftEmail } from '@/lib/memorialActions';
import { trackFunnel } from '@/lib/funnel';

type DraftEmailState = 'sent' | 'dismissed';

const storageKey = (memorialId: string) => `osm_draft_email_${memorialId}`;
const addressKey = (memorialId: string) => `osm_draft_email_addr_${memorialId}`;

const readDraftEmailState = (memorialId: string) => {
  try { return localStorage.getItem(storageKey(memorialId)) as DraftEmailState | null; } catch { return null; }
};

export const writeDraftEmailState = (memorialId: string, value: DraftEmailState) => {
  try { localStorage.setItem(storageKey(memorialId), value); } catch { /* storage blocked */ }
};

/** The e-mail a guest left for this draft, offered again when they create the account before paying. */
export const readDraftEmailAddress = (memorialId: string) => {
  try { return localStorage.getItem(addressKey(memorialId)) ?? ''; } catch { return ''; }
};

const writeDraftEmailAddress = (memorialId: string, email: string) => {
  try { localStorage.setItem(addressKey(memorialId), email); } catch { /* storage blocked */ }
};

const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/** Sends the draft link; returns an error message for the visitor, or '' when the e-mail is saved. */
const submitDraftEmail = async (memorialId: string, userId: string, rawEmail: string) => {
  const email = rawEmail.trim();
  if (!validEmail(email)) return 'Upišite ispravnu e-mail adresu.';
  const result = await saveDraftEmail(memorialId, email);
  if (result === 'ok') {
    writeDraftEmailState(memorialId, 'sent');
    writeDraftEmailAddress(memorialId, email);
    void trackFunnel('draft_email', { userId, memorialId });
    return '';
  }
  if (result === 'too_soon') return 'Poveznica je upravo poslana. Provjerite poštu, a novu možete zatražiti za nekoliko minuta.';
  if (result === 'invalid_email') return 'Upišite ispravnu e-mail adresu.';
  return 'Poveznicu nije bilo moguće poslati. Pokušajte ponovno.';
};

/**
 * Optional for guests on the story step: a link back to the draft by e-mail, so it survives a closed
 * browser and the reminders can reach them. Hidden once sent or dismissed for this draft.
 */
const DraftEmailCard = ({ memorialId, userId }: { memorialId: string; userId: string }) => {
  const [state, setState] = useState<DraftEmailState | null>(() => readDraftEmailState(memorialId));
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
    setBusy(true);
    const message = await submitDraftEmail(memorialId, userId, email);
    setBusy(false);
    if (message) setError(message);
    else setState('sent');
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
          <Button type="button" variant="ghost" onClick={() => { writeDraftEmailState(memorialId, 'dismissed'); setState('dismissed'); }}>
            Ne sada
          </Button>
        </form>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
};

export default DraftEmailCard;
