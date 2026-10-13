# Šest nadolazećih godišnjica memorijala

## Cilj
- U odabranoj sekciji prikazati šest javnih, objavljenih i plaćenih memorijala.
- Poredati ih prema najbližoj godišnjici smrti nakon današnjeg datuma: sutra, prekosutra i dalje.
- Svakodnevno osvježiti izbor bez potrebe za ponovnom objavom stranice.
- Iz životne priče ukloniti HTML oznake prije prikaza sažetka.

## Izvedba
- Zadržati postojeći izgled kartica i poveznice na memorijale.
- Iz Supabase podataka izračunati sljedeću godišnjicu smrti za svaki memorijal, isključiti današnje godišnjice, sortirati uzlazno i uzeti prvih šest.
- Očistiti HTML iz opisa prije skraćivanja teksta.
- Ponovno učitati podatke nakon lokalne ponoći, zatim svaka 24 sata.
- Ako nema dovoljno odgovarajućih zapisa, nadopuniti postojeće primjere bez duplikata.

## Provjera
- Potvrditi da se ne prikazuju oznake poput `<p>`.
- Potvrditi šest kartica i ispravan redoslijed nadolazećih godišnjica.
- Provjeriti prikaz na računalu i mobitelu te stanje aplikacije bez grešaka.
