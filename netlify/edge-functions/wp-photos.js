// Obituary photos (~25,000) and old logos still live on the Totohost server
// under /wp/wp-content/uploads and /wp-content/uploads. A plain _redirects proxy
// was not cached by Netlify (every view went to Totohost: cache-status
// "fwd=miss"), so a page with 30+ photos sent 30+ requests to the old server at
// once. When it slowed down, Netlify gave up after ~10 s and the browser showed
// an empty frame instead of the photo (7. 11. 2026: 21 of 40 parallel requests
// failed with 500).
//
// This function fetches the photo once, retries a slow or failed fetch, and
// lets Netlify's CDN keep the file for a year, so Totohost is asked for each
// photo only once per CDN node. Failures are never cached.

const ORIGIN = 'http://mail.osmrtnica.com.hr';
const TIMEOUT_MS = 8000;

const fetchOnce = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal, headers: { 'user-agent': 'osmrtnica-netlify-photo-cache' } });
  } finally {
    clearTimeout(timer);
  }
};

export default async (request) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 });
  }
  const { pathname } = new URL(request.url);
  const target = ORIGIN + pathname;

  let response = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await fetchOnce(target);
      if (response.status < 500) break;
    } catch {
      response = null;
    }
  }

  if (!response) {
    return new Response('Photo temporarily unavailable', {
      status: 504,
      headers: { 'cache-control': 'no-store', 'netlify-cdn-cache-control': 'no-store' },
    });
  }

  const headers = new Headers();
  for (const name of ['content-type', 'content-length', 'last-modified', 'etag']) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  const type = response.headers.get('content-type') || '';
  if (response.status === 200 && !type.startsWith('text/html')) {
    // Photos never change under the same name.
    headers.set('cache-control', 'public, max-age=604800');
    headers.set('netlify-cdn-cache-control', 'public, durable, max-age=31536000, stale-while-revalidate=604800');
  } else if (response.status === 404) {
    headers.set('cache-control', 'public, max-age=3600');
    headers.set('netlify-cdn-cache-control', 'public, durable, max-age=3600');
  } else {
    headers.set('cache-control', 'no-store');
    headers.set('netlify-cdn-cache-control', 'no-store');
  }
  return new Response(request.method === 'HEAD' ? null : response.body, { status: response.status, headers });
};

export const config = {
  path: ['/wp/wp-content/uploads/*', '/wp-content/uploads/*'],
  cache: 'manual',
};
