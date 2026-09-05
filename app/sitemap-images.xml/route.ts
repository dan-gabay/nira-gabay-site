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

  // Image sitemap: entries that actually carry an <image:image>, and nothing
  // else. It used to open with four static pages (/, /about, /articles,
  // /contact) that have no image tags at all - a hand-maintained copy of a
  // slice of sitemap.xml, already missing /privacy, /services/* and the topic
  // hubs, and drifting further with every page added. Those URLs are in
  // sitemap.xml, which is generated from lib/siteUrls.ts and cannot drift.
  // Listing them here a second time bought nothing and had to be remembered.
  const withImages = (articles || []).filter((a) => Boolean(a.image_url))

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${withImages.map(article => {
    const lastmod = article.updated_date || article.created_date || new Date().toISOString()

    return `  <url>
    <loc>${baseUrl}/articles/${article.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>${escapeXml(article.image_url)}</image:loc>
      <image:title>${escapeXml(article.title)}</image:title>
    </image:image>
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
