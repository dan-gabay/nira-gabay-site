import { supabaseServer } from '../../../lib/supabaseServer';
import Link from 'next/link';
import { ArrowRight, Calendar, Tag } from 'lucide-react';

type Props = { params: { slug: string } };

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  image_url?: string;
  reading_time?: number;
  likes_count?: number;
  views_count?: number;
  created_date?: string;
  is_published?: boolean;
  tag_names?: string[];
  article_tags?: Array<{tags: {name: string}}>;
};

export default async function ArticlePage({ params }: Props) {
  const slug = params.slug;
  const supabase = supabaseServer();

  // Try to fetch by slug first, then by ID
  let article: Article | null = null;
  let error = null;

  // First try by slug
  const { data: articleBySlug, error: slugError } = await supabase
    .from('articles')
    .select(`
      *,
      article_tags(
        tags(
          name
        )
      )
    `)
    .eq('slug', slug)
    .eq('is_published', 'true')
    .single();
  
  console.log('Looking for slug:', slug);
  console.log('Found by slug:', articleBySlug);
  console.log('Error:', slugError);

  if (articleBySlug) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tags = (articleBySlug.article_tags as any || []).map((at: any) => at.tags?.name).filter(Boolean);
    article = {
      ...articleBySlug,
      tag_names: tags
    } as Article;
  } else {
    // If not found by slug, try by ID
    const { data: articleById, error: idError } = await supabase
      .from('articles')
      .select(`
        *,
        article_tags(
          tags(
            name
          )
        )
      `)
      .eq('id', slug)
      .eq('is_published', 'true')
      .single();
    
    console.log('Trying by ID:', slug);
    console.log('Found by ID:', articleById);
    
    if (articleById) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tags = (articleById.article_tags as any || []).map((at: any) => at.tags?.name).filter(Boolean);
      article = {
        ...articleById,
        tag_names: tags
      } as Article;
    }
    error = idError;
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 to-amber-50 py-24">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl text-center">
          <h1 className="text-4xl font-bold text-stone-800 mb-4">המאמר לא נמצא</h1>
          <p className="text-stone-600 mb-8">אין מאמר עם slug: {slug}</p>
          <Link 
            href="/articles"
            className="inline-flex items-center gap-2 px-6 py-3 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
            חזרה למאמרים
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-stone-50">
      {/* Header */}
      <section className="py-12 bg-gradient-to-br from-stone-100 to-amber-50">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <Link 
            href="/articles"
            className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-800 transition-colors mb-8"
          >
            <ArrowRight className="w-5 h-5" />
            חזרה למאמרים
          </Link>
          
          <h1 className="text-4xl md:text-5xl font-bold text-stone-800 mb-4 leading-tight">
            {article.title}
          </h1>
          
          {article.excerpt && (
            <p className="text-xl text-stone-600 leading-relaxed">
              {article.excerpt}
            </p>
          )}
          
          <div className="flex flex-wrap items-center gap-4 mt-6 text-sm text-stone-500">
            {article.created_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(article.created_date).toLocaleDateString('he-IL')}
              </div>
            )}
            {article.tag_names && article.tag_names.length > 0 && (
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                {article.tag_names.join(', ')}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          {/* Featured Image */}
          {article.image_url && (
            <div className="mb-12">
              <img
                src={article.image_url}
                alt={article.title}
                className="w-full h-auto max-h-[500px] object-cover rounded-2xl shadow-lg"
              />
            </div>
          )}
          
          <article className="prose prose-lg prose-stone max-w-none
            prose-headings:text-stone-800 prose-headings:font-bold
            prose-p:text-stone-700 prose-p:leading-relaxed
            prose-a:text-amber-700 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-stone-800
            prose-ul:text-stone-700 prose-ol:text-stone-700
            prose-blockquote:border-amber-500 prose-blockquote:text-stone-600
          ">
            <div className="whitespace-pre-wrap">{article.content}</div>
          </article>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-amber-50 to-stone-100">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-stone-800 mb-4">מעוניינים בייעוץ אישי?</h2>
          <p className="text-xl text-stone-600 mb-8">אשמח לעזור לכם במסע שלכם</p>
          <Link
            href="/contact"
            className="inline-block px-8 py-3 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
          >
            צרו קשר
          </Link>
        </div>
      </section>
    </div>
  );
}
