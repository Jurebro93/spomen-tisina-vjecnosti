-- Dodaj 15 test svijeća s hrvatskim imenima
INSERT INTO public.virtual_candles (pokojnik_ime, pokojnik_prezime, zapalio_ime, zapalio_email, poruka, paid, active, created_at) VALUES
('Marija', 'Horvat', 'Ana Petrović', 'ana.petrovic@gmail.com', 'Vječno ćeš ostati u našim srcima, draga mama.', true, true, NOW() - INTERVAL '1 hour'),
('Josip', 'Novak', 'Marko Novak', 'marko.novak@gmail.com', 'Počivaj u miru, tata. Nedostaješ nam svaki dan.', true, true, NOW() - INTERVAL '2 hours'),
('Kata', 'Babić', 'Petra Babić', 'petra.babic@gmail.com', 'Hvala ti za sve ljubavi koju si nam dala, baka.', true, true, NOW() - INTERVAL '3 hours'),
('Ante', 'Kovačević', 'Tomislav Kovačević', 'tomislav.kovacevic@gmail.com', 'Uvijek ćeš biti naš heroj i uzor.', true, true, NOW() - INTERVAL '4 hours'),
('Dragica', 'Matić', 'Ivana Matić', 'ivana.matic@gmail.com', 'Tvoja dobrota i ljubav žive u nama.', true, true, NOW() - INTERVAL '5 hours'),
('Stjepan', 'Jurić', 'Miroslav Jurić', 'miroslav.juric@gmail.com', 'Počivaj u miru, dragi dede. Volimo te.', true, true, NOW() - INTERVAL '6 hours'),
('Milka', 'Pavlović', 'Damir Pavlović', 'damir.pavlovic@gmail.com', 'Hvala ti za sve žrtve i nesebičnu ljubav.', true, true, NOW() - INTERVAL '7 hours'),
('Franjo', 'Knežević', 'Kristina Knežević', 'kristina.knezevic@gmail.com', 'Tvoja mudrost i savjeti će nam uvijek biti vodilja.', true, true, NOW() - INTERVAL '8 hours'),
('Ruža', 'Božić', 'Goran Božić', 'goran.bozic@gmail.com', 'Anđeo koji je krasio naše živote.', true, true, NOW() - INTERVAL '9 hours'),
('Ivo', 'Marić', 'Sanja Marić', 'sanja.maric@gmail.com', 'Tvoj osmijeh će zauvijek ostati u našim mislima.', true, true, NOW() - INTERVAL '10 hours'),
('Anica', 'Popović', 'Dragan Popović', 'dragan.popovic@gmail.com', 'Počivaj u miru, draga supruga.', true, true, NOW() - INTERVAL '11 hours'),
('Petar', 'Bošnjak', 'Marija Bošnjak', 'marija.bosnjak@gmail.com', 'Nedostaješ nam više nego što riječi mogu opisati.', true, true, NOW() - INTERVAL '12 hours'),
('Ljubica', 'Tomić', 'Nikola Tomić', 'nikola.tomic@gmail.com', 'Tvoja ljubav će zauvijek biti naša snaga.', true, true, NOW() - INTERVAL '13 hours'),
('Mato', 'Vuković', 'Željka Vuković', 'zeljka.vukovic@gmail.com', 'Hvala ti za sve prekrasne uspomene, tata.', true, true, NOW() - INTERVAL '14 hours'),
('Nada', 'Radić', 'Hrvoje Radić', 'hrvoje.radic@gmail.com', 'Uvijek ćeš biti naš svjetionik u tami.', true, true, NOW() - INTERVAL '15 hours');