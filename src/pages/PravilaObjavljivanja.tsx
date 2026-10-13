import LegalLayout, { H2, L } from '@/components/legal/LegalLayout';
import { LEGAL_VERSIONS } from '@/lib/legal';
import { useBusiness } from '@/lib/business';

const PravilaObjavljivanja = () => {
  const b = useBusiness();
  return (
    <LegalLayout title="Pravila objavljivanja" path="/pravila-objavljivanja" version={LEGAL_VERSIONS.pravila}>
      <p>Osmrtnica.com.hr namijenjena je dostojanstvenom čuvanju uspomena i objavi informacija o preminulim osobama.</p>
      <p>Objavljujte sadržaj za koji imate potrebna prava i ovlaštenja. Pazite na točnost podataka i privatnost živih osoba koje se spominju ili prikazuju.</p>
      <p>Nisu dopušteni lažno predstavljanje, prijetnje, uznemiravanje, govor mržnje, objava tuđih privatnih podataka bez odgovarajuće osnove i drugi nezakoniti sadržaji.</p>
      <H2>Prava na sadržaj</H2>
      <p>Objavom ne prenosite vlasništvo nad svojim autorskim pravima. Dajete nam neisključivo dopuštenje da sadržaj pohranimo, tehnički obradimo i prikažemo u opsegu potrebnom za pružanje usluge i prema odabranoj vidljivosti.</p>
      <p>To dopuštenje samo po sebi ne obuhvaća korištenje privatnih fotografija ili uspomena u oglasima.</p>
      <H2>Prijava i postupanje</H2>
      <p>Ako smatrate da sadržaj krši vaša prava ili ova pravila, prijavite ga putem stranice <L to="/prijava-sadrzaja">Prijava sadržaja</L> ili e-maila <a className="text-primary underline" href={`mailto:${b.email}`}>{b.email}</a>.</p>
      <p>Prijavu ćemo razmotriti i prema potrebi zatražiti dodatne informacije. Ovisno o okolnostima možemo zatražiti ispravak, ograničiti pristup ili ukloniti sadržaj.</p>
      <p>Kada je primjenjivo, korisniku dostavljamo obrazloženje odluke i informacije o mogućnosti njezina preispitivanja.</p>
      <H2>Obiteljski sporovi</H2>
      <p>Ako više osoba osporava pravo upravljanja sadržajem, možemo zatražiti dokaze o ovlaštenju i privremeno ograničiti sporni sadržaj dok se okolnosti ne razjasne.</p>
      <p>Ne odlučujemo o nasljednim i drugim sporovima za koje su nadležna javna tijela ili sudovi.</p>
      <p>Promjenu osobe koja upravlja memorijalom moguće je zatražiti putem podrške, uz provjeru ovlaštenja.</p>
      <p>Obrada osobnih podataka opisana je u <L to="/politika-privatnosti">Politici privatnosti</L>.</p>
    </LegalLayout>
  );
};
export default PravilaObjavljivanja;
