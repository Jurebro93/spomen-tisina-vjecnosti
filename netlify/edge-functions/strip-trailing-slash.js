// 301-redirects every URL ending in "/" (except the homepage) to the same URL
// without it, so Google sees one address per page (/umrli/zadar, not also
// /umrli/zadar/). Canonical tags already point at the no-slash form.
//
// City pages also have one address only: /umrli/metković, /umrli/Zadar and
// /umrli/slavonski%20brod go to /umrli/metkovic, /umrli/zadar and
// /umrli/slavonski-brod (same slug as src/lib/cityMatch.ts citySlug).
//
// The old WordPress on Totohost (/wp/, proxied in _redirects) is left alone:
// WordPress adds the slash back (/wp/ and /wp/wp-admin/), so stripping it
// here sent browsers round in an endless redirect loop. Its folders get the
// slash here instead, because Apache's own redirect names the old server's
// host (Netlify's _redirects cannot add a slash: it matches both forms).

const WP_FOLDERS = new Set(['/wp', '/wp/wp-admin']);
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
  if (WP_FOLDERS.has(url.pathname)) {
    url.pathname += '/';
    return Response.redirect(url.toString(), 301);
  }
  if (url.pathname.startsWith('/wp/') || url.pathname.startsWith('/wp-content/')) return context.next();
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
