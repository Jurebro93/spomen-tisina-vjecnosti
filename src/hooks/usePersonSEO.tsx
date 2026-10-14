import { Helmet } from 'react-helmet-async';
import { DEFAULT_OG_IMAGE, breadcrumbJsonLd } from '@/lib/seo';

interface PersonSEOProps {
  ime: string;
  prezime: string;
  datum_smrti?: string;
  mjesto_smrti?: string;
  datum_ukopa?: string;
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

export const PersonSEO = ({ ime, prezime, datum_smrti, mjesto_smrti, datum_ukopa, groblje, slug, meta_title, meta_description, fotografija_url }: PersonSEOProps) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('hr-HR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('hr-HR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Use meta data from database if available, otherwise generate default
  const title = meta_title || `${ime} ${prezime} - Osmrtnica | Osmrtnica.com.hr`;
  
  let description = meta_description;
  
  if (!description) {
    description = `Osmrtnica za ${ime} ${prezime}`;
    
    if (datum_smrti) {
      description += `, preminuo ${formatDate(datum_smrti)}`;
    }
    
    if (mjesto_smrti) {
      description += ` u ${mjesto_smrti}`;
    }
    
    if (datum_ukopa && groblje) {
      description += `. Sprovod ${formatDateTime(datum_ukopa)} na ${groblje}`;
    } else if (datum_ukopa) {
      description += `. Sprovod ${formatDateTime(datum_ukopa)}`;
    } else if (groblje) {
      description += `. Sprovod na ${groblje}`;
    }
    
    description += '. Zapali svijeću i ostavi sjećanje.';
  }

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
            ...(mjesto_smrti
              ? [{ name: `Umrli ${mjesto_smrti}`, path: `/umrli/${citySlug(mjesto_smrti)}` }]
              : []),
            { name: `${ime} ${prezime}`.trim() },
          ]),
        )}
      </script>
    </Helmet>
  );
};