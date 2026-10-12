# Administratorska izrada uređenih portreta poznatih osoba

## Cilj
Dodati administratorski alat u kojem se upiše ime i prezime poznate osobe, a sustav automatski pronalazi do četiri različite fotografije dopuštene za preradu, minimalno ih uređuje i sprema u Supabase za memorijalne i biografske stranice.

## Što će se izraditi
- Nova administratorska stranica za unos imena i prezimena, pokretanje postupka i pregled rezultata.
- Automatsko pretraživanje pouzdanog izvora otvoreno licenciranih fotografija, uz odbacivanje slika bez dopuštene prerade.
- Provjera da kandidat pripada traženoj osobi pomoću podataka izvora i vizualne AI provjere; nesigurni kandidati neće se obrađivati.
- Zasebna obrada svake izvorne fotografije: stvarni bajtovi slike šalju se modelu za uređivanje, nikad samo URL ili tekstualni opis.
- Stroga uputa modelu da sačuva identitet, dob, lice, kožu, kosu, izraz, pogled, pozu, odjeću i postojeći kadar; mijenja se prvenstveno nenametljiva pozadina te po potrebi diskretno svjetlo, kontrast i boja.
- Bez spajanja više fotografija, bez generiranja novog lica i bez izmišljanja dijelova tijela izvan izvornog kadra.
- Automatsko spremanje rezultata u javni Supabase spremnik `obituary-photos`, zajedno s izvorom, autorom, licencom i poveznicom na licencu.
- Jasna završna poruka koliko je fotografija uspješno pronađeno i obrađeno te koliko ih nedostaje do četiri.

## Sigurnost i pouzdanost
- Alat mogu koristiti samo prijavljeni administratori; ovlast se ponovno provjerava na serveru.
- Lovable AI ključ ostaje isključivo na serveru.
- Svaka obrada ide u zasebnom zahtjevu kako jedna neuspjela fotografija ne bi zaustavila ostale i kako bi se izbjeglo prekoračenje trajanja zahtjeva.
- Dozvoljene su samo licence koje dopuštaju izmjene; kandidati s nejasnom, ograničenom ili neprikladnom licencom bit će preskočeni.
- Izvorne i obrađene datoteke validirat će se prema vrsti, veličini i stvarnom sadržaju odgovora.
- Greške AI usluge prikazuju stvarnu sigurnu poruku; trajne zabrane se ne ponavljaju, a privremene greške imaju ograničeni odmak prije ponavljanja.

## Tehnički detalji
- Dodati tablice za posao obrade i pojedinačne fotografije, s RLS pravilima samo za administratore i potpunim `GRANT` naredbama.
- Dodati Supabase Edge funkcije za pretragu/provjeru izvora i za obradu jedne fotografije putem Lovable AI Gateway modela `openai/gpt-image-2.5-sunburst`.
- Kao primarni izvor koristiti Wikimedia Commons API i njegove strukturirane podatke o autoru/licenci; preuzeti binarnu datoteku server-side prije slanja modelu.
- Rezultate spremati pod stabilne putanje povezane s poslom/osobom, a završene fotografije po želji administratora povezati s postojećim memorijalom kao naslovnu i galerijske slike.
- Dodati administratorsku navigaciju i statusni prikaz za pronađeno, provjereno, obrađeno, preskočeno i neuspjelo.

## Provjera
- Testirati pristup administratora i odbijanje običnog korisnika.
- Testirati osobu s najmanje četiri dostupne slike te slučaj s manje od četiri.
- Potvrditi da su četiri različite izvorne datoteke zaista poslane kao zasebni ulazi za uređivanje.
- Potvrditi licence i spremljene podatke o porijeklu svake slike.
- Potvrditi da su rezultati spremljeni u Supabase, učitavaju se u administratorskom prikazu i mogu se povezati s memorijalom.
- Vizualno provjeriti prikaz na računalu i mobitelu te završiti bez grešaka u aplikaciji.
