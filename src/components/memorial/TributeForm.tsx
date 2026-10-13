import React, { useRef, useState } from 'react';
import { Loader2, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { RELATIONSHIPS, throttle, uploadMemorialImage, validateImage } from '@/lib/memorial';
import { useToast } from '@/hooks/use-toast';

const TributeForm = ({ memorialId, personName, autoApprove = false, onPosted }: { memorialId: string; personName: string; autoApprove?: boolean; onPosted?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [published, setPublished] = useState(false);
  const [selectedPhotoName, setSelectedPhotoName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!consent) {
      toast({ title: 'Potrebna je privola', description: 'Označite privolu za javnu objavu vašeg sjećanja.', variant: 'destructive' });
      return;
    }
    if (!throttle(`tribute:${memorialId}`, 60_000)) {
      toast({ title: 'Malo pričekajte', description: 'Sjećanje ste nedavno poslali. Pokušajte za minutu.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      let photoPath: string | null = null;
      const file = fileRef.current?.files?.[0];
      if (file) {
        const invalid = validateImage(file);
        if (invalid) throw new Error(invalid);
        photoPath = await uploadMemorialImage(memorialId, file, 'tributes');
      }
      const { data, error } = await supabase.functions.invoke('submit-memorial-tribute', { body: {
        memorial_id: memorialId,
        author_name: name.trim(),
        author_email: email.trim(),
        relationship: relationship || null,
        title: title.trim() || null,
        message: message.trim(),
        photo_path: photoPath,
        consent: true,
      } });
      if (error) throw error;
      if (!data?.success) throw new Error('Sjećanje nije spremljeno.');
      setPublished(data.status === 'approved');
      setDone(true);
      setOpen(false);
      toast({ title: 'Hvala vam', description: data.status === 'approved' ? 'Vaše sjećanje je objavljeno.' : 'Vaše sjećanje spremljeno je i čeka odobrenje obitelji.' });
      onPosted?.();
    } catch (error) {
      toast({
        title: 'Nije poslano',
        description: (error as Error)?.message?.startsWith('Dopuštene')
          ? (error as Error).message
          : 'Sjećanje nije bilo moguće poslati. Pokušajte ponovno.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Card className="border-accent/40 bg-background">
        <CardContent className="p-5 text-sm">
          {published ? 'Hvala vam. Vaše sjećanje je objavljeno na memorijalu.' : 'Hvala vam. Vaše sjećanje je spremljeno i bit će objavljeno nakon odobrenja obitelji.'}
        </CardContent>
      </Card>
    );
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <MessageSquarePlus className="h-4 w-4 mr-2" /> Podijelite uspomenu
      </Button>
    );
  }

  return (
    <Card className="border-border bg-background">
      <CardContent className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="t-name">Ime i prezime *</Label>
              <Input id="t-name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-email">E-mail *</Label>
              <Input id="t-email" type="email" required maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} />
              <p className="text-xs text-muted-foreground">Vaš e-mail nikada se ne prikazuje javno.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-rel">Odnos s pokojnikom</Label>
            <select id="t-rel" value={relationship} onChange={(e) => setRelationship(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Odaberite…</option>
              {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-title">Naslov uspomene</Label>
            <Input id="t-title" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-msg">Poruka *</Label>
            <Textarea id="t-msg" required rows={5} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder={`Podijelite uspomenu na ${personName}…`} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-photo">Fotografija (nije obvezno)</Label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-border bg-background px-4 py-6 text-center transition-colors hover:border-accent hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="mx-auto mb-2 block w-fit rounded-md border border-border bg-muted px-3 py-1.5 text-sm font-medium text-foreground shadow-sm">
                Odaberite fotografiju
              </span>
            <span className="block text-xs text-muted-foreground">
                {selectedPhotoName || 'JPEG, PNG ili WebP do 5 MB'}
              </span>
            </button>
            <Input
              id="t-photo"
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => setSelectedPhotoName(e.target.files?.[0]?.name || '')}
            />
          </div>
          <div className="flex items-start gap-3">
            <Checkbox id="t-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
            <Label htmlFor="t-consent" className="text-sm font-normal leading-relaxed">
              Pristajem da se moje ime i poslani sadržaj javno prikažu na ovom memorijalu.
            </Label>
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Pošalji uspomenu
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Odustani</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default TributeForm;
