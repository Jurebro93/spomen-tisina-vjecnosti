// Crawlers that run JavaScript (e.g. Meta's meta-externalagent, which ignores robots.txt)
// would otherwise write fake steps into funnel_events / blog_events.
// navigator.webdriver is deliberately not checked: live tracking tests use Playwright.
const BOT_UA = /[a-z]bot\/|\bbot\b|crawler|spider|meta-externalagent|facebookexternalhit|facebookcatalog|lighthouse|prerender|bingpreview|embedly/i;

export function isBot(): boolean {
  try {
    return BOT_UA.test(navigator.userAgent || '');
  } catch { return false; }
}
