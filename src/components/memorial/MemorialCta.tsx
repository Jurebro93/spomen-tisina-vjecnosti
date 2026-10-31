import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flower2, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fetchMemorialForDeceased, type MemorialStub } from '@/lib/memorial';
import { trackObituaryEvent, type ObituaryContext } from '@/lib/obituaryTracking';
import { displayName } from '@/lib/hr';
import MemorialPrice from '@/components/promo/MemorialPrice';

export const MEMORIAL_CTA_ID = 'memorijal-poziv';

interface Props {
  deceasedId: string;
  personName: string;
  photoUrl?: string | null;
  obituary?: ObituaryContext;
}

/** Message friends can send to the family: a ready link to start this person's memorial. */
const shareFamily = async (deceasedId: string, name: string) => {
  const url = `https://osmrtnica.com.hr/kreiraj-memorijal?deceased_id=${encodeURIComponent(deceasedId)}&utm_source=preporuka&utm_medium=osmrtnica`;
  const text = `${name}: obitelj može izraditi digitalni memorijal s fotografijama, životnom pričom i porukama bližnjih.`;
  if (typeof navigator !== 'undefined' && navigator.share) {
    try { await navigator.share({ text, url }); return; } catch { /* closed or unsupported: fall back to WhatsApp */ }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank', 'noopener');
};

const MemorialCta = ({ deceasedId, personName, photoUrl, obituary }: Props) => {
  const track = (memorial_action: string) =>
    trackObituaryEvent('obituary_memorial_click', obituary, { placement: 'memorial_cta', memorial_action });

  const [memorial, setMemorial] = useState<MemorialStub | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchMemorialForDeceased(deceasedId)
      .then((m) => { if (active) { setMemorial(m); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [deceasedId]);

  if (loading) return null;

  const published = memorial && memorial.status === 'published' && memorial.visibility !== 'private';

  const name = displayName(personName);

  if (!published && !memorial) {
    return (
      <Card id={MEMORIAL_CTA_ID} className="mb-6 sm:mb-8 overflow-hidden border-memorial-gold/60 bg-secondary/40">
        <CardContent className="p-5 sm:p-8">
          <div className="flex gap-4 sm:gap-6">
            {photoUrl && (
              <img src={photoUrl} alt={name} loading="lazy" className="h-24 w-20 shrink-0 rounded-md border border-memorial-gold/40 object-cover grayscale sm:h-32 sm:w-24" />
            )}
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-memorial-gold-foreground bg-memorial-gold rounded-full px-3 py-1 mb-2">
                <Sparkles className="h-3.5 w-3.5" /> Digitalni memorijal
              </div>
              <h2 className="font-serif text-xl sm:text-2xl leading-snug mb-1">Sačuvajte sjećanje zauvijek: {name}</h2>
              <p className="text-sm text-muted-foreground">
                Osmrtnica traje nekoliko dana. Memorijal ostaje: fotografije, životna priča, uspomene obitelji i svijeće na jednom mjestu.
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Ime, datumi i fotografija s osmrtnice već su upisani. Plaćate tek kad vidite gotov memorijal:{' '}
            <span className="font-semibold text-foreground">jednokratno <MemorialPrice /></span>
          </p>
          <div className="mt-4 flex flex-col sm:flex-row sm:flex-wrap gap-3">
            <Button asChild variant="gold" size="lg" className="whitespace-normal h-auto min-h-11 py-2.5 text-left">
              <Link to={`/kreiraj-memorijal?deceased_id=${deceasedId}`} onClick={() => track('create')}>
                <Flower2 className="h-4 w-4 mr-2 shrink-0" /> Napravite spomen-stranicu za {name}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/digitalni-memorijal" onClick={() => track('learn_more')}>Pogledaj kako izgleda</Link>
            </Button>
          </div>
          <div className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
            Niste iz obitelji?{' '}
            <button
              type="button"
              onClick={() => { track('share_family'); void shareFamily(deceasedId, name); }}
              className="inline-flex items-center gap-1 font-semibold text-foreground underline underline-offset-4"
            >
              <Send className="h-3.5 w-3.5" /> Pošaljite obitelji prijedlog
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 sm:mb-8 border-accent/40 bg-secondary/40">
      <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-memorial-gold-foreground bg-memorial-gold rounded-full px-3 py-1 mb-3">
            <Sparkles className="h-3.5 w-3.5" /> Digitalni memorijal
          </div>
          <h2 className="font-serif text-xl sm:text-2xl mb-2">
            {published ? `Memorijalna stranica: ${name}` : `Trajno mjesto sjećanja: ${name}`}
          </h2>
          <p className="text-sm text-muted-foreground">
            {published
              ? 'Pogledajte fotografije, životnu priču i uspomene koje je podijelila obitelj te ostavite svoju poruku.'
              : 'Fotografije, životna priča, uspomene obitelji i virtualne svijeće — na jednom mjestu, zauvijek dostupno.'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 md:shrink-0">
          {published ? (
            <Button asChild>
              <Link to={`/memorijal/${memorial!.slug}`} onClick={() => track('view')}>
                Pogledaj memorijal <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link to={`/memorijal/${memorial!.slug}?zatrazi=1`} onClick={() => track('request_access')}>
                <Flower2 className="h-4 w-4 mr-2" /> Zatraži pristup memorijalu
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MemorialCta;
