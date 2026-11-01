// Blog clusters: /blog/znacenje-imena/:slug and /blog/sanjarica/:slug.

export const NAMES_HUB = '/blog/znacenje-imena';
export const DREAMS_HUB = '/blog/sanjarica';

export interface Imendan {
  d: string; // MM-DD
  s?: string; // saint / feast, e.g. "sv. Josip"
}

export interface NameStats {
  count: number;
  avg_age: number | null;
  max_age: number | null;
  decades: { decade: number; c: number }[];
  cities: string[];
  updated?: string;
}

export interface QA {
  q: string;
  a: string;
}

export interface NamePage {
  slug: string;
  name: string;
  gender: string;
  origin: string | null;
  meaning: string | null;
  vocative: string | null;
  imendani: Imendan[];
  intro: string | null;
  history: string | null;
  character: string | null;
  variants: string[];
  opposite_form: string | null;
  foreign_forms: string | null;
  famous: string[];
  faq: QA[];
  stats: NameStats | null;
  published_at: string | null;
  updated_at: string | null;
}

export interface DreamSection {
  h: string;
  p: string;
}

export interface DreamToolOption {
  label: string;
  text: string;
}

export interface DreamPage {
  slug: string;
  topic: string;
  title: string;
  category: string;
  intro: string | null;
  psych: string | null;
  folk: string | null;
  feeling: string | null;
  sections: DreamSection[];
  tool: DreamToolOption[];
  faq: QA[];
  related: string[];
  memorial_cta: boolean;
  published_at: string | null;
  updated_at: string | null;
}

export interface NameListItem {
  slug: string;
  name: string;
  gender: string;
  imendani: Imendan[];
}

export interface DreamListItem {
  slug: string;
  topic: string;
  category: string;
}

// Content is static JSON in public/data (one file per page plus an index per
// cluster), so a new batch goes live with the deploy that adds its files.
const cache = new Map<string, Promise<unknown>>();
function getJson<T>(url: string): Promise<T | null> {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    );
  }
  return cache.get(url) as Promise<T | null>;
}

const NAMES_DATA = '/data/imena';
const DREAMS_DATA = '/data/sanjarica';
const safeSlug = (slug: string) => /^[a-z0-9-]+$/.test(slug);

export const fetchNameList = async () => (await getJson<NameListItem[]>(`${NAMES_DATA}/index.json`)) ?? [];
export const fetchDreamList = async () => (await getJson<DreamListItem[]>(`${DREAMS_DATA}/index.json`)) ?? [];

export const fetchNamePage = (slug: string) => (safeSlug(slug) ? getJson<NamePage>(`${NAMES_DATA}/${slug}.json`) : Promise.resolve(null));
export const fetchDreamPage = (slug: string) => (safeSlug(slug) ? getJson<DreamPage>(`${DREAMS_DATA}/${slug}.json`) : Promise.resolve(null));

export async function fetchDreamsBySlugs(slugs: string[]): Promise<DreamListItem[]> {
  const list = await fetchDreamList();
  return slugs.map((s) => list.find((d) => d.slug === s)).filter(Boolean) as DreamListItem[];
}

export async function fetchDreamsInCategory(category: string, exclude: string, limit = 8): Promise<DreamListItem[]> {
  return (await fetchDreamList()).filter((d) => d.category === category && d.slug !== exclude).slice(0, limit);
}

export async function fetchNamesBySlugs(slugs: string[]): Promise<NameListItem[]> {
  const list = await fetchNameList();
  return slugs.map((s) => list.find((n) => n.slug === s)).filter(Boolean) as NameListItem[];
}

export async function fetchNamesOnDay(day: string, exclude = ''): Promise<NameListItem[]> {
  return (await fetchNameList()).filter((n) => n.slug !== exclude && n.imendani.some((i) => i.d === day)).slice(0, 12);
}

export const MONTHS_GEN = ['siječnja', 'veljače', 'ožujka', 'travnja', 'svibnja', 'lipnja', 'srpnja', 'kolovoza', 'rujna', 'listopada', 'studenoga', 'prosinca'];

/** "03-19" -> "19. ožujka" */
export const formatImendan = (md: string) => {
  const [m, d] = md.split('-').map(Number);
  if (!m || !d) return md;
  return `${d}. ${MONTHS_GEN[m - 1]}`;
};

export const todayMd = (date = new Date()) =>
  `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Next occurrence of MM-DD from now. */
export const nextOccurrence = (md: string, now = new Date()) => {
  const [m, d] = md.split('-').map(Number);
  let t = new Date(now.getFullYear(), m - 1, d);
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (t < startToday) t = new Date(now.getFullYear() + 1, m - 1, d);
  return t;
};

export const firstLetter = (s: string) => {
  const two = s.slice(0, 2).toUpperCase();
  if (two === 'DŽ' || two === 'LJ' || two === 'NJ') return two;
  return s.charAt(0).toUpperCase();
};

export const sortHr = (a: string, b: string) => a.localeCompare(b, 'hr');

/** Name-day wishes with the name in the vocative ("Josipe"). */
export function nameDayWishes(name: string, vocative: string | null, gender: string): string[] {
  const v = vocative || name;
  const f = gender === 'žensko';
  return [
    `Sretan imendan, ${f ? 'draga' : 'dragi'} ${v}! Neka te tvoj nebeski zaštitnik čuva i vodi kroz svaki dan.`,
    `Sve najljepše za imendan, ${v}! Puno zdravlja, mira i obiteljske topline. 🎉`,
    `${v}, sretan imendan! Neka ti ova godina donese sve ono čemu se nadaš.`,
    `Neka ti je sretan i blagoslovljen imendan, ${v}. Uz tebe je svaki dan ljepši.`,
    `${f ? 'Najdraža' : 'Najdraži'} ${v}, od srca ti čestitam imendan. Ostani ${f ? 'ovakva kakva jesi' : 'ovakav kakav jesi'}! ❤️`,
    `Sretan imendan, ${v}! Neka te prati sreća, a briga zaobilazi u širokom luku.`,
    `${f ? 'Draga' : 'Dragi'} ${v}, hvala ti na svemu što jesi. Sretan imendan!`,
    `Čestitam imendan, ${v}! Puno osmijeha, dobrih ljudi i lijepih trenutaka.`,
  ];
}
