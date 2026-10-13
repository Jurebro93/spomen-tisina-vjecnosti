import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = 'https://umpvnepxsqfkxjpclkxc.supabase.co'
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtcHZuZXB4c3Fma3hqcGNsa3hjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY3MzIwMCwiZXhwIjoyMDY4MjQ5MjAwfQ.PJnqZIGQVFgHUdQF8Fo4XGOSZJLfaQv9mYjOFvwVNjE'
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Starting sitemap generation...')

    const sitemapUrls: SitemapUrl[] = []
    const baseUrl = 'https://osmrtnica.com.hr'
    const currentDate = new Date().toISOString()

    // Static pages
    const staticPages = [
      { path: '/', priority: '1.0', changefreq: 'daily' },
      { path: '/blog/', priority: '0.8', changefreq: 'weekly' },
      { path: '/informacije/', priority: '0.7', changefreq: 'monthly' },
      { path: '/kako-objaviti-osmrtnicu/', priority: '0.8', changefreq: 'monthly' },
      { path: '/objavi-osmrtnicu/', priority: '0.9', changefreq: 'monthly' },
      { path: '/memorijalni-vrt/', priority: '0.7', changefreq: 'weekly' },
      { path: '/virtualne-svijece/', priority: '0.7', changefreq: 'weekly' },
      { path: '/zapali-svijecu/', priority: '0.8', changefreq: 'monthly' },
      { path: '/sprovodi/', priority: '0.8', changefreq: 'daily' },
      { path: '/umrli/', priority: '0.8', changefreq: 'daily' },
      { path: '/cesto-postavljena-pitanja/', priority: '0.6', changefreq: 'monthly' },
      { path: '/politika-privatnosti/', priority: '0.3', changefreq: 'yearly' },
      { path: '/uvjeti-koristenja/', priority: '0.3', changefreq: 'yearly' },
      { path: '/kolacici/', priority: '0.3', changefreq: 'yearly' },
    ]

    staticPages.forEach(page => {
      sitemapUrls.push({
        loc: `${baseUrl}${page.path}`,
        lastmod: currentDate,
        changefreq: page.changefreq,
        priority: page.priority
      })
    })

    // Fetch dynamic content
    const [blogsResponse, obituariesResponse, umrliResponse, sprovodiResponse, pogrebnaResponse, grobljaResponse] = await Promise.all([
      supabase.from('blogs').select('slug, updated_at'),
      supabase.from('obituaries').select('slug, updated_at').eq('active', true),
      supabase.from('umrli').select('grad').order('grad'),
      supabase.from('sprovodi').select('grad').order('grad'),
      supabase.from('pogrebna_poduzeca').select('slug, updated_at'),
      supabase.from('groblja').select('slug, updated_at')
    ])

    // Add blogs
    if (blogsResponse.data) {
      blogsResponse.data.forEach(blog => {
        if (blog.slug) {
          sitemapUrls.push({
            loc: `${baseUrl}/blog/${blog.slug}/`,
            lastmod: blog.updated_at || currentDate,
            changefreq: 'monthly',
            priority: '0.6'
          })
        }
      })
    }

    // Add obituaries
    if (obituariesResponse.data) {
      obituariesResponse.data.forEach(obituary => {
        if (obituary.slug) {
          sitemapUrls.push({
            loc: `${baseUrl}/osmrtnica/${obituary.slug}/`,
            lastmod: obituary.updated_at || currentDate,
            changefreq: 'monthly',
            priority: '0.1'
          })
        }
      })
    }

    // Add unique cities from umrli
    if (umrliResponse.data) {
      const uniqueCities = [...new Set(umrliResponse.data.map(item => item.grad).filter(Boolean))]
      uniqueCities.forEach(grad => {
        const slug = grad.toLowerCase()
          .replace(/č/g, 'c').replace(/ć/g, 'c').replace(/ž/g, 'z')
          .replace(/š/g, 's').replace(/đ/g, 'd').replace(/\s+/g, '-')
        
        sitemapUrls.push({
          loc: `${baseUrl}/umrli/${slug}/`,
          lastmod: currentDate,
          changefreq: 'daily',
          priority: '0.8'
        })
      })
    }

    // Add unique cities from sprovodi
    if (sprovodiResponse.data) {
      const uniqueCities = [...new Set(sprovodiResponse.data.map(item => item.grad).filter(Boolean))]
      uniqueCities.forEach(grad => {
        const slug = grad.toLowerCase()
          .replace(/č/g, 'c').replace(/ć/g, 'c').replace(/ž/g, 'z')
          .replace(/š/g, 's').replace(/đ/g, 'd').replace(/\s+/g, '-')
        
        sitemapUrls.push({
          loc: `${baseUrl}/sprovodi/${slug}/`,
          lastmod: currentDate,
          changefreq: 'daily',
          priority: '0.8'
        })
      })
    }

    // Add funeral homes
    if (pogrebnaResponse.data) {
      pogrebnaResponse.data.forEach(poduzece => {
        if (poduzece.slug) {
          sitemapUrls.push({
            loc: `${baseUrl}/pogrebno-poduzece/${poduzece.slug}/`,
            lastmod: poduzece.updated_at || currentDate,
            changefreq: 'monthly',
            priority: '0.3'
          })
        }
      })
    }

    // Add cemeteries
    if (grobljaResponse.data) {
      grobljaResponse.data.forEach(groblje => {
        if (groblje.slug) {
          sitemapUrls.push({
            loc: `${baseUrl}/groblje/${groblje.slug}/`,
            lastmod: groblje.updated_at || currentDate,
            changefreq: 'monthly',
            priority: '0.3'
          })
        }
      })
    }

    // Generate XML
    const xmlContent = generateXML(sitemapUrls)

    // Save XML to storage
    const { error: uploadError } = await supabase.storage
      .from('sitemaps')
      .upload('sitemap.xml', new Blob([xmlContent], { type: 'application/xml' }), {
        cacheControl: '3600',
        upsert: true,
        contentType: 'application/xml'
      })

    if (uploadError) {
      console.error('Error uploading sitemap:', uploadError)
      throw uploadError
    }

    console.log(`Sitemap generated successfully with ${sitemapUrls.length} URLs`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sitemap generated with ${sitemapUrls.length} URLs`,
        timestamp: currentDate
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

function generateXML(sitemapUrls: SitemapUrl[]): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
  
  sitemapUrls.forEach(url => {
    xml += `  <url>\n`
    xml += `    <loc>${url.loc}</loc>\n`
    if (url.lastmod) {
      xml += `    <lastmod>${url.lastmod}</lastmod>\n`
    }
    if (url.changefreq) {
      xml += `    <changefreq>${url.changefreq}</changefreq>\n`
    }
    if (url.priority) {
      xml += `    <priority>${url.priority}</priority>\n`
    }
    xml += `  </url>\n`
  })
  
  xml += `</urlset>`
  return xml
}