import { MetadataRoute } from 'next'
import { supabaseServer } from '../lib/supabaseServer'

// Standard sitemap without images (Next.js will use this)
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = supabaseServer()
  const baseUrl = 'https://www.niragabay.com'
  
  const { data: articles } = await supabase
    .from('articles')
    .select('slug, updated_date, created_date')
    .eq('is_published', true)
  
  const articleUrls = (articles || []).map((article) => ({
    url: `${baseUrl}/articles/${article.slug}`,
    lastModified: article.updated_date || article.created_date || new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))
  
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/articles`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    ...articleUrls,
  ]
}
