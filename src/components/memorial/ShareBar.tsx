import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Download, Facebook, Mail, MessageCircle, QrCode, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const ShareBar = ({ url, title, compact }: { url: string; title: string; compact?: boolean }) => {
  const [qr, setQr] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    QRCode.toDataURL(url, { width: 640, margin: 4, errorCorrectionLevel: 'M' })
      .then(setQr)
      .catch(() => setQr(null));
  }, [url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Poveznica je kopirana' });
    } catch {
      toast({ title: 'Kopiranje nije uspjelo', description: url, variant: 'destructive' });
    }
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; } catch { /* korisnik je odustao */ }
    }
    copy();
  };

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? '' : 'justify-center'}`}>
      <Button type="button" variant="outline" size="sm" onClick={share}>
        <Share2 className="h-4 w-4 mr-2" /> Podijeli
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        <Copy className="h-4 w-4 mr-2" /> Kopiraj poveznicu
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">
          <Facebook className="h-4 w-4 mr-2" /> Facebook
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`}>
          <Mail className="h-4 w-4 mr-2" /> E-mail
        </a>
      </Button>

      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <QrCode className="h-4 w-4 mr-2" /> QR kod
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">QR kod memorijala</DialogTitle>
            <DialogDescription>Skeniranjem koda otvara se ovaj memorijal.</DialogDescription>
          </DialogHeader>
          {qr ? (
            <div className="space-y-4 text-center">
              <img src={qr} alt="QR kod memorijala" className="mx-auto w-56 h-56 bg-white rounded-md" />
              <Button asChild>
                <a href={qr} download={`qr-memorijal.png`}>
                  <Download className="h-4 w-4 mr-2" /> Preuzmi QR (PNG)
                </a>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">QR kod trenutno nije dostupan.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShareBar;
