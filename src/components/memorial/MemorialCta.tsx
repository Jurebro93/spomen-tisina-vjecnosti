import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flower2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fetchMemorialForDeceased, type MemorialStub } from '@/lib/memorial';
import { trackObituaryEvent, type ObituaryContext } from '@/lib/obituaryTracking';
import { displayName } from '@/lib/hr';

interface Props {
  deceasedId: string;
  personName: string;
  obituary?: ObituaryContext;
}

const MemorialCta = ({ deceasedId, personName, obituary }: Props) => {
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

  return (
    <Card className="mb-6 sm:mb-8 border-accent/40 bg-secondary/40">
      <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-memorial-gold-foreground bg-memorial-gold rounded-full px-3 py-1 mb-3">
            <Sparkles className="h-3.5 w-3.5" /> Digitalni memorijal
          </div>
          <h2 className="font-serif text-xl sm:text-2xl mb-2">
            {published ? `Memorijalna stranica: ${displayName(personName)}` : `Trajno mjesto sjećanja: ${displayName(personName)}`}
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
          ) : memorial ? (
            <Button asChild variant="outline">
              <Link to={`/memorijal/${memorial.slug}?zatrazi=1`} onClick={() => track('request_access')}>
                <Flower2 className="h-4 w-4 mr-2" /> Zatraži pristup memorijalu
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild>
                <Link to={`/kreiraj-memorijal?deceased_id=${deceasedId}`} onClick={() => track('create')}>
                  <Flower2 className="h-4 w-4 mr-2" /> Kreiraj memorijal
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/digitalni-memorijal" onClick={() => track('learn_more')}>Saznajte više</Link>
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MemorialCta;
