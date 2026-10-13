-- Update obituaries table to support multiple contact persons
ALTER TABLE public.obituaries 
ADD COLUMN kontakt_osobe JSON DEFAULT NULL;

-- Add sample obituaries
INSERT INTO public.obituaries (
  ime, prezime, datum_rodenja, datum_smrti, mjesto_rodenja, mjesto_smrti, 
  profesija, podnaslov, biografija, fotografija_url, groblje, datum_ukopa, 
  ozalosceni, mjesna_zajednica, kontakt_osoba_ime, kontakt_osoba_email, 
  kontakt_osoba_telefon, paid, active
) VALUES 
(
  'Marko', 'Marković', '1945-03-15', '2024-12-20', 'Zagreb', 'Zagreb',
  'Umirovljeni učitelj', 'Voljeni otac i djed',
  'Marko je bio posvećen učitelj koji je cijeli svoj radni vijek proveo u osnovnoj školi. Volio je knjige, prirodu i svoju obitelj. Ostavio je za sobom neizmjerni trag ljubavi i znanja.',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
  'Mirogoj', '2024-12-23 14:00:00',
  '{"supruga Marija", "sin Petar", "kći Ana", "unuci Luka i Mila"}',
  'Donji grad',
  'Marija Marković', 'marija.markovic@email.com', '+385 98 123 4567', true, true
),
(
  'Ana', 'Petković', '1960-07-22', '2024-12-18', 'Split', 'Split',
  'Medicinska sestra', 'Draga mama i baka',
  'Ana je bila predana medicinska sestra koja je pomoću svoje topline i stručnosti liječila tisuće pacijenata. Bila je stub svoje obitelji i zajednice.',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
  'Lovrinac', '2024-12-21 11:00:00',
  '{"suprug Ivo", "sin Marko", "kći Petra", "unuci Tomislav i Iva"}',
  'Varoš',
  'Ivo Petković', 'ivo.petkovic@email.com', '+385 91 234 5678', true, true
),
(
  'Josip', 'Novak', '1938-11-10', '2024-12-15', 'Rijeka', 'Rijeka',
  'Kapetan broda', 'Poštovani pomorski veteran',
  'Josip je bio iskusni kapetan koji je proveo više od 40 godina na moru. Poznat po svojoj čestitosti i ljubavi prema moru, ostavio je dubok trag u riječkoj pomorskoj zajednici.',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
  'Kozala', '2024-12-19 15:30:00',
  '{"supruga Milena", "sin Davor", "kći Sanja", "unuci Matej i Petra"}',
  'Centar',
  'Milena Novak', 'milena.novak@email.com', '+385 99 345 6789', true, true
),
(
  'Marija', 'Horvat', '1950-09-05', '2024-12-12', 'Osijek', 'Osijek',
  'Kuharica', 'Najdraža baka',
  'Marija je bila strastvena kuharica koja je svojom ljubavlju prema hrani i obitelji okupljala sve oko sebe. Njena kolačići i topla riječ ostat će zauvijek u srcima onih koji su je poznavali.',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
  'Bezdan', '2024-12-16 10:00:00',
  '{"suprug Stjepan", "sin Tomislav", "kći Ivana", "unuci Luka i Ana"}',
  'Gornji grad',
  'Stjepan Horvat', 'stjepan.horvat@email.com', '+385 92 456 7890', true, true
),
(
  'Petar', 'Babić', '1955-12-01', '2024-12-10', 'Zadar', 'Zadar',
  'Električar', 'Pošten radnik i prijatelj',
  'Petar je bio majstor svog zanata, uvijek spreman pomoći susjedima i prijateljima. Volio je football, ribolov i druženje s obitelji.',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face',
  'Smiljevac', '2024-12-14 13:00:00',
  '{"supruga Kata", "sin Marko", "kći Petra", "unuci Josip i Marija"}',
  'Poluotok',
  'Kata Babić', 'kata.babic@email.com', '+385 95 567 8901', true, true
),
(
  'Ivana', 'Jurić', '1965-04-18', '2024-12-08', 'Pula', 'Pula',
  'Farmaceutkinja', 'Briga i ljubav u svakom trenutku',
  'Ivana je bila posvećena farmaceutkinja koja je uvijek bila spremna pomoći i savjetovati svoje pacijente. Bila je poznata po svojoj ljubaznosti i stručnosti.',
  'https://images.unsplash.com/photo-1494790108755-2616b332c913?w=400&h=400&fit=crop&crop=face',
  'Vodnjan', '2024-12-12 16:00:00',
  '{"suprug Darko", "sin Filip", "kći Lucija", "unuci Mateo i Sara"}',
  'Centar',
  'Darko Jurić', 'darko.juric@email.com', '+385 96 678 9012', true, true
),
(
  'Franjo', 'Kovač', '1942-08-30', '2024-12-05', 'Karlovac', 'Karlovac',
  'Stolar', 'Majstor zlatnih ruku',
  'Franjo je bio izniman stolar koji je stvarao prekrasne komade namještaja. Svaki jego rad bio je umjetničko djelo, a njegova posvećenost zanatu bila je legendarna.',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
  'Dubovac', '2024-12-09 11:30:00',
  '{"supruga Marija", "sin Ivo", "kći Dragica", "unuci Ante i Petra"}',
  'Banija',
  'Marija Kovač', 'marija.kovac@email.com', '+385 97 789 0123', true, true
),
(
  'Milka', 'Tomić', '1948-06-14', '2024-12-02', 'Varaždin', 'Varaždin',
  'Švelja', 'Žena velikog srca',
  'Milka je bila vješta švelja koja je stvarala prekrasnu odjeću. Poznata po svojoj kreativnosti i toplini, uvijek je bila spremna pomoći drugima.',
  'https://images.unsplash.com/photo-1559941707-bffb6b8cbff8?w=400&h=400&fit=crop&crop=face',
  'Hallerovo', '2024-12-06 14:30:00',
  '{"suprug Stjepan", "sin Hrvoje", "kći Božica", "unuci Matija i Lena"}',
  'Centar',
  'Stjepan Tomić', 'stjepan.tomic@email.com', '+385 98 890 1234', true, true
),
(
  'Andrija', 'Blažević', '1952-02-28', '2024-11-30', 'Sisak', 'Sisak',
  'Vatrogasac', 'Heroj svakodnevnice',
  'Andrija je bio hrabar vatrogasac koji je cijeli svoj radni vijek posvetio spašavanju života i imovine. Njegova hrabrost i nesebičnost ostat će zauvijek pamćene.',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=face',
  'Groblje Sisak', '2024-12-04 12:00:00',
  '{"supruga Nada", "sin Damir", "kći Sanja", "unuci Lovro i Ema"}',
  'Caprag',
  'Nada Blažević', 'nada.blazevic@email.com', '+385 99 901 2345', true, true
),
(
  'Ruža', 'Perić', '1958-10-12', '2024-11-28', 'Slavonski Brod', 'Slavonski Brod',
  'Krojačica', 'Umjetnica igle i konca',
  'Ruža je bila talentirana krojačica koja je stvarala prekrasne haljine za posebne prigode. Njena precioznost i ljubav prema detaljima činile su je omiljenom u zajednici.',
  'https://images.unsplash.com/photo-1547040064-1a89e7bdabd1?w=400&h=400&fit=crop&crop=face',
  'Klaonica', '2024-12-02 15:00:00',
  '{"suprug Mijo", "sin Hrvoje", "kći Jelena", "unuci Petra i Luka"}',
  'Podvinje',
  'Mijo Perić', 'mijo.peric@email.com', '+385 91 012 3456', true, true
),
(
  'Nikola', 'Radić', '1946-01-25', '2024-11-25', 'Dubrovnik', 'Dubrovnik',
  'Ribar', 'Čovjek mora',
  'Nikola je bio posvećen ribar koji je poznavao svaki kut Jadranskog mora. Njegova ljubav prema moru i prirodi bila je neizmjerna, kao i ljubav prema obitelji.',
  'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=400&h=400&fit=crop&crop=face',
  'Boninovo', '2024-11-29 10:30:00',
  '{"supruga Kata", "sin Duje", "kći Marija", "unuci Ante i Luka"}',
  'Lapad',
  'Kata Radić', 'kata.radic@email.com', '+385 92 123 4567', true, true
),
(
  'Milica', 'Šimić', '1953-05-08', '2024-11-22', 'Čakovec', 'Čakovec',
  'Bibliotekar', 'Čuvarica znanja',
  'Milica je bila posvećena bibliotekar koja je pomagala generacijama studenata i čitatelja. Njena ljubav prema knjigama i znanju bila je zarazna.',
  'https://images.unsplash.com/photo-1488207984232-a96a4d2d2a07?w=400&h=400&fit=crop&crop=face',
  'Mihaljevec', '2024-11-26 13:30:00',
  '{"suprug Božo", "sin Matej", "kći Ivana", "unuci Filip i Ana"}',
  'Centar',
  'Božo Šimić', 'bozo.simic@email.com', '+385 93 234 5678', true, true
),
(
  'Stjepan', 'Vuković', '1940-12-03', '2024-11-20', 'Koprivnica', 'Koprivnica',
  'Poštar', 'Pouzdani glasnik',
  'Stjepan je bio vjerni poštar koji je više od 35 godina dostavljao poštu po gradu. Poznat po svojoj točnosti i ljubaznosti, bio je omiljen u cijeloj zajednici.',
  'https://images.unsplash.com/photo-1464746133101-a2c3f88e0dd9?w=400&h=400&fit=crop&crop=face',
  'Koprivnica', '2024-11-24 14:00:00',
  '{"supruga Anica", "sin Darko", "kći Vesna", "unuci Marko i Petra"}',
  'Centar',
  'Anica Vuković', 'anica.vukovic@email.com', '+385 94 345 6789', true, true
);