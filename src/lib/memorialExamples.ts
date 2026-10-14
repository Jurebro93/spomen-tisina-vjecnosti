import type { Deceased, Memorial } from '@/lib/memorial';
import type { MediaItem } from '@/components/memorial/PhotoUploader';
import type { LifeEvent, PublicCandle, PublicTribute } from '@/components/memorial/MemorialContent';
const oliverPhoto = { url: "/site/oliver.png" };
const oliverGalleryTwo = { url: "/site/oliver-galerija-2.png" };
const oliverGalleryThree = { url: "/site/oliver-galerija-3.png" };
const dinoPhoto = { url: "/site/dino.png" };
const dinoGalleryTwo = { url: "/site/dino-galerija-2.png" };
const dinoGalleryThree = { url: "/site/dino-galerija-3.png" };
const massimoPhoto = { url: "/site/masimo.png" };
const massimoGalleryTwo = { url: "/site/massimo-galerija-2.png" };
const massimoGalleryThree = { url: "/site/massimo-galerija-3.png" };

export interface MemorialExample {
  slug: string;
  deceased: Deceased;
  memorial: Memorial;
  media: MediaItem[];
  events: LifeEvent[];
  tributes: PublicTribute[];
  candles: PublicCandle[];
  coverUrl: string;
}

const base = (id: string, quote: string, story: string): Memorial => ({
  id,
  deceased_id: id,
  slug: id,
  owner_id: 'primjer',
  relationship: 'obitelj',
  quote,
  life_story: story,
  visibility: 'public',
  status: 'published',
  allow_tributes: true,
  allow_candles: true,
  allow_media_download: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  published_at: '2024-01-01T00:00:00Z',
  archived_at: null,
});

const img = (memorial_id: string, i: number, url: string, title: string, cover = false): MediaItem => ({
  id: `${memorial_id}-img-${i}`,
  memorial_id,
  type: 'image',
  storage_path: url,
  external_url: null,
  title,
  description: null,
  media_date: null,
  sort_order: i,
  is_cover: cover,
});

const ev = (memorial_id: string, i: number, year: number, title: string, description: string): LifeEvent => ({
  id: `${memorial_id}-ev-${i}`,
  memorial_id,
  event_date: null,
  event_year: year,
  title,
  description,
  sort_order: i,
} as unknown as LifeEvent);

const tr = (
  memorial_id: string, i: number, author_name: string, relationship: string, title: string, message: string, created_at: string,
): PublicTribute => ({
  id: `${memorial_id}-tr-${i}`,
  author_name,
  relationship,
  title,
  message,
  photo_path: null,
  created_at,
});

const ca = (memorial_id: string, i: number, visitor_name: string, message: string, created_at: string): PublicCandle => ({
  id: `${memorial_id}-ca-${i}`,
  visitor_name,
  message,
  created_at,
});

const OLIVER_PHOTO = oliverPhoto.url;
const DINO_PHOTO = dinoPhoto.url;
const MASIMO_PHOTO = massimoPhoto.url;

export const MEMORIAL_EXAMPLES: MemorialExample[] = [
  {
    slug: 'oliver-dragojevic',
    coverUrl: OLIVER_PHOTO,
    deceased: {
      id: 'oliver-dragojevic',
      ime: 'Oliver',
      prezime: 'Dragojević',
      datum_rodenja: '1947-12-07',
      datum_smrti: '2018-07-29',
      mjesto_rodenja: 'Split',
      mjesto_smrti: 'Split',
      biografija: null,
      fotografija_url: OLIVER_PHOTO,
      groblje: 'Groblje Vela Luka, Vela Luka',
      profesija: 'Glazbenik, pjevač i skladatelj',
      podnaslov: 'Glas Jadrana i čovjek koji je pjevao more',
      slug: null,
    },
    memorial: base(
      'oliver-dragojevic',
      'Moja pjesma je pjesma mora, sunca i ljubavi.',
      `<p>Oliver Dragojević rođen je 7. prosinca 1947. u Splitu, a djetinjstvo je proveo u Veloj Luci na otoku Korčuli — mjestu koje je zauvijek ostalo njegov dom i njegova inspiracija. Odrastao je uz more, uz mirise smokve i soli, uz pjesmu koja se u dalmatinskim mjestima pjeva na kantunima, bez pozornice i bez publike.</p>
<h2>Početci</h2>
<p>Glazbu je počeo učiti rano, u glazbenoj školi u Splitu. Već kao tinejdžer svirao je po klubovima i hotelima, a sredinom šezdesetih godina prvi put je nastupio na Splitskom festivalu. Ono što ga je izdvajalo nije bila samo boja glasa, nego način na koji je frazirao — kao da svaku rečenicu proživljava prvi put.</p>
<h2>Pjesme koje su postale naše</h2>
<p>S <em>Galebom i ja</em>, <em>Cesaricom</em>, <em>Skalinadom</em>, <em>Nadalinom</em> i <em>Vjeruj u ljubav</em> ušao je u domove i živote nekoliko generacija. Suradnja sa Zdenkom Runjićem, a kasnije s Goranom Bregovićem, Đelom Jusićem i Gibonnijem, stvorila je repertoar koji se danas pjeva na svadbama, ispraćajima i tihim večerima uz more.</p>
<blockquote>„Ja ne pivan da bi bija zvizda. Pivan zato jer ne znan drugačije.”</blockquote>
<h2>Čovjek izvan pozornice</h2>
<p>Unatoč slavi, Oliver je ostao skroman i vezan za svoj otok. Volio je ribolov, tišinu, obitelj i prijatelje s kojima je znao provesti cijelo poslijepodne uz kavu. Sa suprugom Vesnom proveo je više od četrdeset godina; njihova tri sina odrasla su daleko od reflektora, upravo onako kako je on to želio.</p>
<h2>Oproštaj</h2>
<p>Preminuo je 29. srpnja 2018. u Splitu. Na posljednjem ispraćaju u Veloj Luci okupilo se više desetaka tisuća ljudi, a brodovi su ga pozdravili sirenama. Bio je to oproštaj kakav Hrvatska rijetko pamti — tih, dostojanstven i pun pjesme.</p>
<p>Ovaj memorijal čuva njegove pjesme, fotografije i sjećanja svih koji su uz njegov glas odrastali, voljeli i opraštali se.</p>`,
    ),
    media: [
      img('oliver-dragojevic', 0, OLIVER_PHOTO, 'Oliver na pozornici', true),
      img('oliver-dragojevic', 1, oliverGalleryTwo.url, 'Oliver na pozornici'),
      img('oliver-dragojevic', 2, oliverGalleryThree.url, 'Oliver Dragojević'),
    ],
    events: [
      ev('oliver-dragojevic', 0, 1947, 'Rođen u Splitu', 'Djetinjstvo provodi u Veloj Luci na Korčuli, mjestu koje ostaje njegov dom cijeloga života.'),
      ev('oliver-dragojevic', 1, 1961, 'Prvi nastupi', 'Kao dječak svira klavir i harmoniku te nastupa s lokalnim sastavima po Dalmaciji.'),
      ev('oliver-dragojevic', 2, 1974, 'Susret sa Zdenkom Runjićem', 'Počinje suradnja koja će obilježiti hrvatsku glazbu i donijeti desetke bezvremenskih pjesama.'),
      ev('oliver-dragojevic', 3, 1980, '„Galeb i ja”', 'Pjesma postaje njegov zaštitni znak i jedna od najizvođenijih hrvatskih pjesama svih vremena.'),
      ev('oliver-dragojevic', 4, 2005, 'Koncert u Sydney Opera House', 'Nastup pred publikom iz dijaspore koji je mnogima ostao najdraža uspomena.'),
      ev('oliver-dragojevic', 5, 2018, 'Posljednji ispraćaj u Veloj Luci', 'Ispratile su ga desetke tisuća ljudi, brodovi sirenama, a mjesto pjesmom.'),
    ],
    tributes: [
      tr('oliver-dragojevic', 0, 'Ivana Marić', 'obožavateljica', 'Uz vaš glas smo odrastali', 'Svako ljeto na terasi kod bake slušali smo „Cesaricu”. Danas je puštam svojoj djeci i objasnim im tko je bio Oliver. Hvala vam na svemu.', '2024-05-12T10:00:00Z'),
      tr('oliver-dragojevic', 1, 'Ante Bulić', 'prijatelj iz Vele Luke', 'Naš čovik', 'Nikad se nije pravio važan. Uvik je stao popričat na rivi, pitat kako je doma. To se ne zaboravlja.', '2024-04-02T18:30:00Z'),
      tr('oliver-dragojevic', 2, 'Marina Kovačević', 'obožavateljica', 'Pjesma za oproštaj', 'Na ispraćaju moga oca pjevala se „Skalinada”. Vaša glazba nas je nosila i u najtežim danima.', '2024-03-21T08:15:00Z'),
    ],
    candles: [
      ca('oliver-dragojevic', 0, 'Petra', 'Počivajte u miru, maestro.', '2024-06-01T09:00:00Z'),
      ca('oliver-dragojevic', 1, 'Josip', 'Hvala za svaku notu.', '2024-05-30T21:00:00Z'),
      ca('oliver-dragojevic', 2, 'Obitelj Perić', 'Vaše pjesme su dio naše obitelji.', '2024-05-28T12:40:00Z'),
      ca('oliver-dragojevic', 3, 'Ana', null, '2024-05-20T16:10:00Z'),
    ],
  },
  {
    slug: 'dino-dvornik',
    coverUrl: DINO_PHOTO,
    deceased: {
      id: 'dino-dvornik',
      ime: 'Dino',
      prezime: 'Dvornik',
      datum_rodenja: '1964-08-20',
      datum_smrti: '2008-09-07',
      mjesto_rodenja: 'Split',
      mjesto_smrti: 'Zagreb',
      biografija: null,
      fotografija_url: DINO_PHOTO,
      groblje: 'Groblje Lovrinac, Split',
      profesija: 'Glazbenik i producent',
      podnaslov: 'Kralj hrvatskog funka',
      slug: null,
    },
    memorial: base(
      'dino-dvornik',
      'Ti si mi u mislima, ostala si mi u snovima.',
      `<p>Dino Dvornik rođen je 20. kolovoza 1964. u Splitu, u obitelji glumca Borisa Dvornika i Ksenije Prohaska. Odrastao je okružen umjetnošću, ali je vrlo rano pronašao vlastiti jezik — funk, ritam i zvuk koji do tada u Hrvatskoj gotovo nitko nije radio ozbiljno.</p>
<h2>Zvuk koji nitko nije očekivao</h2>
<p>Krajem osamdesetih izlazi njegov prvi album koji donosi <em>Tebi pripadam</em> i <em>Zašto praviš slona od mene</em>. Publika je dobila nešto potpuno novo: hrvatski funk s produkcijom koja je zvučala svjetski, i izvođača koji je na pozornici bio nepredvidiv, duhovit i potpuno svoj.</p>
<h2>Vrhunac i eksperimenti</h2>
<p>Devedesetih objavljuje albume koji ga učvršćuju kao jednog od najoriginalnijih domaćih autora. <em>Ništa kontra Splita</em> postaje himna njegovom gradu, a on sam sve više ulazi u produkciju, elektroniku i suradnje s mlađim autorima.</p>
<blockquote>„Ja se ne bavim glazbom. Ja živim s njom.”</blockquote>
<h2>Otac i obitelj</h2>
<p>Sa suprugom Danijelom imao je kćer Ellu, kojoj je posvetio neke od svojih najnježnijih pjesama. Prijatelji ga pamte kao osobu ogromne topline, koja se znala smijati sebi i koja je uvijek bila prva kad je nekome trebala pomoć.</p>
<h2>Odlazak</h2>
<p>Preminuo je 7. rujna 2008. u Zagrebu, u 45. godini. Pokopan je na splitskom groblju Lovrinac. Njegova glazba i danas zvuči modernije od mnogih novih izdanja, a svaka nova generacija otkriva ga iznova.</p>`,
    ),
    media: [
      img('dino-dvornik', 0, DINO_PHOTO, 'Dino Dvornik', true),
      img('dino-dvornik', 1, dinoGalleryTwo.url, 'Dino Dvornik', false),
      img('dino-dvornik', 2, dinoGalleryThree.url, 'Dino Dvornik', false),
    ],
    events: [
      ev('dino-dvornik', 0, 1964, 'Rođen u Splitu', 'Sin glumca Borisa Dvornika, odrasta okružen kazalištem, filmom i glazbom.'),
      ev('dino-dvornik', 1, 1985, 'Prvi bendovi', 'Svira u splitskim sastavima i otkriva funk, soul i disco koji će odrediti njegov zvuk.'),
      ev('dino-dvornik', 2, 1989, 'Debitantski album', '„Tebi pripadam” postaje hit i donosi mu status najsvježijeg glasa domaće scene.'),
      ev('dino-dvornik', 3, 1993, '„Ništa kontra Splita”', 'Pjesma prerasta u neslužbenu himnu grada koji je volio.'),
      ev('dino-dvornik', 4, 1998, 'Rođenje kćeri Elle', 'Obiteljski život postaje njegova najveća inspiracija.'),
      ev('dino-dvornik', 5, 2008, 'Posljednji ispraćaj na Lovrincu', 'Split se oprostio od svog najoriginalnijeg glazbenika.'),
    ],
    tributes: [
      tr('dino-dvornik', 0, 'Marko Šarić', 'obožavatelj', 'Uvijek ispred svog vremena', 'Slušam njegove albume 30 godina i još uvijek zvuče kao da su snimljeni jučer. Nitko ga nije stigao.', '2024-04-18T14:20:00Z'),
      tr('dino-dvornik', 1, 'Lucija Barišić', 'obožavateljica', 'Hvala na energiji', 'Kad mi je teško, pustim „Afrika” i sve je lakše. To je Dino — smijeh, ritam i sloboda.', '2024-03-11T19:05:00Z'),
      tr('dino-dvornik', 2, 'Tomislav Jurić', 'kolega glazbenik', 'Prvi koji nam je otvorio vrata', 'Bez njega ne bi bilo domaćeg funka. Naučio nas je da se ne moramo ispričavati što smo drugačiji.', '2024-02-27T11:45:00Z'),
    ],
    candles: [
      ca('dino-dvornik', 0, 'Ella F.', 'Nedostaješ.', '2024-06-02T20:00:00Z'),
      ca('dino-dvornik', 1, 'Ivan', 'Legenda zauvijek.', '2024-05-19T13:00:00Z'),
      ca('dino-dvornik', 2, 'Sanja', 'Svaki 7. rujna zapalim svijeću.', '2024-05-05T07:30:00Z'),
    ],
  },
  {
    slug: 'masimo-savic',
    coverUrl: MASIMO_PHOTO,
    deceased: {
      id: 'masimo-savic',
      ime: 'Massimo',
      prezime: 'Savić',
      datum_rodenja: '1962-01-16',
      datum_smrti: '2022-12-05',
      mjesto_rodenja: 'Pula',
      mjesto_smrti: 'Zagreb',
      biografija: null,
      fotografija_url: MASIMO_PHOTO,
      groblje: 'Gradsko groblje Zadar, Zadar',
      profesija: 'Pjevač i skladatelj',
      podnaslov: 'Glas koji je pjevao o ljubavi i prolaznosti',
      slug: null,
    },
    memorial: base(
      'masimo-savic',
      'Ljubav se ne troši, ljubav se dijeli.',
      `<p>Massimo Savić rođen je 16. siječnja 1962. u Puli. Odrastao je u Istri, u gradu u kojem se miješaju jezici, mora i utjecaji — što se kasnije čulo u svakoj njegovoj pjesmi.</p>
<h2>Dorian Gray</h2>
<p>Osamdesetih postaje pjevač grupe Dorian Gray, jednog od najprepoznatljivijih sastava tadašnje scene. Pjesme poput <em>Sjaj u tami</em> i <em>Ana</em> definirale su zvuk generacije.</p>
<h2>Samostalni put</h2>
<p>Nakon raspada benda gradi solo karijeru u kojoj se okreće suptilnijim, zrelijim aranžmanima. <em>Vodi me</em>, <em>Zvijezda</em> i <em>Iz jednog pogleda</em> pokazale su izvođača koji ne juri za trendovima, nego traži emociju.</p>
<blockquote>„Pjesma mora imati istinu. Sve ostalo je ukras.”</blockquote>
<h2>Učitelj i mentor</h2>
<p>Posljednjih godina života mnogo je radio s mladim pjevačima, prenosio znanje i inzistirao na poštenju u glazbi. Bio je poznat po dobrom humoru, otvorenosti i beskrajnoj ljubavi prema moru i Zadru, gradu u kojem je pronašao mir.</p>
<h2>Oproštaj</h2>
<p>Preminuo je 5. prosinca 2022. u Zagrebu. Ispraćen je u Zadru, uz pjesmu i tišinu ljudi koji su ga voljeli. Ostavio je opus koji se ne sluša usput — nego pažljivo, kao pismo.</p>`,
    ),
    media: [
      img('masimo-savic', 0, MASIMO_PHOTO, 'Massimo Savić', true),
      img('masimo-savic', 1, massimoGalleryTwo.url, 'Massimo Savić na pozornici'),
      img('masimo-savic', 2, massimoGalleryThree.url, 'Massimo Savić na koncertu'),
    ],
    events: [
      ev('masimo-savic', 0, 1962, 'Rođen u Puli', 'Odrasta u Istri, uz more i miješanje kultura koje će obilježiti njegov izraz.'),
      ev('masimo-savic', 1, 1983, 'Dorian Gray', 'Postaje pjevač sastava koji ubrzo osvaja scenu bivše države.'),
      ev('masimo-savic', 2, 1990, 'Početak solo karijere', 'Kreće samostalnim putem, tražeći zreliji i osobniji zvuk.'),
      ev('masimo-savic', 3, 2005, '„Vodi me”', 'Jedna od njegovih najvoljenijih pjesama i stalni dio koncertnog repertoara.'),
      ev('masimo-savic', 4, 2018, 'Mentor mladim glazbenicima', 'Radi s novim generacijama pjevača i zagovara iskrenost u glazbi.'),
      ev('masimo-savic', 5, 2022, 'Posljednji ispraćaj u Zadru', 'Grad koji je volio ispratio ga je pjesmom i tišinom.'),
    ],
    tributes: [
      tr('masimo-savic', 0, 'Nikolina Vuković', 'obožavateljica', 'Glas koji smiruje', 'Kad god mi je bilo teško, pustila bih „Vodi me”. Hvala što ste bili tu i kad niste znali.', '2024-05-02T17:00:00Z'),
      tr('masimo-savic', 1, 'Damir Lovrić', 'kolega', 'Profesionalac i gospodin', 'Nikad nije pristao na prečac. Uvijek proba, uvijek priprema, uvijek maksimum.', '2024-04-14T09:25:00Z'),
      tr('masimo-savic', 2, 'Obitelj Radić', 'obitelj prijatelja', 'Zadar vas pamti', 'Vaše koncerte na rivi nikada nećemo zaboraviti.', '2024-03-30T20:10:00Z'),
    ],
    candles: [
      ca('masimo-savic', 0, 'Vedrana', 'Mir i svjetlo.', '2024-06-03T10:00:00Z'),
      ca('masimo-savic', 1, 'Ivo', 'Hvala na pjesmama.', '2024-05-25T22:15:00Z'),
      ca('masimo-savic', 2, 'Kristina', 'Zauvijek u srcu.', '2024-05-11T14:45:00Z'),
    ],
  },
];

export const getMemorialExample = (slug?: string) =>
  MEMORIAL_EXAMPLES.find((e) => e.slug === slug) ?? null;
