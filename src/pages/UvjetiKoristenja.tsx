import LegalLayout, { H2, L } from '@/components/legal/LegalLayout';
import { LEGAL_VERSIONS } from '@/lib/legal';
import { fullAddress, useBusiness } from '@/lib/business';
import { formatEur } from '@/lib/promo';
import { activeSeasonalPromo, seasonalPrice } from '@/lib/seasonalPromo';

const UvjetiKoristenja = () => {
  const b = useBusiness();
  const seasonal = activeSeasonalPromo();
  return (
    <LegalLayout title="Uvjeti korištenja i kupnje" path="/uvjeti-koristenja" version={LEGAL_VERSIONS.uvjeti}>
      <p>Ovi uvjeti uređuju korištenje stranice osmrtnica.com.hr, objavu besplatnih osmrtnica i kupnju digitalnih memorijala.</p>
      <p>Pružatelj usluge je {b.legal_name}, {fullAddress(b)}, OIB {b.oib}. Kontakt: <a className="text-primary underline" href={`mailto:${b.email}`}>{b.email}</a>.</p>
      <p>Ugovor se sklapa na hrvatskom jeziku.</p>

      <H2>Besplatne osmrtnice</H2>
      <p>Kreiranje i objava osmrtnice su besplatni. Korisnik može naknadno uređivati vlastitu osmrtnicu u okviru dostupnih funkcija stranice. Osmrtnica nema unaprijed određen datum isteka. Korisnik može zatražiti njezino uklanjanje.</p>

      <H2>Digitalni memorijal</H2>
      <p>Digitalni memorijal omogućuje čuvanje i predstavljanje uspomena kroz fotografije, videozapise i tekstove te naknadno uređivanje sadržaja.</p>
      <p>Cijena iznosi 39,00 € i plaća se jednokratno.{seasonal && ` Do ${seasonal.untilLabel} (${seasonal.occasion}) cijena uz popust iznosi ${formatEur(seasonalPrice(seasonal))}.`} Ne postoji pretplata ni naknada za obnovu. {b.tax_note}</p>
      <p>Dostupne funkcije, tehnički preduvjeti i ograničenja navedeni su u opisu usluge prije kupnje.</p>

      <H2>Virtualne svijeće</H2>
      <p>Virtualnu svijeću možete zapaliti za osmrtnicu ili na digitalnom memorijalu. Sami birate koliko dugo gori: 7 dana za 3,99 €, 14 dana za 5,99 € ili 30 dana za 9,99 €. Plaća se jednokratno karticom, bez pretplate. Svijeća se prikaže odmah nakon potvrde plaćanja i automatski se gasi kad istekne odabrano razdoblje. Ugašenu svijeću možete ponovno zapaliti uz istu cijenu.</p>

      <H2>Trajanje i čuvanje</H2>
      <p>Memorijale i osmrtnice čuvamo trajno, bez unaprijed određenog roka isteka. Korisnik nije obvezan periodično plaćati nastavak čuvanja.</p>
      <p>Trajno čuvanje ne sprječava uklanjanje na zahtjev ovlaštenog korisnika, nakon raskida ugovora ili kada za uklanjanje postoji zakonska osnova. Na sadržaj se primjenjuju i <L to="/pravila-objavljivanja">Pravila objavljivanja</L>.</p>
      <p>Privremeni tehnički prekidi ne znače prestanak usluge. U slučaju problema poduzimamo primjerene mjere za ponovno uspostavljanje dostupnosti.</p>
      <p>Ako nastupe okolnosti koje ugrožavaju nastavak pružanja usluge, korisnike ćemo obavijestiti, omogućiti im preuzimanje njihova sadržaja i postupiti prema primjenjivim obvezama i pravima korisnika. Time se ne isključuje odgovornost za preuzete obveze.</p>

      <H2>Korisnički račun</H2>
      <p>Korisnik je odgovoran za čuvanje pristupnih podataka i točnost podataka koje unosi. Ako posumnja na neovlašten pristup, treba nas obavijestiti.</p>
      <p>Korisnik smije uređivati sadržaj za koji ima odgovarajuća ovlaštenja. Dostupni načini prijave i postavke računa prikazani su u sučelju.</p>

      <H2>Vidljivost memorijala</H2>
      <p><strong>Javno:</strong> Memorijal je dostupan svima i može se prikazivati u javnim popisima i internetskim tražilicama.</p>
      <p><strong>Samo putem poveznice:</strong> Memorijal nije prikazan u javnim popisima i pretraživanju na našoj stranici. Može ga otvoriti svatko tko ima poveznicu. Primatelj je može proslijediti drugima, pa ova opcija nije isto što i privatni pristup.</p>
      <p><strong>Privatno:</strong> Memorijal mogu vidjeti vlasnik i pozvani članovi obitelji kojima je odobren pristup. Za pristup je potrebna provjera ovlaštenja.</p>
      <p>Ovlaštene osobe pružatelja usluge mogu pristupiti sadržaju samo kada je to potrebno za podršku, sigurnost, održavanje ili ispunjavanje zakonskih obveza, u nužnom opsegu.</p>
      <p>Promjena javnog memorijala u ograničeni način vidljivosti ne može povući kopije koje su druge osobe prethodno napravile izvan naše usluge. Prethodni rezultati internetskih tražilica mogu se zadržati do njihova ažuriranja.</p>

      <H2>Postupak narudžbe</H2>
      <ol className="list-decimal pl-6 space-y-1">
        <li>Prijavite se ili registrirajte korisnički račun.</li>
        <li>Unesite podatke o preminuloj osobi, sadržaj memorijala i odaberite vidljivost.</li>
        <li>Prije potvrde možete pregledati i ispraviti sve unesene podatke, upisati promotivni kod i podatke za račun.</li>
        <li>Prihvatite ove uvjete i odaberite želite li da usluga započne odmah.</li>
        <li>Potvrdite narudžbu gumbom „Naruči i plati” (ili „Aktiviraj besplatno” kod koda sa 100 % popusta).</li>
      </ol>
      <p><strong>Trenutak sklapanja ugovora:</strong> kod plaćene narudžbe ugovor je sklopljen u trenutku kada pružatelj platnih usluga potvrdi uspješnu naplatu; kod besplatne aktivacije u trenutku potvrde gumbom „Aktiviraj besplatno”. Od tog trenutka računa se rok od 14 dana za jednostrani raskid.</p>
      <p>Tekst ovih uvjeta važećih u trenutku narudžbe šaljemo vam u e-mail potvrdi, kako biste ga mogli trajno sačuvati. Prihvaćenu verziju uvjeta pohranjujemo uz narudžbu.</p>

      <H2>Narudžba i plaćanje</H2>
      <p>Prije potvrde narudžbe korisniku se prikazuje konačan iznos i eventualni popust. Narudžba koja uključuje plaćanje potvrđuje se gumbom koji jasno označava obvezu plaćanja.</p>
      <p>Plaćanje se provodi dostupnim načinima prikazanima u postupku kupnje. Usluga se aktivira nakon potvrde uspješne naplate, prema odabranom trenutku početka pružanja usluge. Ako ne zatražite da usluga započne odmah, memorijal se objavljuje nakon isteka roka od 14 dana, a datum početka prikazujemo prije potvrde.</p>
      <p>Kod valjanog koda za potpuno besplatnu aktivaciju naplata se ne provodi.</p>
      <p>Potvrda narudžbe i ugovorne informacije dostavljaju se na e-mail korisnika. Sam povratak sa stranice plaćanja ne znači da je plaćanje uspješno provedeno.</p>

      <H2>Promotivni kodovi</H2>
      <p>Promotivni kodovi koriste se prema uvjetima objavljenima uz pojedinu ponudu. Popust i konačan iznos prikazuju se prije potvrde.</p>
      <p>Kod sa 100 % popusta omogućuje besplatnu aktivaciju. Takva aktivacija ne daje pravo na isplatu redovne cijene usluge u novcu.</p>

      <H2>Odustajanje i problemi s uslugom</H2>
      <p>Potrošač može odustati od kupnje u roku od 14 dana od sklapanja ugovora bez navođenja razloga. U tom slučaju vraćamo cjelokupan stvarno plaćeni iznos i uklanjamo memorijal prema postupku na stranici <L to="/raskid-i-povrat">Jednostrani raskid i povrat</L>.</p>
      <p>Kod virtualne svijeće kupac prije plaćanja izričito traži da svijeća zasvijetli odmah i potvrđuje da time gubi pravo na jednostrani raskid. Ako svijeća nakon plaćanja nije prikazana, javite nam se i vratit ćemo plaćeni iznos.</p>
      <p>Pravo na raskid u navedenom roku ne zamjenjuje prava zbog neisporuke ili neusklađenosti usluge.</p>
      <p>Ako usluga ne odgovara ugovorenome, korisnik može zatražiti rješavanje problema i ostvariti druga prava prema primjenjivim propisima. Pisani prigovor možete podnijeti putem stranice <L to="/prigovori">Prigovori i reklamacije</L>.</p>

      <H2>Mjerodavno pravo</H2>
      <p>Primjenjuje se pravo Republike Hrvatske, uz očuvanje prisilnih prava potrošača koja se ne mogu isključiti ugovorom. Ovi uvjeti ne ograničavaju zakonska prava korisnika.</p>
      <p>Obrada osobnih podataka opisana je u <L to="/politika-privatnosti">Politici privatnosti</L>.</p>
    </LegalLayout>
  );
};
export default UvjetiKoristenja;
