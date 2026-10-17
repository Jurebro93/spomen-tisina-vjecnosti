// Snapshot of the URL and referrer the visitor arrived with, held in memory only.
// Visitors usually accept cookies a page or two after landing, when the ad's utm/fbclid
// parameters are no longer in the address bar; attribution reads this snapshot instead.
// Nothing is written to the device until consent is given.

const params = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);

export const landingParams = (): URLSearchParams => params;

export const landingReferrer = (): string => (typeof document === 'undefined' ? '' : document.referrer);

/** fbclid from the landing URL, or from the current URL as a fallback. */
export const landingFbclid = (): string | null => {
  const fromLanding = params.get('fbclid');
  if (fromLanding) return fromLanding;
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('fbclid');
};

/** Click time used for _fbc: when the visitor landed, not when they consented. */
export const LANDED_AT = Date.now();
