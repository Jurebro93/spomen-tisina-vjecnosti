-- Update blog posts with actual content
UPDATE public.blogs 
SET content = CASE 
  WHEN slug = 'euharistija-kao-ocitanje-bozanske-slave-u-svakodnevnom-kruh-i-vinu' THEN 
    '<h2>Slava Gospodnja i simbolika oblačnog ognja</h2>
    <p>U knjizi Izlaska 24, slava Gospodnja se prikazuje kao "konzumirajuća vatra" na vrhu brda Sinaj. Obavijena oblakom, ova slava predstavlja Božju prisutnost koja je istovremeno dostupna i nedostižna, bliska i sveta.</p>
    
    <h3>Euharistija kao stvarnost Božje prisutnosti</h3>
    <p>Euharistija nastavlja ovu tradiciju Božje prisutnosti među narodom. Kroz preobličavanje kruha i vina, Krist postaje stvarno prisutan u našim životima, čineći sveto dostupnim u svakodnevnom.</p>
    
    <p>Ovaj sakrament predstavlja most između nebeskog i zemaljskog, omogućujući vjernicima da iskuse Božju slavu kroz jednostavne elemente kruha i vina.</p>
    
    <h3>Značaj za kršćanski život</h3>
    <p>Euharistija nije samo obredni čin, već je srce kršćanske duhovnosti. Ona nas poziva da prepoznamo sveto u svakodnevnom i da živimo u stalnoj svijesti o Božjoj prisutnosti.</p>
    
    <p>Kroz redovito sudjelovanje u euharistiji, vjernici se dublje ujedinjuju s Kristom i jedni s drugima, stvarajući zajednicu koja živi po vrijednostima Evanđelja.</p>'
    
  WHEN slug = 'isusova-uloga-u-osnivanju-crkve-perspektive-katolika-i-protestanata' THEN
    '<h2>Je li Isus osnovao Crkvu?</h2>
    <p>Pitanje koje se često postavlja jest je li Isus doista osnovao Crkvu kako tvrdi tradicija Katoličke crkve. Mnogi vjeruju da je Krist tijekom svog zemaljskog života postavio temelje za instituciju koja će nastaviti njegovo djelo.</p>
    
    <h3>Katolička perspektiva</h3>
    <p>Katolička Crkva uči da je Isus izravno osnovao Crkvu kad je rekao Petru: "Ti si Petar, i na ovoj stijeni sagradit ću svoju Crkvu" (Mt 16,18). Ova izjava se smatra temeljnim aktom osnivanja Crkve.</p>
    
    <h3>Protestantska gledišta</h3>
    <p>Mnogi protestanti vjeruju da je Crkva nastala prirodno kao zajednica vjernika, a ne kao formalna institucija. Oni naglašavaju duhovnu dimenziju Crkve kao "tijela Kristova".</p>
    
    <h3>Povijesni kontekst</h3>
    <p>Bez obzira na teološke razlike, svi kršćani se slažu da je Isus pozvao učenike da nastave njegovo djelo evangelizacije i služenja drugima. Crkva, u bilo kojem obliku, nastavlja ovu misiju kroz stoljeća.</p>'
    
  WHEN slug = 'petrova-kljucna-uloga-u-kristovoj-crkvi-otkrovenje-i-temelj-papinske-sukcesije' THEN
    '<h2>Isus kao Kralj i Petar kao "Stijena"</h2>
    <p>Jedna od najkontroverznijih i najzanimljivih priča u Bibliji odnosi se na način na koji je Isus prepoznao Simona Petra kao "stijenu" na kojoj će sagraditi svoju Crkvu.</p>
    
    <h3>Petrovo ispovjedanje vjere</h3>
    <p>Kad je Isus upitao učenike tko je on, Petar je odgovorio: "Ti si Krist, Sin Boga živoga" (Mt 16,16). Ovaj trenutak predstavlja ključno prepoznavanje Isusova identiteta.</p>
    
    <h3>Temelj papinske vlasti</h3>
    <p>Katolička tradicija vidi u Isusovim riječima Petru temelj papinske sukcesije. Rimski biskup se smatra Petrovim nasljednikom u vodstvu univerzalne Crkve.</p>
    
    <p>Ova doktrina ostaje predmet teoloških rasprava između različitih kršćanskih denominacija, ali svjedoči o važnosti apostolske sukcesije u crkvenom ustrojstvu.</p>'
    
  WHEN slug = 'simbolika-goruceg-grma-kao-predslika-utjelovljenja-krista' THEN
    '<h2>Simbolika Gorućeg Grma i Krista</h2>
    <p>U središtu priče o gorućem grmu iz Izlaska 3:1-6, gdje se Mojsiju predstavlja Božja prisutnost, vidimo kako se ova manifestacija može razumjeti kao predslika Kristova utjelovljenja.</p>
    
    <h3>Grm koji gori, a ne sagorieva</h3>
    <p>Grm koji gori, a pritom se ne troši, simbolizira Kristovu božansku i ljudsku narav. Kao što je grm ostao netaknut unatoč vatri, tako je Krist zadržao svoju božanstvenost unatoč utjelovljenju.</p>
    
    <h3>Sveta zemlja</h3>
    <p>Mojsiju je rečeno da skine sandale jer stoji na svetoj zemlji. Ovo nas podsjeća na poštovanje koje dugujemo Kristovoj prisutnosti u našim životima.</p>
    
    <p>Kroz ovu simboliku razumijevamo da je Bog uvijek prisutan među nama, ali na način koji poštuje našu slobodu i poziva nas na odgovor vjere.</p>'
    
  ELSE content
END,
image_url = CASE 
  WHEN slug = 'euharistija-kao-ocitanje-bozanske-slave-u-svakodnevnom-kruh-i-vinu' THEN 
    'https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=1200&h=600&fit=crop'
  WHEN slug = 'isusova-uloga-u-osnivanju-crkve-perspektive-katolika-i-protestanata' THEN
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&h=600&fit=crop'
  WHEN slug = 'petrova-kljucna-uloga-u-kristovoj-crkvi-otkrovenje-i-temelj-papinske-sukcesije' THEN
    'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=1200&h=600&fit=crop'
  WHEN slug = 'simbolika-goruceg-grma-kao-predslika-utjelovljenja-krista' THEN
    'https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=1200&h=600&fit=crop'
  ELSE image_url
END
WHERE slug IN (
  'euharistija-kao-ocitanje-bozanske-slave-u-svakodnevnom-kruh-i-vinu',
  'isusova-uloga-u-osnivanju-crkve-perspektive-katolika-i-protestanata', 
  'petrova-kljucna-uloga-u-kristovoj-crkvi-otkrovenje-i-temelj-papinske-sukcesije',
  'simbolika-goruceg-grma-kao-predslika-utjelovljenja-krista'
);