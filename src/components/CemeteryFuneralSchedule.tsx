import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, Clock, MapPin, HeartCrack } from 'lucide-react';

type Sprovod = {
  id: string;
  ime: string;
  prezime: string;
  datum_smrti: string | null;
  groblje: string | null;
  grad: string | null;
  datum_sprovoda: string | null;
  vrijeme_sprovoda: string | null;
  parcel: string | null;
  broj_groba: string | null;
};

interface Props {
  /** Word that must appear in the "groblje" column, e.g. "Mirogoj". */
  matchKey: string;
  cemeteryName: string;
  city?: string | null;
}

const formatDate = (value: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatTime = (value: string | null) => (value ? `${value.slice(0, 5)} h` : '—');

/** ISO date (yyyy-mm-dd) shifted by a number of days from today. */
const isoDayOffset = (days: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const CemeteryFuneralSchedule = ({ matchKey, cemeteryName, city }: Props) => {
  const [rows, setRows] = useState<Sprovod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase
      .from('sprovodi')
      .select('id, ime, prezime, datum_smrti, groblje, grad, datum_sprovoda, vrijeme_sprovoda, parcel, broj_groba')
      .ilike('groblje', `%${matchKey}%`)
      .gte('datum_sprovoda', isoDayOffset(-7))
      .lte('datum_sprovoda', isoDayOffset(7))
      .order('datum_sprovoda', { ascending: true })
      .order('vrijeme_sprovoda', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.error('Error fetching sprovodi:', error);
        setRows((data as Sprovod[]) || []);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [matchKey]);

  return (
    <section className="mb-8">
      <Card className="border border-memorial-gold/40 bg-muted/30">
        <CardContent className="p-5 sm:p-6">
          <h2 className="font-display text-lg sm:text-2xl font-semibold text-foreground mb-2 flex items-start gap-2">
            <CalendarDays size={20} className="mt-1 flex-shrink-0 text-memorial-gold" />
            <span>{cemeteryName} raspored sprovoda</span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-5">
            Raspored sprovoda i ispraćaja{city ? ` u gradu ${city}` : ''} za proteklih i sljedećih 7 dana, s datumom i vremenom, parcelom i brojem groba.
          </p>

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-memorial-gold" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Trenutno nema objavljenih sprovoda za ovo groblje u zadnjih i sljedećih 7 dana.</p>
          ) : (
            <>
              {/* Desktop / tablet table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border/70">
                      <th className="py-2 pr-4 font-medium">Ime i prezime</th>
                      <th className="py-2 pr-4 font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <HeartCrack size={14} className="text-memorial-gold" />
                          Datum smrti
                        </span>
                      </th>
                      <th className="py-2 pr-4 font-medium">Groblje</th>
                      <th className="py-2 pr-4 font-medium">Datum sprovoda</th>
                      <th className="py-2 pr-4 font-medium">Vrijeme</th>
                      <th className="py-2 pr-4 font-medium">Parcela</th>
                      <th className="py-2 font-medium">Broj groba</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b border-border/40 last:border-0">
                        <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap">
                          {r.ime} {r.prezime}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">{formatDate(r.datum_smrti)}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{r.groblje || '—'}</td>
                        <td className="py-3 pr-4 text-foreground whitespace-nowrap">{formatDate(r.datum_sprovoda)}</td>
                        <td className="py-3 pr-4 text-foreground whitespace-nowrap">{formatTime(r.vrijeme_sprovoda)}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{r.parcel || '—'}</td>
                        <td className="py-3 text-muted-foreground">{r.broj_groba || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="md:hidden space-y-3">
                {rows.map((r) => (
                  <li key={r.id} className="rounded-lg border border-border/60 bg-background p-4">
                    <p className="font-display font-semibold text-foreground mb-2 break-words">
                      {r.ime} {r.prezime}
                    </p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-memorial-gold/10 px-2 py-1 text-foreground font-medium">
                          <CalendarDays size={14} className="flex-shrink-0 text-memorial-gold" />
                          {formatDate(r.datum_sprovoda)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-memorial-gold/10 px-2 py-1 text-foreground font-medium">
                          <Clock size={14} className="flex-shrink-0 text-memorial-gold" />
                          {formatTime(r.vrijeme_sprovoda)}
                        </span>
                      </div>
                      <p className="flex items-center gap-2">
                        <HeartCrack size={14} className="flex-shrink-0 text-memorial-gold" />
                        <span>
                          Datum smrti: <span className="text-foreground">{formatDate(r.datum_smrti)}</span>
                        </span>
                      </p>
                      <p className="flex items-start gap-2">
                        <MapPin size={14} className="mt-0.5 flex-shrink-0 text-memorial-gold" />
                        <span className="break-words">
                          {[r.groblje, r.grad].filter(Boolean).join(', ') || '—'}
                        </span>
                      </p>
                      {(r.parcel || r.broj_groba) && (
                        <p>
                          {r.parcel && <>Parcela: <span className="text-foreground">{r.parcel}</span></>}
                          {r.parcel && r.broj_groba && ' · '}
                          {r.broj_groba && <>Broj groba: <span className="text-foreground">{r.broj_groba}</span></>}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
};

export default CemeteryFuneralSchedule;
