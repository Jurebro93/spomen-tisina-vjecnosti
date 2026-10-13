# Admin: automatska izrada cijelog memorijala poznate osobe

Postojeća stranica „Portreti poznatih osoba" postaje „Izrada memorijala poznatih osoba" – jedan alat koji iz imena i prezimena izradi kompletan memorijal (tekst + slike), spremi ga u bazu kao skicu i pusti admina da ga pregleda i objavi.

## Nova forma (korak po korak)

**Korak 1 – Osoba**
- Ime, Prezime (obavezno)
- Datum rođenja, Datum smrti (neobavezno – ako se ostave prazni, alat ih predloži; datumi uvijek ≤ danas, smrt ≥ rođenje)
- Mjesto rođenja, Mjesto smrti, Zanimanje (neobavezno, predlaže se)
- Dodatne napomene za AI (npr. „naglasi glazbenu karijeru")
- Gumb: **„Pronađi podatke i fotografije"**

**Korak 2 – Pregled prijedloga** (sve se može ručno urediti prije spremanja)
- Osnovni podaci: datumi, mjesta, zanimanje
- Citat (kratka misao)
- Biografija (4–6 odlomaka, bez HTML-a)
- Važne godine / životni događaji (6–10 stavki: godina, naslov, opis), kronološki
- 2–3 sjećanja (tributes) u tonu prijašnjih memorijala
- Fotografije: do 4 licencirane stvarne fotografije (postojeći postupak), plus mogućnost **„Generiraj dodatne slike"** za 3–4 ilustrativne slike po vašem promptu (ne lice osobe – prizori iz života/rada)
- Odabir naslovne fotografije (mora biti stvarni portret s cijelom glavom)
- Gumbi po sekciji: **„Ponovno generiraj"** (npr. samo biografiju ili samo događaje)

**Korak 3 – Spremanje**
- **„Spremi kao skicu"** – memorijal se kreira, ostaje neobjavljen
- **„Spremi i objavi"** – objavljuje odmah (admin, bez plaćanja, kao prijašnji ručno kreirani memorijali)
- Nakon spremanja: poveznica **„Otvori memorijal"** i **„Uredi memorijal"**
- Provjera duplikata: ako osoba već ima memorijal, upozorenje i gumb „Otvori postojeći" umjesto stvaranja novog

## Pravila za tekst
- Samo provjerljive činjenice; ako AI nije siguran u datum ili mjesto, polje ostaje prazno i označeno „provjeriti"
- Hrvatski jezik, dostojanstven ton, bez izmišljenih citata pripisanih osobi (citat je označen kao „misao", ne kao izjava osobe)

## Tehnički detalji
- Nova admin-only edge funkcija `generate-famous-memorial`: AI Gateway (`openai/gpt-6-astra`, Responses API) vraća strukturirani JSON (datumi, mjesta, zanimanje, citat, biografija, događaji, sjećanja, confidence po polju). Podržava regeneraciju pojedine sekcije.
- Slike: postojeći `search-famous-portraits` / `process-famous-portrait` ostaju za stvarne fotografije; nova funkcija `generate-memorial-illustration` (`openai/gpt-image-2.5-sunburst`) za dodatne slike; sve u `obituary-photos/memorials/<id>/photos/` s provenijencijom.
- Nova admin-only funkcija `save-famous-memorial`: koristi `create_memorial_person` logiku + `generate_memorial_slug`, upisuje `obituaries`, `memorials` (paid=true, admin), `memorial_life_events`, `memorial_tributes` (approved), `memorial_media`, povezuje `famous_portrait_photos.memorial_id`. Sve u jednoj transakciji (RPC) da ne ostanu napola kreirani zapisi.
- Provjera admina server-side (`has_role`), greške 402/429 prikazane jasno u formi.
- Naziv u admin izborniku: „Izrada memorijala poznatih osoba"; ruta ostaje `/admin/portreti`.
