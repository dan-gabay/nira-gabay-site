import { supabaseServer } from '@/lib/supabaseServer'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = supabaseServer()
  const baseUrl = 'https://www.niragabay.com'
  
  // Fetch all published articles with images
  const { data: articles } = await supabase
    .from('articles')
    .select('slug, updated_date, created_date, image_url, title')
    .eq('is_published', true)

  const staticPages = [
    { url: baseUrl, lastmod: new Date().toISOString(), priority: '1.0', changefreq: 'monthly' },
    { url: `${baseUrl}/about`, lastmod: new Date().toISOString(), priority: '0.9', changefreq: 'monthly' },
    { url: `${baseUrl}/articles`, lastmod: new Date().toISOString(), priority: '0.9', changefreq: 'weekly' },
    { url: `${baseUrl}/contact`, lastmod: new Date().toISOString(), priority: '0.7', changefreq: 'monthly' },
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${staticPages.map(page => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
${(articles || []).map(article => {
    const lastmod = article.updated_date || article.created_date || new Date().toISOString()
    const imageTag = article.image_url ? `
    <image:image>
      <image:loc>${escapeXml(article.image_url)}</image:loc>
      <image:title>${escapeXml(article.title)}</image:title>
    </image:image>` : ''
    
    return `  <url>
    <loc>${baseUrl}/articles/${article.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${imageTag}
  </url>`
  }).join('\n')}
</urlset>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate'
    }
  })
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return ''
  // First, decode any existing HTML entities, then escape for XML
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
