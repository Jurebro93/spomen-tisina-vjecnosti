# Nova naslovnica na `/homepage-2/`

## Cilj
Izraditi zasebnu, produkcijski spremnu varijantu naslovnice koja prvenstveno vodi prema pretrazi osmrtnica i digitalnom memorijalu, bez promjene postojeće rute `/` ili funkcionalnosti drugih stranica.

## Što će biti izgrađeno
- Dodati novu rutu `/homepage-2/` prije postojeće opće rute za osmrtnice.
- Napraviti posebnu verziju zaglavlja za novu naslovnicu:
  - bez duplog obrasca pretrage
  - s postojećim logom, glavnim poveznicama, mobilnim izbornikom i korisničkim računom/odjavom
  - naziv uz logo neće biti H1
- Napraviti prvi ekran u omjeru približno 60/40:
  - H1 „Osmrtnice Hrvatska” i postojeći tok pretrage po imenu/gradu, uključujući Enter
  - kompaktna kartica digitalnog memorijala s cijenom iz zajedničkog izvora i jasnom porukom da se može izraditi i nakon mnogo godina
  - ogledni prikaz memorijala i označeno praćenje pozicije klika
- Prikazati najnovije stvarne osmrtnice iz Supabasea:
  - šest na računalu i četiri na mobitelu
  - stvarne poveznice, neutralna zamjenska fotografija, podaci korisni za identifikaciju i ispraćaj
  - stanja učitavanja, praznog popisa i greške
- Prikazati stvarne gradove iz postojeće funkcije baze kao HTML poveznice na postojeće URL-ove, s istaknutih pet gradova i proširivim ostatkom.
- Dodati glavnu sekciju digitalnog memorijala:
  - zadani naslov, tekst i tri prednosti
  - poveznice na `/digitalni-memorijal/` i postojeći ogledni memorijal s izmišljenim podacima
  - ponovno koristiti postojeći ogledni sadržaj bez stvarnih privatnih obiteljskih fotografija
- Prikazati tri stvarna, najbliže relevantna članka iz tablice `blogs`, s postojećim naslovima, slikama, opisima i URL-ovima; odabir će ostati temeljen na podacima iz baze.
- Prikazati virtualne svijeće i memorijalni vrt kao dvije sažete kartice bez demonstracijskih brojki i dugih citata.
- Dodati posebnu, sažetu varijantu podnožja za ovu stranicu:
  - stvarni kontakt i pravne poveznice
  - jasna poveznica „Digitalni memorijal”
  - jedan postojeći funkcionalni newsletter obrazac
  - bez tvrdnje „više od 10 godina” i drugih nepotvrđenih brojki

## SEO i mjerenje
- Postaviti zaseban title, description, canonical i Open Graph podatke za `/homepage-2/` putem postojećeg head sustava.
- Dodati samo strukturirane podatke koji odgovaraju vidljivom sadržaju; bez ocjena i brojki koje nisu potvrđene.
- Sačuvati postojeći GA4, Meta Pixel i upravljanje privolama bez novih skripti ili događaja kupnje.
- Dodati anoniman parametar pozicije za tri memorijalna klika: prva kartica, glavna sekcija i ogledni primjer, koristeći postojeći način praćenja gdje je dostupan.

## Mobilni prikaz i pristupačnost
- Prilagoditi raspored širinama 320, 375, 390, 768 i 1440 px bez horizontalnog pomicanja.
- Osigurati oznake polja, tipkovničko korištenje, vidljiv fokus i dodirne površine od najmanje 44 px.
- Rezervirati prostor za slike i odgoditi učitavanje sadržaja ispod prvog ekrana.
- Poštovati postavku smanjenog kretanja i ne dodavati fiksni prodajni gumb.

## Tehničke napomene
- Nova stranica i njezine sekcije bit će zasebne komponente kako izmjene ne bi utjecale na postojeću naslovnicu i druge stranice.
- Pretraga će zadržati postojeća odredišta: `/pretraga?q=...&city=...` i `/umrli/:city`.
- Cijena ostaje iz `MEMORIAL_PRICE_LABEL`; Stripe proizvod i naplata se ne mijenjaju.
- Podaci ostaju iz postojećih Supabase tablica i funkcija; nisu potrebne promjene strukture baze.

## Provjera
- Provjeriti pretragu po imenu, gradu i tipki Enter.
- Provjeriti sve poveznice, mobilni izbornik te prikaz prijavljenog i neprijavljenog korisnika.
- Provjeriti stvarne osmrtnice, gradove, članke i sva tri ulaza prema digitalnom memorijalu.
- Vizualno provjeriti 320, 375, 390, 768 i 1440 px, konzolu i završnu provjeru projekta.

## Poznato ograničenje sadržaja
U bazi trenutačno nema članaka koji izravno pokrivaju sve tri tražene teme. Prikazat će se tri najbliža postojeća relevantna članka bez izmjene njihovih naslova ili stvaranja praznog sadržaja, a nedostajuće teme bit će navedene u završnom izvještaju.
