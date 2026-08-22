import ArticleRow from '@/components/ArticleRow';

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  image_url?: string;
  reading_time?: number;
  created_date?: string;
};

type RelatedArticlesProps = {
  currentArticleId: string;
  tags?: string[];
  // SEO-generated internal-link recommendations (slugs, in priority order).
  recommendedSlugs?: string[];
};

const SELECT = 'id, title, slug, excerpt, image_url, reading_time, created_date';
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
    <section className="mt-8 pt-6 md:mt-16 md:pt-12 border-t border-stone-200">
      <h3 className="text-lg md:text-2xl font-bold text-stone-800 mb-4 md:mb-8 font-serif">
        מאמרים נוספים שעשויים לעניין אתכם
      </h3>

      {/* Same card as the index and the topic hubs: stacked on the phone,
          three across on desktop as this rail has always been. */}
      <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-3 md:gap-5">
        {articles.map((article, index) => (
          <ArticleRow
            key={article.id}
            article={article}
            index={index}
            headingLevel={4}
            trackAs="related"
          />
        ))}
      </div>
    </section>
  );
}
