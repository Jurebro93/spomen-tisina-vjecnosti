import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Phone, Mail, Clock, ArrowRight } from 'lucide-react';
import type { Cemetery } from '@/lib/cemeteries';

interface Props {
  cemeteries: Cemetery[];
  cityName: string;
  title?: string;
}

const CemeteriesSection = ({ cemeteries, cityName, title }: Props) => {
  if (!cemeteries.length) return null;

  return (
    <section className="mb-8 sm:mb-12">
      <h2 className="text-xl sm:text-2xl font-display font-semibold mb-4 sm:mb-6">
        {title ?? `Groblja u gradu ${cityName}`}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {cemeteries.map((cemetery) => (
          <Card
            key={`${cemetery.naziv}-${cemetery.slug ?? 'no-page'}`}
            className="h-full border border-border/70 hover:shadow-memorial transition-all duration-300 overflow-hidden"
          >
            <div className="h-1 w-full bg-memorial-gold/70" />
            <CardContent className="p-5 sm:p-6 flex flex-col h-full">
              <h3 className="font-display text-lg sm:text-xl font-semibold text-foreground mb-3 break-words">
                {cemetery.slug ? (
                  <Link
                    to={`/groblje/${cemetery.slug}`}
                    className="hover:text-memorial-gold transition-colors inline-flex items-center gap-1"
                  >
                    {cemetery.displayNaziv}
                    <ArrowRight size={16} className="flex-shrink-0" />
                  </Link>
                ) : (
                  cemetery.displayNaziv
                )}
              </h3>


              <dl className="space-y-3 text-sm text-muted-foreground">
                {cemetery.adresa && (
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="mt-0.5 flex-shrink-0 text-memorial-gold" />
                    <dd className="break-words">{cemetery.adresa}</dd>
                  </div>
                )}
                {cemetery.telefon && (
                  <div className="flex items-start gap-2">
                    <Phone size={16} className="mt-0.5 flex-shrink-0 text-memorial-gold" />
                    <dd>
                      <a href={`tel:${cemetery.telefon.replace(/\s+/g, '')}`} className="hover:text-foreground transition-colors break-words">
                        {cemetery.telefon}
                      </a>
                    </dd>
                  </div>
                )}
                {cemetery.email && (
                  <div className="flex items-start gap-2">
                    <Mail size={16} className="mt-0.5 flex-shrink-0 text-memorial-gold" />
                    <dd>
                      <a href={`mailto:${cemetery.email}`} className="hover:text-foreground transition-colors break-all">
                        {cemetery.email}
                      </a>
                    </dd>
                  </div>
                )}
                {cemetery.radnoVrijemeParts.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Clock size={16} className="mt-0.5 flex-shrink-0 text-memorial-gold" />
                    <dd className="space-y-1">
                      {cemetery.radnoVrijemeParts.map((item, i) => (
                        <div key={i} className="break-words">
                          {item.datum && <span className="text-foreground font-medium">{item.datum} </span>}
                          <span>{item.vrijeme}</span>
                        </div>
                      ))}
                    </dd>
                  </div>
                )}

              </dl>

              {cemetery.slug && (
                <div className="mt-4 pt-4 border-t border-border/60">
                  <Link
                    to={`/groblje/${cemetery.slug}`}
                    className="text-sm font-medium text-memorial-gold hover:underline"
                  >
                    Više o groblju {cemetery.naziv}

                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default CemeteriesSection;
