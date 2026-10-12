import LegalLayout, { H2, L } from '@/components/legal/LegalLayout';
import { LEGAL_VERSIONS } from '@/lib/legal';
import { fullAddress, useBusiness } from '@/lib/business';

const PROCESSING = [
  ['Korisnički račun i prijava', 'ime, prezime, e-mail, lozinka (pohranjena kriptirano), podaci od Google prijave', 'izvršavanje ugovora', 'Supabase (baza i prijava), Google (ako koristite Google prijavu)'],
  ['Osmrtnice i memorijali', 'podaci o preminuloj osobi, tekstovi, fotografije, videozapisi, postavke vidljivosti, pozivnice', 'izvršavanje ugovora', 'Supabase (baza i pohrana datoteka)'],
  ['Narudžbe i plaćanje', 'iznos, popust, status plaćanja, identifikatori transakcije; podatke o kartici ne primamo', 'izvršavanje ugovora, pravna obveza', 'Stripe'],
  ['Računi i knjigovodstvo', 'ime ili naziv, adresa, OIB/PDV broj ako ih unesete, iznos', 'pravna obveza', 'Minimax'],
  ['E-mail obavijesti i potvrde', 'e-mail adresa, sadržaj poruke', 'izvršavanje ugovora, pravna obveza', 'vlastiti poslužitelj e-pošte domene osmrtnica.com.hr'],
  ['Prigovori, raskidi, prijave sadržaja', 'podaci iz obrasca i prilozi', 'pravna obveza, izvršavanje ugovora', 'Supabase'],
  ['Analitika i marketing', 'podaci o posjetu i događajima na stranici', 'privola', 'Google Tag Manager, Meta (Pixel i Conversions API)'],
  ['Hosting stranice', 'tehnički podaci zahtjeva (IP adresa, preglednik)', 'legitimni interes sigurnog rada usluge', 'Lovable (hosting aplikacije)'],
];

const PolitikaPrivatnosti = () => {
  const b = useBusiness();
  return (
    <LegalLayout title="Politika privatnosti" path="/politika-privatnosti" version={LEGAL_VERSIONS.privatnost}>
      <H2>Tko upravlja vašim podacima</H2>
      <p>Voditelj obrade je {b.legal_name}, {fullAddress(b)}, OIB {b.oib}.</p>
      <p>Za pitanja o privatnosti i ostvarivanje prava obratite se na <a className="text-primary underline" href={`mailto:${b.email}`}>{b.email}</a>.</p>

      <H2>Koje podatke obrađujemo</H2>
      <p>Ovisno o načinu korištenja stranice, obrađujemo podatke korisničkog računa, kontaktne podatke, sadržaj koji unosite, postavke vidljivosti, podatke o pozivnicama i pristupu, narudžbama, plaćanjima i prigovorima te tehničke podatke potrebne za sigurnost i rad usluge.</p>
      <p>Ako se prijavljujete preko vanjskog pružatelja prijave, primamo podatke objašnjene pri povezivanju računa. Ne tražimo da nam dostavite lozinku za taj vanjski račun.</p>
      <p>Ne unosite podatke drugih osoba koji nisu potrebni za svrhu objave.</p>

      <H2>Svrhe i pravne osnove</H2>
      <p>Podatke potrebne za registraciju, naručivanje, upravljanje memorijalom i pružanje usluge obrađujemo radi sklapanja i izvršavanja ugovora.</p>
      <p>Podatke koje moramo voditi zbog izdavanja računa, poreznih obveza i postupanja po zakonskim zahtjevima obrađujemo radi ispunjavanja pravnih obveza.</p>
      <p>Za obradu radi sigurnosti i zaštite od zlouporabe primjenjujemo odgovarajuću pravnu osnovu, uz ograničenje opsega i procjenu utjecaja na prava korisnika.</p>
      <p>Analitičku i marketinšku obradu koja zahtijeva privolu provodimo samo ako je date. Privolu možete povući u <L to="/kolacici">postavkama kolačića</L>, bez utjecaja na zakonitost obrade prije povlačenja. U marketinške događaje ne šaljemo imena preminulih, tekstove uspomena ni privatne medije.</p>
      <p>Za podatke drugih živih osoba koje korisnik unese potrebno je osigurati odgovarajuću osnovu i obavještavanje; ugovor s autorom objave ne predstavlja automatski osnovu za svu obradu podataka drugih osoba.</p>
      <p>Ne provodimo automatizirano donošenje odluka koje bi za vas imalo pravne ili slične značajne učinke.</p>

      <H2>Vidljivost sadržaja</H2>
      <p>Kod javnog memorijala sadržaj je dostupan javnosti.</p>
      <p>Kod opcije „Samo putem poveznice” sadržaj može vidjeti svatko tko dobije poveznicu.</p>
      <p>Kod privatnog memorijala pristup je ograničen na vlasnika i pozvane osobe s odobrenim pristupom.</p>
      <p>Podaci o kupnji, e-mail korisničkog računa i drugi administrativni podaci nisu javni samo zato što je memorijal javan.</p>
      <p>Pristup pružatelja usluge ograničen je na ovlaštene osobe i svrhe za koje je potreban.</p>

      <H2>Primatelji podataka</H2>
      <p>Za rad usluge koristimo pružatelje infrastrukture, pohrane, prijave, dostave e-mailova, naplate i računovodstva, prema stvarno uključenim funkcijama. Podatke možemo dostaviti nadležnim tijelima kada postoji zakonska obveza.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-border">
          <thead className="bg-muted"><tr>{['Obrada', 'Podaci', 'Pravna osnova', 'Pružatelji'].map((h) => <th key={h} className="text-left p-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody>{PROCESSING.map((r) => <tr key={r[0]} className="border-t border-border">{r.map((c, i) => <td key={i} className="p-3 align-top">{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <p>Neki od navedenih pružatelja mogu obrađivati podatke izvan Europskog gospodarskog prostora. Na zahtjev ćemo vam dostaviti informacije o zaštitnim mjerama koje se primjenjuju na pojedini prijenos.</p>

      <H2>Čuvanje podataka</H2>
      <p>Sadržaj osmrtnica i memorijala čuvamo radi trajnog pružanja usluge, dok postoji odgovarajuća osnova za čuvanje i dok nije zatraženo ili naloženo uklanjanje.</p>
      <p>To ne znači da sve tehničke, marketinške i administrativne podatke čuvamo trajno. Za njih vrijede zasebni rokovi prema svrsi i zakonskim obvezama; knjigovodstvene isprave čuvamo onoliko koliko propisuju porezni i računovodstveni propisi.</p>
      <p>Brisanje korisničkog računa i brisanje pojedinog memorijala različiti su zahtjevi. Prije provedbe objašnjavamo posljedice za sadržaj kojim korisnik upravlja.</p>

      <H2>Vaša prava</H2>
      <p>Pod uvjetima propisanima Općom uredbom o zaštiti podataka možete zatražiti pristup, ispravak, brisanje, ograničenje obrade, prenosivost podataka i prigovor na obradu te povući privolu kada se obrada na njoj temelji.</p>
      <p>Na zahtjev odgovaramo u pravilu u roku od mjesec dana. Ako postoji zakonska mogućnost produljenja, o tome ćemo vas obavijestiti i obrazložiti razloge.</p>
      <p>Radi zaštite podataka možemo zatražiti razmjernu provjeru identiteta. Ne tražimo dodatne podatke koji nisu potrebni za provjeru.</p>
      <p>Pritužbu možete podnijeti Agenciji za zaštitu osobnih podataka. Informacije su dostupne na <a className="text-primary underline" href="https://azop.hr" target="_blank" rel="noopener noreferrer">https://azop.hr</a>.</p>
    </LegalLayout>
  );
};
export default PolitikaPrivatnosti;
