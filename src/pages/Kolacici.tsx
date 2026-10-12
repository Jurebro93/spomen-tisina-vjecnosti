import LegalLayout, { H2 } from '@/components/legal/LegalLayout';
import { Button } from '@/components/ui/button';
import { LEGAL_VERSIONS, openCookieSettings } from '@/lib/legal';

const ROWS = [
  ['Nužni', 'sb-…-auth-token (localStorage)', 'Supabase', 'Održavanje prijave u korisnički račun', 'do odjave ili isteka sesije'],
  ['Nužni', 'cookieConsent, cookieConsentCategories (localStorage)', 'osmrtnica.com.hr', 'Pamćenje vašeg izbora o kolačićima', '12 mjeseci, zatim ponovno pitamo'],
  ['Nužni', 'privremeni podaci obrasca i plaćanja (sessionStorage)', 'osmrtnica.com.hr', 'Nastavak izrade memorijala i povratak s plaćanja', 'do zatvaranja preglednika'],
  ['Nužni', 'kolačići stranice za plaćanje', 'Stripe', 'Sigurna naplata i sprječavanje prijevara (samo na Stripeovoj stranici)', 'prema pravilima Stripea'],
  ['Analitika', 'GTM i alati koje učitava (npr. _ga)', 'Google', 'Razumijevanje korištenja stranice', 'do 2 godine'],
  ['Analitika', 'funnel_visitor, attribution (localStorage)', 'osmrtnica.com.hr', 'Anonimno praćenje koraka izrade memorijala i izvora posjeta', 'do brisanja u pregledniku'],
  ['Marketing', '_fbp, _fbc', 'Meta', 'Mjerenje oglasa (Meta Pixel i Conversions API)', 'do 90 dana'],
];

const Kolacici = () => (
  <LegalLayout title="Kolačići i postavke privatnosti" path="/kolacici" version={LEGAL_VERSIONS.kolacici}>
    <p>Stranica koristi kolačiće i slične tehnologije za rad usluge te, ovisno o vašem izboru, analitiku i marketing.</p>
    <p>Nužne tehnologije omogućuju osnovne funkcije, poput sigurne prijave i spremanja vaših postavki. Za tehnologije koje nisu nužne tražimo vaš izbor prije njihove aktivacije.</p>
    <p>Analitičke tehnologije služe razumijevanju korištenja stranice. Marketinške tehnologije služe mjerenju i drugim oglašivačkim svrhama opisanima uz pojedinog pružatelja.</p>
    <p>Možete prihvatiti ili odbiti nenužne tehnologije. Odbijanje ne onemogućuje osnovno korištenje usluge, uključujući kupnju memorijala.</p>
    <p>Postavke možete promijeniti putem poveznice „Postavke kolačića”, dostupne u podnožju stranice, ili ovdje:</p>
    <Button onClick={openCookieSettings}>Postavke kolačića</Button>
    <H2>Popis tehnologija</H2>
    <div className="overflow-x-auto">
      <table className="w-full text-sm border border-border">
        <thead className="bg-muted"><tr>{['Kategorija', 'Naziv', 'Pružatelj', 'Svrha', 'Trajanje'].map((h) => <th key={h} className="text-left p-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{ROWS.map((r, i) => <tr key={i} className="border-t border-border">{r.map((c, j) => <td key={j} className="p-3 align-top">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <p>Kada povučete privolu, prestajemo s budućim analitičkim i marketinškim praćenjem, uključujući slanje događaja Meti s našeg poslužitelja.</p>
  </LegalLayout>
);
export default Kolacici;
