import { Check, ExternalLink, Lock } from 'lucide-react';
import { MEMORIAL_PRICE_LABEL } from '@/lib/memorial';

const EXAMPLE_PATH = '/memorijal-primjer/obiteljske-uspomene';

const included = [
  'Trajna stranica posvećena voljenoj osobi, bez roka isteka',
  'Životna priča, važni trenuci i fotografije iz obiteljskih albuma',
  'Poruke sjećanja i virtualne svijeće obitelji i prijatelja',
  'Dijeljenje poveznicom i QR kod koji vodi izravno na memorijal',
  'Odabir vidljivosti: javno, samo putem poveznice ili privatno',
  'Naknadno uređivanje i dodavanje fotografija kad god želite',
];

/** What the family gets for the one-off price, shown right before payment. */
const MemorialValueSummary = ({ compact = false }: { compact?: boolean }) => (
  <div className="rounded-md border border-border p-4 space-y-3 text-sm">
    <p className="font-semibold">Što dobivate za {MEMORIAL_PRICE_LABEL}, jednokratno</p>
    <ul className="space-y-1.5">
      {(compact ? included.slice(0, 4) : included).map((item) => (
        <li key={item} className="flex items-start gap-2">
          <Check className="h-4 w-4 mt-0.5 shrink-0 text-accent" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
    <a
      href={EXAMPLE_PATH}
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-1.5 text-primary underline"
    >
      Pogledajte primjer gotovog memorijala
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
    <p className="flex items-start gap-2 text-muted-foreground">
      <Lock className="h-4 w-4 mt-0.5 shrink-0" />
      <span>Plaćanje karticom putem Stripea, bez pretplate. Račun stiže na vašu e-poštu odmah nakon uplate.</span>
    </p>
  </div>
);

export default MemorialValueSummary;
