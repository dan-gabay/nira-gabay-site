import { MetadataRoute } from 'next'
import { supabaseServer } from '../lib/supabaseServer'
import { TOPICS } from '../lib/topics'

// Standard sitemap without images (Next.js will use this)
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = supabaseServer()
  const baseUrl = 'https://www.niragabay.com'

  const { data: articles } = await supabase
    .from('articles')
    .select('slug, updated_date, created_date, tags')
    .eq('is_published', true)

  const articleUrls = (articles || []).map((article) => ({
    url: `${baseUrl}/articles/${article.slug}`,
    lastModified: article.updated_date || article.created_date || new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Topic hub pages - only hubs with 2+ published articles (thinner hubs
  // noindex themselves and stay out of the sitemap until they fill up).
  const topicUrls = TOPICS.flatMap((topic) => {
    const members = (articles || []).filter((a) =>
      (a.tags || '').split(',').map((t: string) => t.trim()).includes(topic.tag)
    )
    if (members.length < 2) return []
    const lastModified = members
      .map((a) => a.updated_date || a.created_date)
      .filter(Boolean)
      .sort()
      .pop()
    return [{
      url: `${baseUrl}/articles/topic/${topic.slug}`,
      lastModified: lastModified || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }]
  })

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
    ...topicUrls,
    ...articleUrls,
  ]
}
