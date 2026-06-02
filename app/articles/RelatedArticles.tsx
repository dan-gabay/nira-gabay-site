import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import TrackedLink from '@/components/TrackedLink';

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  image_url?: string;
  created_date?: string;
};

type RelatedArticlesProps = {
  currentArticleId: string;
  tags?: string[];
  // SEO-generated internal-link recommendations (slugs, in priority order).
  recommendedSlugs?: string[];
};

const SELECT = 'id, title, slug, excerpt, image_url, created_date';
const MAX = 3;

// Builds the related list in priority order:
//   1. SEO-recommended internal links (the same ones surfaced in /manage)
//   2. articles that share a tag
//   3. most recent articles
// Always published-only, never the current article, de-duplicated.
async function getRelatedArticles(
  articleId: string,
  tags?: string[],
  recommendedSlugs?: string[],
): Promise<Article[]> {
  const { supabaseServer } = await import('@/lib/supabaseServer');
  const supabase = supabaseServer();

  const result: Article[] = [];
  const seen = new Set<string>([articleId]);
  const take = (rows: Article[] | null) => {
    for (const a of rows || []) {
      if (result.length >= MAX) break;
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      result.push(a);
    }
  };

  // 1. SEO-recommended internal links, published only, preserving order.
  if (recommendedSlugs && recommendedSlugs.length > 0) {
    const { data } = await supabase
      .from('articles')
      .select(SELECT)
      .eq('is_published', true)
      .in('slug', recommendedSlugs);
    const bySlug = new Map((data as Article[] | null)?.map((a) => [a.slug, a]) ?? []);
    take(recommendedSlugs.map((s) => bySlug.get(s)).filter(Boolean) as Article[]);
  }

  // 2. Fill from articles that share a tag.
  if (result.length < MAX && tags && tags.length > 0) {
    const orConditions = tags.map((tag) => `tags.ilike.%${tag}%`).join(',');
    const { data } = await supabase
      .from('articles')
      .select(SELECT)
      .eq('is_published', true)
      .neq('id', articleId)
      .or(orConditions)
      .limit(MAX * 2);
    take(data as Article[] | null);
  }

  // 3. Fill with the most recent articles.
  if (result.length < MAX) {
    const { data } = await supabase
      .from('articles')
      .select(SELECT)
      .eq('is_published', true)
      .neq('id', articleId)
      .order('created_date', { ascending: false })
      .limit(MAX * 2);
    take(data as Article[] | null);
  }

  return result.slice(0, MAX);
}

export default async function RelatedArticles({ currentArticleId, tags, recommendedSlugs }: RelatedArticlesProps) {
  const articles = await getRelatedArticles(currentArticleId, tags, recommendedSlugs);
  
  if (articles.length === 0) {
    return null;
  }
  
  return (
    <section className="mt-16 pt-12 border-t border-stone-200">
      <h3 className="text-2xl font-bold text-stone-800 mb-8 font-serif">
        מאמרים נוספים שעשויים לעניין אתכם
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {articles.map((article) => (
          <TrackedLink
            key={article.id}
            href={`/articles/${article.slug}`}
            className="group block bg-white rounded-xl overflow-hidden border border-stone-200 hover:shadow-lg transition-all duration-300 h-full flex flex-col"
            trackingData={{ type: 'related_article', title: article.title, location: 'article_page' }}
          >
            {article.image_url && (
              <div className="relative w-full aspect-[16/9] overflow-hidden bg-stone-100">
                <Image
                  src={article.image_url}
                  alt={article.title}
                  fill
                  loading="lazy"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
            )}
            
            <div className="p-4 flex-1 flex flex-col">
              <h4 className="font-bold text-stone-800 group-hover:text-amber-700 transition-colors line-clamp-2 mb-2">
                {article.title}
              </h4>
              
              {article.excerpt && (
                <p className="text-sm text-stone-600 line-clamp-2 mb-3 flex-1">
                  {article.excerpt}
                </p>
              )}
              
              <div className="flex items-center text-amber-700 text-sm font-medium mt-auto">
                קראו עוד
                <ArrowLeft className="w-4 h-4 mr-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </TrackedLink>
        ))}
      </div>
    </section>
  );
}
