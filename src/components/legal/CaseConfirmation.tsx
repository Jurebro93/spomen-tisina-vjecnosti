import { CheckCircle2 } from 'lucide-react';
import { CaseResult, formatReceived } from '@/lib/legalCases';

const CaseConfirmation = ({ result, title, email }: { result: CaseResult; title: string; email?: string }) => (
  <div role="status" className="rounded-lg border border-primary/30 bg-primary/5 p-6 space-y-2">
    <div className="flex items-center gap-2 font-semibold text-foreground"><CheckCircle2 className="w-5 h-5 text-primary" />{title}</div>
    <p>Broj predmeta: <strong>{result.case_number}</strong></p>
    <p>Zaprimljeno: {formatReceived(result.received_at)}</p>
    {email && (result.mailed
      ? <p>Potvrdu sa sadržajem podneska poslali smo na {email}.</p>
      : <p>Podnesak je spremljen, ali e-mail potvrdu trenutačno nije bilo moguće poslati. Sačuvajte broj predmeta ili nam pišite na info@osmrtnica.com.hr.</p>)}
  </div>
);
export default CaseConfirmation;
