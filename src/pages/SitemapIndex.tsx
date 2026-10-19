import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { citySlug } from '@/lib/cityMatch';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

const SitemapIndex = () => {
  const [sitemapUrls, setSitemapUrls] = useState<SitemapUrl[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateSitemap();
  }, []);

  const generateSitemap = async () => {
    try {
      const urls: SitemapUrl[] = [];
      const baseUrl = 'https://osmrtnica.com.hr';
      const today = new Date().toISOString().split('T')[0];

      // Static pages
      const staticPages = [
        { path: '/', priority: '1.0', changefreq: 'daily' },
        { path: '/blog', priority: '0.9', changefreq: 'daily' },
        { path: '/memorijalni-vrt', priority: '0.8', changefreq: 'weekly' },
        { path: '/virtualne-svijece', priority: '0.8', changefreq: 'daily' },
        { path: '/zapali-svijecu', priority: '0.7', changefreq: 'monthly' },
        { path: '/objavi-osmrtnicu', priority: '0.9', changefreq: 'monthly' },
        { path: '/informacije', priority: '0.6', changefreq: 'monthly' },
        { path: '/kako-objaviti-osmrtnicu', priority: '0.6', changefreq: 'monthly' },
        { path: '/cesto-postavljena-pitanja', priority: '0.5', changefreq: 'monthly' },
        { path: '/uvjeti-koristenja', priority: '0.3', changefreq: 'yearly' },
        { path: '/politika-privatnosti', priority: '0.3', changefreq: 'yearly' },
        { path: '/kolacici', priority: '0.3', changefreq: 'yearly' },
      ];

      staticPages.forEach(page => {
        urls.push({
          loc: `${baseUrl}${page.path}`,
          lastmod: today,
          changefreq: page.changefreq,
          priority: page.priority
        });
      });

      // Fetch blog posts
      const { data: blogs, error: blogsError } = await supabase
        .from('blogs')
        .select('slug, updated_at')
        .order('updated_at', { ascending: false });

      if (!blogsError && blogs) {
        blogs.forEach(blog => {
          urls.push({
            loc: `${baseUrl}/blog/${blog.slug}`,
            lastmod: blog.updated_at ? new Date(blog.updated_at).toISOString().split('T')[0] : today,
            changefreq: 'weekly',
            priority: '0.7'
          });
        });
      }

      // Fetch obituaries
      const { data: obituaries, error: obituariesError } = await supabase
        .from('obituaries')
        .select('slug, updated_at')
        .eq('active', true)
        .order('updated_at', { ascending: false });

      if (!obituariesError && obituaries) {
        obituaries.forEach(obituary => {
          urls.push({
            loc: `${baseUrl}/${obituary.slug}`,
            lastmod: obituary.updated_at ? new Date(obituary.updated_at).toISOString().split('T')[0] : today,
            changefreq: 'monthly',
            priority: '0.1'
          });
        });
      }

      // Fetch cities for umrli pages
      const { data: umrliData, error: umrliError } = await supabase
        .from('obituaries')
        .select('mjesto_smrti')
        .not('mjesto_smrti', 'is', null)
        .neq('mjesto_smrti', '');

      if (!umrliError && umrliData) {
        const cities = [...new Set(umrliData.map(item => item.mjesto_smrti))];
        cities.forEach(city => {
          if (city) {
            urls.push({
              loc: `${baseUrl}/umrli/${citySlug(city)}`,
              lastmod: today,
              changefreq: 'weekly',
              priority: '0.8'
            });
          }
        });
      }

      // Fetch cities for sprovodi pages
      const { data: sprovodiData, error: sprovodiError } = await supabase
        .from('sprovodi')
        .select('grad')
        .not('grad', 'is', null)
        .neq('grad', '');

      if (!sprovodiError && sprovodiData) {
        const cities = [...new Set(sprovodiData.map(item => item.grad))];
        cities.forEach(city => {
          if (city) {
            urls.push({
              loc: `${baseUrl}/sprovodi/${citySlug(city)}`,
              lastmod: today,
              changefreq: 'weekly',
              priority: '0.8'
            });
          }
        });
      }

      // Fetch pogrebna poduzeća
      const { data: pogrebnaData, error: pogrebnaError } = await supabase
        .from('pogrebna_poduzeca')
        .select('slug, updated_at')
        .eq('dostupno', true)
        .order('updated_at', { ascending: false });

      if (!pogrebnaError && pogrebnaData) {
        pogrebnaData.forEach(poduzece => {
          urls.push({
            loc: `${baseUrl}/pogrebno-poduzece/${poduzece.slug}`,
            lastmod: poduzece.updated_at ? new Date(poduzece.updated_at).toISOString().split('T')[0] : today,
            changefreq: 'monthly',
            priority: '0.3'
          });
        });
      }

      // Fetch groblja
      const { data: grobljaData, error: grobljaError } = await supabase
        .from('groblja')
        .select('slug, updated_at')
        .order('updated_at', { ascending: false });

      if (!grobljaError && grobljaData) {
        grobljaData.forEach(groblje => {
          urls.push({
            loc: `${baseUrl}/groblje/${groblje.slug}`,
            lastmod: groblje.updated_at ? new Date(groblje.updated_at).toISOString().split('T')[0] : today,
            changefreq: 'monthly',
            priority: '0.3'
          });
        });
      }

      setSitemapUrls(urls);
    } catch (error) {
      console.error('Error generating sitemap:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateXML = () => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    sitemapUrls.forEach(url => {
      xml += '  <url>\n';
      xml += `    <loc>${url.loc}</loc>\n`;
      if (url.lastmod) {
        xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
      }
      if (url.changefreq) {
        xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
      }
      if (url.priority) {
        xml += `    <priority>${url.priority}</priority>\n`;
      }
      xml += '  </url>\n';
    });
    
    xml += '</urlset>';
    return xml;
  };

  useEffect(() => {
    // Set content type for XML in the document head when component mounts
    const metaTag = document.createElement('meta');
    metaTag.httpEquiv = 'Content-Type';
    metaTag.content = 'application/xml; charset=utf-8';
    document.head.appendChild(metaTag);

    return () => {
      // Cleanup
      const existingMeta = document.querySelector('meta[http-equiv="Content-Type"]');
      if (existingMeta) {
        document.head.removeChild(existingMeta);
      }
    };
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'monospace'
      }}>
        Generating sitemap...
      </div>
    );
  }

  // Return XML as text content
  return (
    <pre 
      style={{ 
        fontFamily: 'monospace', 
        fontSize: '12px',
        margin: 0,
        padding: '20px',
        backgroundColor: '#f5f5f5',
        overflow: 'auto'
      }}
    >
      {generateXML()}
    </pre>
  );
};

export default SitemapIndex;