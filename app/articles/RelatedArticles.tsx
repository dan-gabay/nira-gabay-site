import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

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
};

async function getRelatedArticles(articleId: string, tags?: string[]): Promise<Article[]> {
  const { supabaseServer } = await import('@/lib/supabaseServer');
  const supabase = supabaseServer();
  
  // אם יש תגיות, נמצא מאמרים עם תגיות דומות
  if (tags && tags.length > 0) {
    const { data } = await supabase
      .from('articles')
      .select(`
        id,
        title,
        slug,
        excerpt,
        image_url,
        created_date,
        article_tags!inner(
          tags!inner(name)
        )
      `)
      .eq('is_published', true)
      .neq('id', articleId)
      .limit(3);
    
    if (data && data.length > 0) {
      return data as Article[];
    }
  }
  
  // אם אין תגיות או לא נמצאו תוצאות, נחזיר מאמרים אחרונים
  const { data } = await supabase
    .from('articles')
    .select('id, title, slug, excerpt, image_url, created_date')
    .eq('is_published', true)
    .neq('id', articleId)
    .order('created_date', { ascending: false })
    .limit(3);
  
  return (data as Article[]) || [];
}

export default async function RelatedArticles({ currentArticleId, tags }: RelatedArticlesProps) {
  const articles = await getRelatedArticles(currentArticleId, tags);
  
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
          <Link
            key={article.id}
            href={`/articles/${article.slug}`}
            className="group block bg-white rounded-xl overflow-hidden border border-stone-200 hover:shadow-lg transition-all duration-300"
          >
            {article.image_url && (
              <div className="relative h-48 overflow-hidden bg-stone-100">
                <Image
                  src={article.image_url}
                  alt={article.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            
            <div className="p-4">
              <h4 className="font-bold text-stone-800 group-hover:text-amber-700 transition-colors line-clamp-2 mb-2">
                {article.title}
              </h4>
              
              {article.excerpt && (
                <p className="text-sm text-stone-600 line-clamp-2 mb-3">
                  {article.excerpt}
                </p>
              )}
              
              <div className="flex items-center text-amber-700 text-sm font-medium">
                קראו עוד
                <ArrowLeft className="w-4 h-4 mr-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
