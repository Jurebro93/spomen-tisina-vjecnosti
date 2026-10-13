export const SITE_URL = 'https://osmrtnica.com.hr';
export const SITE_NAME = 'Osmrtnica.com.hr';
export const SITE_LOGO = `${SITE_URL}/logo-osmrtnica.png`;
export const DEFAULT_OG_IMAGE =
  'https://osmrtnica.com.hr/wp-content/uploads/2022/12/Logo-Osmrtnica.com_.hr_-300x300.png';

export const absoluteUrl = (pathname: string) =>
  `${SITE_URL}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;

export interface Crumb {
  name: string;
  /** Path relative to the site root; omit for the current page. */
  path?: string;
}

/** BreadcrumbList JSON-LD matching the visible breadcrumb navigation. */
export const breadcrumbJsonLd = (crumbs: Crumb[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((crumb, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: crumb.name,
    ...(crumb.path ? { item: absoluteUrl(crumb.path) } : {}),
  })),
});

export const jsonLdString = (data: unknown) => JSON.stringify(data);
