import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Download, Facebook, Link2, Mail, MessageCircle, MessageSquare,
  QrCode, Send, Share2, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Props {
  url: string;
  title: string;
  personName: string;
  extraSlot?: React.ReactNode;
}

const MemorialSidebar = ({ url, title, personName, extraSlot }: Props) => {
  const [qr, setQr] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    QRCode.toDataURL(url, { width: 720, margin: 3, errorCorrectionLevel: 'M' })
      .then(setQr)
      .catch(() => setQr(null));
  }, [url]);

  const inviteText = `Pozivam vas da posjetite digitalni memorijal u spomen na ${personName}: ${url}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Poveznica je kopirana' });
    } catch {
      toast({ title: 'Kopiranje nije uspjelo', description: url, variant: 'destructive' });
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, url, text: inviteText }); return; } catch { /* odustao */ }
    }
    copy();
  };

  const inviteChannels = [
    {
      label: 'WhatsApp',
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodeURIComponent(inviteText)}`,
    },
    {
      label: 'E-mail',
      icon: Mail,
      href: `mailto:?subject=${encodeURIComponent(`Digitalni memorijal — ${personName}`)}&body=${encodeURIComponent(inviteText)}`,
    },
    {
      label: 'SMS',
      icon: MessageSquare,
      href: `sms:?&body=${encodeURIComponent(inviteText)}`,
    },
    {
      label: 'Viber',
      icon: Send,
      href: `viber://forward?text=${encodeURIComponent(inviteText)}`,
    },
  ];

  const socials = [
    {
      label: 'Facebook',
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      label: 'X',
      icon: Share2,
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
    {
      label: 'LinkedIn',
      icon: Link2,
      href: `https://www.linkedin.com/feed/?shareActive=true&shareUrl=${encodeURIComponent(url)}`,
    },
  ];

  return (
    <aside className="space-y-5" aria-label="Podijelite memorijal">
      {/* POZIVNICA */}
      <div className="rounded-2xl border border-border/80 bg-background/80 backdrop-blur-sm shadow-memorial overflow-hidden">
        <div className="px-5 py-4 border-b border-border/70 bg-secondary/40 flex items-center gap-2.5">
          <span className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
            <Users className="h-4 w-4 text-accent" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-serif text-base leading-tight">Pozovi obitelj i prijatelje</h2>
            <p className="text-xs text-muted-foreground">Pošaljite im poveznicu na memorijal</p>
          </div>
        </div>
        <div className="p-4 space-y-2">
          {inviteChannels.map(({ label, icon: Icon, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-border/70 px-3 py-2.5 text-sm transition-all hover:border-accent/60 hover:bg-accent/5"
            >
              <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
              <span className="font-medium">{label}</span>
              <span className="ml-auto text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">Pošalji</span>
            </a>
          ))}

          <div className="pt-1">
            <Button type="button" size="sm" onClick={nativeShare} className="rounded-xl w-full">
              <Share2 className="h-4 w-4 mr-2" /> Podijeli poveznicu
            </Button>
          </div>
        </div>
      </div>

      {/* SOCIAL */}
      <div className="rounded-2xl border border-border/80 bg-background/80 backdrop-blur-sm shadow-memorial p-4">
        <h2 className="font-serif text-base mb-3">Podijelite na društvenim mrežama</h2>
        <div className="grid grid-cols-3 gap-2">
          {socials.map(({ label, icon: Icon, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Podijeli na ${label}`}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border/70 py-3 text-xs text-muted-foreground transition-all hover:border-accent/60 hover:bg-accent/5 hover:text-foreground"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* QR */}
      <div className="rounded-2xl border border-border/80 bg-background/80 backdrop-blur-sm shadow-memorial p-4 text-center">
        <h2 className="font-serif text-base flex items-center justify-center gap-2">
          <QrCode className="h-4 w-4 text-accent" aria-hidden="true" /> QR kod memorijala
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Skeniranjem koda otvara se ovaj memorijal.
        </p>
        {qr ? (
          <>
            <img
              src={qr}
              alt={`QR kod memorijala za ${personName}`}
              className="mx-auto mt-3 w-40 h-40 rounded-xl bg-white p-2 border border-border/70"
            />
            <Button asChild variant="outline" size="sm" className="mt-3 rounded-xl w-full">
              <a href={qr} download={`qr-memorijal-${personName.toLowerCase().replace(/\s+/g, '-')}.png`}>
                <Download className="h-4 w-4 mr-2" /> Preuzmi QR kod
              </a>
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground mt-3">QR kod trenutno nije dostupan.</p>
        )}
      </div>

      {extraSlot}
    </aside>
  );
};

export default MemorialSidebar;
