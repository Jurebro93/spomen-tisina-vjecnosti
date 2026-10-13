import React, { useState } from 'react';
import { Flame, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { throttle } from '@/lib/memorial';
import { useToast } from '@/hooks/use-toast';

const CandleForm = ({ memorialId, personName, onLit }: { memorialId: string; personName: string; onLit?: () => void | Promise<void> }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lit, setLit] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!throttle(`candle:${memorialId}`, 60_000)) {
      toast({ title: 'Malo pričekajte', description: 'Svijeću ste nedavno zapalili. Pokušajte za minutu.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('memorial_candles').insert({
      memorial_id: memorialId,
      visitor_name: name.trim() || null,
      message: message.trim() || null,
      status: 'approved',
      approved_at: new Date().toISOString(),
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Nije uspjelo', description: 'Svijeću nije bilo moguće zapaliti. Pokušajte ponovno.', variant: 'destructive' });
      return;
    }
    setLit(true);
    setOpen(false);
    toast({ title: 'Svijeća je zapaljena', description: 'Vaša svijeća je odmah vidljiva na memorijalu.' });
    await onLit?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="gold">
          <Flame className={`h-4 w-4 mr-2 ${lit ? 'animate-pulse' : ''}`} />
          {lit ? 'Svijeća je zapaljena' : 'Zapali svijeću'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Zapalite svijeću</DialogTitle>
          <DialogDescription>Zapalite svijeću u znak sjećanja na {personName}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="c-name">Ime (nije obvezno)</Label>
            <Input id="c-name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-msg">Kratka poruka (nije obvezno)</Label>
            <Textarea id="c-msg" rows={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <Button type="submit" variant="gold" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Flame className="h-4 w-4 mr-2" />}
            Zapali svijeću
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CandleForm;
