// Croatian wording helpers: numbers take different noun forms
// (1 godina, 2–4 godine, 5+ godina; 21 godina, 22 godine, 12–14 godina).

/** Picks the noun form for a count: one ("sat"), few ("sata"), many ("sati"). */
export const hrPlural = (n: number, one: string, few: string, many: string): string => {
  const abs = Math.abs(Math.trunc(n));
  const lastTwo = abs % 100;
  const last = abs % 10;
  if (last === 1 && lastTwo !== 11) return one;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return few;
  return many;
};

/** "80 godina", "63 godine", "81 godina". */
export const ageLabel = (age: number | string): string => {
  const n = Number(age);
  return Number.isFinite(n) ? `${n} ${hrPlural(n, 'godina', 'godine', 'godina')}` : `${age}`;
};

/** "prije 4 sata", "prije 1 dan", "prije 3 tjedna". */
export const timeAgo = (dateString: string): string => {
  const diffInHours = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInHours < 1) return 'prije manje od sata';
  if (diffInHours < 24) return `prije ${diffInHours} ${hrPlural(diffInHours, 'sat', 'sata', 'sati')}`;
  if (diffInDays < 7) return `prije ${diffInDays} ${hrPlural(diffInDays, 'dan', 'dana', 'dana')}`;
  const weeks = Math.floor(diffInDays / 7);
  return `prije ${weeks} ${hrPlural(weeks, 'tjedan', 'tjedna', 'tjedana')}`;
};

/** "SLOBODAN LISIĆ" -> "Slobodan Lisić"; names already in mixed case stay as written. */
export const displayName = (name: string): string => {
  const trimmed = name.trim();
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  return trimmed.toLowerCase().replace(/(^|[\s\-–(])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
};

/**
 * The import splits the mourners on every comma, so "unučad Nidia, Marin, Ivona i Korina"
 * arrives as four lines. A line that starts with a capitalised name continues the previous one.
 */
export const mergeMourners = (lines: string[]): string[] =>
  lines
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<string[]>((out, line) => {
      if (out.length > 0 && /^\p{Lu}\p{Ll}/u.test(line)) out[out.length - 1] += `, ${line}`;
      else out.push(line);
      return out;
    }, []);
