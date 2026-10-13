# Pravne stranice, raskid, prigovori, privatnost i prilagodbe kupnje

Dokument je opsežan pa ga provodimo u 4 faze. Svaka faza je zasebno upotrebljiva. Dizajn, postojeći podaci i memorijali ostaju netaknuti.

## Faza 1 — Poslovni podaci, pravne stranice i footer
- Poslovni podaci (TECHNIKO, adresa, OIB, matični broj, e-mail, porezni status) spremaju se na jedno mjesto u bazi, uz administratorsku stranicu za uređivanje. Sve stranice i e-mailovi čitaju odatle.
- Nove stranice: /kontakt, /raskid-i-povrat, /prigovori, /pravila-objavljivanja, /prijava-sadrzaja.
- Postojeće stranice se nadograđuju tekstom iz dokumenta (bez duplikata): /uvjeti-koristenja, /politika-privatnosti, /kolacici. Stare adrese s kosom crtom na kraju i dalje rade.
- Svaka pravna stranica ima verziju i datum stupanja na snagu (datum objave). Stare verzije se čuvaju u bazi.
- Footer dobiva uredan blok „Pravne informacije" sa svih 9 poveznica, uključujući „Jednostrani raskid i povrat" (izgleda kao ostale) i „Postavke kolačića".
- Raskid se NE pojavljuje u memorijalu, njegovim opcijama ni u „Moji memorijali".
- Telefon, poštanski broj Žaborića i registarski podaci ne izmišljaju se. Dok ih ne potvrdite, ne prikazuju se, a pojavljuju se na popisu dopuna u administraciji.

## Faza 2 — Obrasci: raskid, prigovori, prijava sadržaja
- **Raskid:** gumb „Raskini ugovor" → obrazac sa sažetkom posljedica → „Potvrdi raskid ugovora". Radi i bez prijave. Prijavljeni korisnik bira svoju narudžbu s popisa. Razlog nije obavezan. Tuđi podaci se nikad ne prikazuju.
- Odmah se šalje e-mail potvrda sa sadržajem izjave, datumom i vremenom primitka. Rok se računa od primitka.
- Zahtjevi nakon 14 dana se ne odbijaju automatski, nego se označavaju za ručni pregled (mogu biti reklamacija).
- Koraci su odvojeni: zaprimanje → provjera identiteta → povrat → skrivanje memorijala → preuzimanje sadržaja → trajno brisanje. Slanje obrasca ništa ne briše.
- Povrat ide kroz Stripe, a zaštićen je od dvostrukog izvršenja.
- **Prigovori:** obrazac, broj predmeta, e-mail potvrda primitka i rok od 15 dana vidljiv administratoru.
- **Prijava sadržaja:** polja iz dokumenta, privitci u zaštićenom spremištu (ograničeni tip i veličina), broj predmeta i potvrda. Identitet prijavitelja se ne otkriva autoru. Na javnim memorijalima i osmrtnicama dodaje se diskretna poveznica „Prijavi sadržaj".
- Administratorska stranica „Predmeti" prikazuje raskide, prigovore i prijave sa statusima i rokovima.

## Faza 3 — Kupnja i e-mail potvrda
- Prije plaćanja se prikazuje: „Digitalni memorijal — 39,00 €, jednokratno. Bez pretplate i naknade za obnovu.", popust, konačni iznos, što je uključeno i stvarna tehnička ograničenja (npr. veličina datoteka).
- Obavezan kvačica, ničim unaprijed označena: „Prihvaćam Uvjete korištenja i kupnje".
- Posebna neobavezna kvačica: „Želim da pružanje usluge započne odmah…", uz napomenu da pravo na odustajanje ostaje.
- Ako korisnik ne zatraži početak odmah, memorijal se automatski objavljuje 14 dana nakon kupnje, a datum je jasno prikazan.
- Gumbi: „Naruči i plati 39,00 €" i, za kod od 100 %, „Aktiviraj besplatno". Ovaj drugi zamjenjuje sadašnji natpis „Objavi besplatno (0,00 €)".
- Uz svaku narudžbu se spremaju verzija uvjeta, vrijeme prihvaćanja, iznos i izbor početka usluge.
- E-mail potvrda nakon plaćanja ili besplatne aktivacije sadrži sve stavke iz točke 12 dokumenta. Cijeli tekst uvjeta šalje se u samom e-mailu, a ne samo kao poveznica.
- Registracija dobiva poveznice na uvjete i privatnost, a objava osmrtnice poveznicu na pravila objavljivanja i potvrdu prava na sadržaj.

## Faza 4 — Kolačići, privatnost memorijala, Minimax
- Novi banner s tri gumba (Prihvati sve, Odbij nenužne, Postavke) i kategorijama (nužni, analitika, marketing), sve nenužno unaprijed isključeno. Gumb u footeru ponovno otvara postavke.
- GTM, Meta Pixel i serverski Meta CAPI rade samo uz privolu za marketing. Kupnja radi i bez nje.
- Iz marketinških događaja uklanjaju se imena preminulih i adrese memorijala.
- Tablica stvarno korištenih kolačića na /kolacici.
- Provjera privatnih memorijala: fotografije, datoteke i API-ji kad korisnik nije prijavljen ili nema ovlasti. Kod opcije „samo putem poveznice" provjerava se da memorijal nije u sitemapu i da tražilice dobiju uputu da ga ne indeksiraju. Pronađeni propusti se ispravljaju.
- Minimax: zaštita od dvostrukog računa, evidencija povrata i upozorenja administratoru kad naplata nema račun. Besplatna aktivacija se bilježi kao „Besplatna aktivacija".

## Ono što ne mogu sama i navest ću u izvještaju
- Telefon, poštanski broj i podatke iz obrtnog registra treba potvrditi vlasnik. U službeni registar ne mogu ući.
- Knjigovođa treba odlučiti izdaje li se račun za 0 €. Treba provjeriti i napomenu o oslobođenju od PDV-a.
- Pravnik treba završno pregledati sve tekstove. Treba provjeriti i obvezu prema HAKOM-u te tijelo za alternativno rješavanje sporova.
- Treba potvrditi popis pružatelja usluga i u kojoj zemlji drže podatke.
- Treba odrediti koliko se dugo čuvaju sigurnosne kopije i plan obnove. Ništa od toga neću opisati kao provedeno ako nije.
- osmrtnica.com.hr je na vašem poslužitelju. Promjene stižu tamo tek ručnim postavljanjem ili povezivanjem domene. Napisat ću točne korake.

## Tehnički detalji
- Nove tablice: `business_settings`, `legal_documents` (verzije), `withdrawal_requests`, `complaints`, `content_reports` (proširenje postojeće `memorial_content_reports` ili nova za opće URL-ove), `order_consents`. Sve imaju RLS: javni unos ide preko edge funkcija, a čitanje je dopušteno samo adminu i vlasniku.
- Polje `memorial_orders.service_start_at` i zakazana funkcija (pg_cron) koja objavljuje memorijale s odgođenim početkom.
- Edge funkcije: `submit-withdrawal`, `submit-complaint`, `submit-content-report`, `process-refund` (samo admin, idempotentno preko Stripe idempotency key) i e-mail potvrda kupnje u `stripe-webhook` ili `verify-memorial-payment`.
- Privola se sprema u localStorage s kategorijama. Uz narudžbu se šalje oznaka privole, a CAPI preskače slanje ako privole nema.
