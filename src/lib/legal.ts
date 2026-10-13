/** Current versions of legal documents. Older versions are kept in the `legal_documents` table. */
export const LEGAL_EFFECTIVE_DATE = '2026-10-03';
export const LEGAL_VERSIONS = {
  uvjeti: '2.0',
  privatnost: '2.0',
  kolacici: '2.0',
  pravila: '1.0',
  raskid: '1.0',
  prigovori: '1.0',
  kontakt: '1.0',
} as const;
export const TERMS_VERSION = `uvjeti-${LEGAL_VERSIONS.uvjeti}-${LEGAL_EFFECTIVE_DATE}`;

export const formatHrDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}. ${m}. ${y}.`;
};

export const OPEN_COOKIE_SETTINGS = 'osmrtnica:open-cookie-settings';
export const openCookieSettings = () => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS));
