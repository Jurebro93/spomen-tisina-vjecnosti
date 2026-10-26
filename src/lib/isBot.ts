// Crawlers that run JavaScript (e.g. Meta's meta-externalagent, which ignores robots.txt)
// would otherwise write fake steps into funnel_events / blog_events.
// navigator.webdriver is deliberately not checked here: live tracking tests use Playwright.
const BOT_UA = /[a-z]bot\/|\bbot\b|crawler|spider|meta-externalagent|facebookexternalhit|facebookcatalog|lighthouse|prerender|bingpreview|embedly/i;

export function isBot(): boolean {
  try {
    return BOT_UA.test(navigator.userAgent || '');
  } catch { return false; }
}

/**
 * Playwright / Selenium sessions on the live hostname (site tests route osmrtnica.com.hr to a local
 * build) must not reach Meta: their Purchase / StartMemorial / CompleteRegistration bursts pollute
 * ad optimisation. A deliberate live Meta test opts in with localStorage osm_meta_test = '1'.
 */
export function isAutomatedBrowser(): boolean {
  try {
    if (!navigator.webdriver) return false;
    return localStorage.getItem('osm_meta_test') !== '1';
  } catch { return false; }
}
