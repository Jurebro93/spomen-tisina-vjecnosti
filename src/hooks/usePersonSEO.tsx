import { Helmet } from 'react-helmet-async';
import { DEFAULT_OG_IMAGE, breadcrumbJsonLd } from '@/lib/seo';
import { obituaryDescription, obituaryPlace, obituaryTitle } from '@/lib/obituaryMeta';

interface PersonSEOProps {
  ime: string;
  prezime: string;
  datum_rodenja?: string;
  datum_smrti?: string;
  mjesto_smrti?: string;
  datum_ukopa?: string;
  vrijeme_ukopa?: string;
  groblje?: string;
  slug?: string;
  meta_title?: string;
  meta_description?: string;
  fotografija_url?: string;
}

const citySlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[čć]/g, 'c')
    .replace(/ž/g, 'z')
    .replace(/š/g, 's')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const PersonSEO = ({ ime, prezime, datum_rodenja, datum_smrti, mjesto_smrti, datum_ukopa, vrijeme_ukopa, groblje, slug, meta_title, meta_description, fotografija_url }: PersonSEOProps) => {
  const title = obituaryTitle({ ime, prezime, datum_rodenja, datum_smrti, meta_title });
  const description = obituaryDescription({ ime, prezime, datum_rodenja, datum_smrti, mjesto_smrti, datum_ukopa, vrijeme_ukopa, groblje, meta_description });

  const place = obituaryPlace(mjesto_smrti);

  const canonicalUrl = slug 
    ? `https://osmrtnica.com.hr/${slug}`
    : `https://osmrtnica.com.hr/${ime.toLowerCase()}-${prezime.toLowerCase()}`;

  const shareImage = fotografija_url || DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      <link rel="icon" type="image/png" href="/logo-osmrtnica.png" />
      
      {/* Open Graph tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={shareImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={shareImage} />

      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: `${ime} ${prezime}`.trim(),
          birthDate: datum_rodenja || undefined,
          deathDate: datum_smrti || undefined,
          deathPlace: mjesto_smrti || undefined,
          image: fotografija_url || undefined,
          url: canonicalUrl,
        })}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(
          breadcrumbJsonLd([
            { name: 'Naslovnica', path: '/' },
            ...(place
              ? [{ name: `Umrli ${place}`, path: `/umrli/${citySlug(place)}` }]
              : []),
            { name: `${ime} ${prezime}`.trim() },
          ]),
        )}
      </script>
    </Helmet>
  );
};