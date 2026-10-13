import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = "https://umpvnepxsqfkxjpclkxc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtcHZuZXB4c3Fma3hqcGNsa3hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzMyMDAsImV4cCI6MjA2ODI0OTIwMH0.iZhnC1FpAMzXujBvAwqTGhXBnNknMk_96TRNsNv77uQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const generateHTMLTemplate = (seoData, pagePath) => {
  const canonicalUrl = `https://osmrtnica.com.hr${pagePath}`;
  
  return `<!DOCTYPE html>
<html lang="hr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <!-- Consent defaults (before GTM): non-essential storage denied until the visitor chooses -->
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
(function(){var a=false,m=false;try{var c=JSON.parse(localStorage.getItem('cookieConsentCategories')||'null');if(c&&Date.now()-new Date(c.decidedAt).getTime()<31536000000){a=!!c.analytics;m=!!c.marketing;}}catch(e){}
gtag('consent','default',{analytics_storage:a?'granted':'denied',ad_storage:m?'granted':'denied',ad_user_data:m?'granted':'denied',ad_personalization:m?'granted':'denied',wait_for_update:500});})();</script>
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-5PP7H63W');</script>
    <!-- End Google Tag Manager -->
    <title>${seoData.meta_title}</title>
    <meta name="description" content="${seoData.meta_description}" />
    
    <meta name="author" content="Osmrtnica.com.hr" />
    <link rel="icon" href="/src/assets/logo-osmrtnica.png" type="image/png" />
    <link rel="apple-touch-icon" href="/src/assets/logo-osmrtnica.png" />
    <link rel="canonical" href="${canonicalUrl}" />
    
    <!-- Preload critical resources -->
    <link rel="preload" href="/assets/croatian-cemetery-hero.jpg" as="image" type="image/jpeg" />
    
    <!-- Enable text compression and caching -->
    <meta http-equiv="Cache-Control" content="public, max-age=31536000" />

    <!-- Open Graph tags -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:title" content="${seoData.meta_title}" />
    <meta property="og:description" content="${seoData.meta_description}" />
    <meta property="og:image" content="https://osmrtnica.com.hr/wp-content/uploads/2022/12/Logo-Osmrtnica.com_.hr_-300x300.png" />

    <script type="module" crossorigin src="/assets/index.js"></script>
    <link rel="modulepreload" crossorigin href="/assets/vendor.js">
    <link rel="modulepreload" crossorigin href="/assets/ui.js">
    <link rel="modulepreload" crossorigin href="/assets/router.js">
    <link rel="stylesheet" crossorigin href="/assets/index.css">
  </head>

  <body>
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-5PP7H63W"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->
    <div id="root"></div>
  </body>
</html>`;
};

async function generateSEOTemplates() {
  console.log('Fetching SEO data from Supabase...');
  
  const { data: seoData, error } = await supabase
    .from('on_page_seo')
    .select('page_path, meta_title, meta_description');

  if (error) {
    console.error('Error fetching SEO data:', error);
    return;
  }

  console.log(`Found ${seoData.length} SEO entries`);

  const publicDir = path.join(__dirname, '..', 'public');

  for (const seo of seoData) {
    // Skip root and dynamic patterns
    if (seo.page_path === '/' || seo.page_path.includes(':') || seo.page_path.includes('[') || seo.page_path.includes('*')) {
      continue;
    }

    // This landing page has a hand-authored static shell with its key visible
    // content and structured data. Keep it instead of replacing it with the
    // generic empty-root template.
    if (seo.page_path.replace(/\/$/, '') === '/digitalni-memorijal') {
      continue;
    }

    // Always create folder structure with index.html
    const cleanPath = seo.page_path.endsWith('/') ? seo.page_path.slice(0, -1) : seo.page_path;
    const filePath = path.join(publicDir, cleanPath, 'index.html');
    const dir = path.dirname(filePath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const html = generateHTMLTemplate(seo, seo.page_path);
    fs.writeFileSync(filePath, html);
    
    console.log(`✓ Generated: ${filePath}`);
  }

  console.log('SEO templates generated successfully!');
}

generateSEOTemplates().catch(console.error);
