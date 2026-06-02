import { supabaseServer } from '../../lib/supabaseServer';
import ArticlesBrowser, { type BrowserArticle, type BrowserTag } from './ArticlesBrowser';

// Render on the server and refresh periodically (ISR). The article list and tag
// chips are now part of the initial HTML — good for SEO and first paint — while
// search/filter interactivity lives in the ArticlesBrowser client island.
export const revalidate = 300;

type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  image_url: string | null;
  reading_time: number | null;
  created_date: string | null;
  tags: string | null;
};

export default async function ArticlesPage() {
  const supabase = supabaseServer();

  const [{ data: articlesData }, { data: tagsData }] = await Promise.all([
    supabase
      .from('articles')
      // Only the fields the grid actually renders - the full body is not shipped.
      .select('id, title, slug, excerpt, image_url, reading_time, created_date, tags')
      .eq('is_published', true)
      .order('created_date', { ascending: false }),
    supabase.from('tags').select('id, name'),
  ]);

  const articles: BrowserArticle[] = ((articlesData as ArticleRow[] | null) ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt ?? undefined,
    image_url: a.image_url ?? undefined,
    reading_time: a.reading_time ?? undefined,
    created_date: a.created_date ?? undefined,
    tag_names: a.tags ? a.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
  }));

  const tags: BrowserTag[] = (tagsData as BrowserTag[] | null) ?? [];

  return (
    <div className="overflow-hidden" style={{ paddingTop: '80px' }}>
      {/* Hero (static, server-rendered) */}
      <section className="py-10 md:py-16 bg-gradient-to-br from-stone-100 to-amber-50">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-block px-3 py-1.5 bg-amber-100 rounded-full text-amber-800 text-sm mb-4">
              מאמרים
            </span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-stone-800 mb-3 md:mb-4">
              ידע ותובנות
            </h1>
            <p className="text-base md:text-lg text-stone-600">
              מאמרים, טיפים וכלים מעולם הפסיכותרפיה, ההורות והזוגיות
            </p>
          </div>
        </div>
      </section>

      {/* Search + filter + grid + CTA (client island, data passed as props) */}
      <ArticlesBrowser articles={articles} tags={tags} />
    </div>
  );
}
