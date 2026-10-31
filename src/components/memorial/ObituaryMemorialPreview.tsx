import { BookOpen, Check, Flame, Images, MessageSquareHeart } from 'lucide-react';
import { fullName, type Deceased } from '@/lib/memorial';
import { formatObituaryDate, isFutureDate } from '@/lib/utils';

const defaultObituaryPhoto = '/site/default-obituary-photo.jpg';

// What the family adds themselves; nothing here is invented for them.
const TO_ADD = [
  { icon: BookOpen, text: 'životna priča, nekoliko rečenica je dovoljno' },
  { icon: Images, text: 'fotografije iz albuma' },
  { icon: MessageSquareHeart, text: 'poruke i sjećanja rodbine i prijatelja' },
  { icon: Flame, text: 'svijeće koje pale svi koji je posjete' },
];

const plain = (value?: string | null) => (value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * The top of the memorial as it will look, filled from the obituary (photo, name, dates, place),
 * shown before anything is asked: the visitor sees the result first.
 */
const ObituaryMemorialPreview = ({ deceased }: { deceased: Deceased }) => {
  // Same reading as the obituary page: 1 January stands for "year only" in imported obituaries.
  const death = isFutureDate(deceased.datum_smrti) ? null : formatObituaryDate(deceased.datum_smrti);
  const dates = [formatObituaryDate(deceased.datum_rodenja), death].filter(Boolean).join(' – ');
  const place = plain(deceased.mjesto_smrti) || plain(deceased.mjesto_rodenja);
  return (
    <div className="rounded-lg border border-border overflow-hidden shadow-sm">
      <div className="flex items-center gap-1.5 bg-secondary px-3 py-2 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-border" /><span className="h-2 w-2 rounded-full bg-border" /><span className="h-2 w-2 rounded-full bg-border" />
        <span className="ml-2 truncate">osmrtnica.com.hr/memorijal/…</span>
      </div>
      <div className="bg-background px-5 py-6 sm:px-8 sm:py-8 grid grid-cols-[96px_1fr] sm:grid-cols-[140px_1fr] gap-5 sm:gap-8 items-center">
        <img src={deceased.fotografija_url || defaultObituaryPhoto} alt={`Portret: ${fullName(deceased)}`}
          className="w-full aspect-[3/4] object-cover rounded-md shadow-sm" />
        <div className="min-w-0">
          <p className="font-serif text-2xl sm:text-3xl tracking-wide uppercase break-words">{fullName(deceased)}</p>
          {deceased.podnaslov && <p className="mt-1 text-sm text-muted-foreground">{plain(deceased.podnaslov)}</p>}
          {dates && <p className="mt-3 text-sm sm:text-base text-muted-foreground">{dates}</p>}
          {place && <p className="mt-1 text-sm text-muted-foreground">{place}</p>}
        </div>
      </div>
      <div className="bg-[hsl(var(--memorial-warm))] border-t border-border px-5 py-4 sm:px-8 space-y-2 text-sm">
        <p className="flex items-center gap-2 font-medium"><Check className="h-4 w-4 text-accent shrink-0" />Ime, datumi i fotografija već su preuzeti s osmrtnice</p>
        <p className="text-muted-foreground">Vi dodajete, sada ili kasnije:</p>
        <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
          {TO_ADD.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-2 text-muted-foreground"><Icon className="h-4 w-4 mt-0.5 shrink-0 text-accent" />{text}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ObituaryMemorialPreview;
