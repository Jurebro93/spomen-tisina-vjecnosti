import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';

interface SEOData {
  meta_title: string;
  meta_description: string;
  page_path?: string;
}

export const useSEO = (pagePath: string) => {
  const [seoData, setSeoData] = useState<SEOData | null>(null);

  useEffect(() => {
    const fetchSEOData = async () => {
      try {
        // Exact path only (with and without trailing slash). Falling back to
        // the parent path gave every city without its own row the /umrli title
        // ("Umrli | Pretraživanje osmrtnica"), overriding the page's own title.
        const normalize = (p: string) => (p.endsWith('/') && p !== '/' ? p.slice(0, -1) : p);
        const normalized = normalize(pagePath);
        const altNormalized = normalized === pagePath ? `${pagePath}/` : normalized;
        const candidates = Array.from(new Set([normalized, altNormalized]));

        const { data, error } = await supabase
          .from('on_page_seo')
          .select('page_path, meta_title, meta_description')
          .in('page_path', candidates as string[]);

        if (error) {
          console.error('Error fetching SEO data:', error);
        }

        if (!data || data.length === 0) {
          setSeoData(null);
          return;
        }

        // Pick the best match based on candidates precedence
        const best = candidates
          .map((p) => data.find((row: any) => row.page_path === p))
          .find((row) => !!row) as SEOData | undefined;

        if (!best) {
          setSeoData(null);
          return;
        }

        setSeoData(best);
      } catch (error) {
        console.error('Error fetching SEO data:', error);
      }
    };

    fetchSEOData();
  }, [pagePath]);

  return seoData;
};

export const SEOHelmet = ({ pagePath }: { pagePath: string }) => {
  const seoData = useSEO(pagePath);
  console.debug('SEOHelmet render', { pagePath, seoData });

  // Bez podataka iz baze i dalje postavljamo self-referencing canonical,
  // kako svaka stranica ne bi naslijedila canonical naslovnice.
  if (!seoData) {
    return (
      <Helmet key={`fallback-${pagePath}`}>
        <link rel="canonical" href={`https://osmrtnica.com.hr${pagePath}`} />
      </Helmet>
    );
  }

  return (
    <Helmet key={pagePath}>
      <title>{seoData.meta_title}</title>
      <meta name="description" content={seoData.meta_description} />
      <link rel="canonical" href={`https://osmrtnica.com.hr${pagePath}`} />
      <link rel="icon" type="image/png" href="/logo-osmrtnica.png" />
      
      {/* Open Graph tags */}
      <meta property="og:title" content={seoData.meta_title} />
      <meta property="og:description" content={seoData.meta_description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={`https://osmrtnica.com.hr${pagePath}`} />
      <meta property="og:image" content="https://osmrtnica.com.hr/wp-content/uploads/2022/12/Logo-Osmrtnica.com_.hr_-300x300.png" />
    </Helmet>
  );
};