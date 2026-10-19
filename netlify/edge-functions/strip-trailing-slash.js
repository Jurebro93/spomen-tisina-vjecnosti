// 301-redirects every URL ending in "/" (except the homepage) to the same URL
// without it, so Google sees one address per page (/umrli/zadar, not also
// /umrli/zadar/). Canonical tags already point at the no-slash form.
//
// City pages also have one address only: /umrli/metković, /umrli/Zadar and
// /umrli/slavonski%20brod go to /umrli/metkovic, /umrli/zadar and
// /umrli/slavonski-brod (same slug as src/lib/cityMatch.ts citySlug).

const CITY_SECTIONS = new Set(['umrli', 'sprovodi', 'groblja']);
const FOLD = { č: 'c', ć: 'c', ž: 'z', š: 's', đ: 'd' };

const citySlug = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[čćžšđ]/g, (ch) => FOLD[ch])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export default async (request, context) => {
  const url = new URL(request.url);
  let path = url.pathname;
  if (path.length > 1 && path.endsWith('/')) path = path.replace(/\/+$/, '') || '/';

  const parts = path.split('/').filter(Boolean);
  if (parts.length === 2 && CITY_SECTIONS.has(parts[0])) {
    let city = parts[1];
    try {
      city = decodeURIComponent(city);
    } catch {
      // leave malformed escapes as they are
    }
    const slug = citySlug(city);
    if (slug && slug !== parts[1]) path = `/${parts[0]}/${slug}`;
  }

  if (path !== url.pathname) {
    url.pathname = path;
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
};

export const config = { path: '/*' };
