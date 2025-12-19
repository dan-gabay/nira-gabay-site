import { supabaseServer } from '../../../lib/supabaseServer';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Calendar, Tag, Clock, Heart } from 'lucide-react';
import ArticleInteractions from '../ArticleInteractions';
import RelatedArticles from '../RelatedArticles';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import JsonLd from '@/components/JsonLd';
import type { Metadata } from 'next';

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

// Dynamic metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = supabaseServer();
  
  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .single();
  
  if (!article) {
    return {
      title: 'מאמר לא נמצא',
    };
  }
  
  return {
    title: article.title,
    description: article.excerpt || article.content?.substring(0, 160),
    keywords: article.tag_names || [],
    openGraph: {
      title: article.title,
      description: article.excerpt || article.content?.substring(0, 160),
      type: 'article',
      publishedTime: article.created_date,
      authors: ['נירה גבאי'],
      url: `https://niragabay.com/articles/${slug}`,
      siteName: 'נירה גבאי - פסיכולוגית קלינית',
      locale: 'he_IL',
      images: article.image_url ? [{
        url: article.image_url,
        width: 1200,
        height: 630,
        alt: article.title,
      }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt || article.content?.substring(0, 160),
      images: article.image_url ? [article.image_url] : [],
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params; // Next.js 15: params is a Promise!
  const supabase = supabaseServer();

  // Try to fetch by slug first, then by ID
  let article: Article | null = null;
  let error = null;

  // First try by slug
  const { data: articleBySlug, error: slugError } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (articleBySlug) {
    const tags = articleBySlug.tags ? articleBySlug.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
    article = {
      ...articleBySlug,
      tag_names: tags
    } as Article;
  } else {
    // If not found by slug, try by ID
    const { data: articleById, error: idError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', slug)
      .eq('is_published', true)
      .single();
    
    if (articleById) {
      const tags = articleById.tags ? articleById.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
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

  // Structured Data - Article Schema
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.excerpt,
    image: article.image_url,
    datePublished: article.created_date,
    dateModified: article.created_date,
    author: {
      '@type': 'Person',
      name: 'נירה גבאי',
      jobTitle: 'פסיכולוגית קלינית',
      url: 'https://niragabay.com/about'
    },
    publisher: {
      '@type': 'Organization',
      name: 'נירה גבאי - פסיכולוגית קלינית',
      logo: {
        '@type': 'ImageObject',
        url: 'https://niragabay.com/logo.png'
      }
    },
    keywords: article.tag_names?.join(', '),
    articleBody: article.content
  };

  // Breadcrumb Schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'דף הבית',
        item: 'https://niragabay.com'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'מאמרים',
        item: 'https://niragabay.com/articles'
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: article.title,
        item: `https://niragabay.com/articles/${article.slug}`
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-stone-50">
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      
      {/* Breadcrumb */}
      <div className="bg-stone-50 py-4 border-b border-stone-100">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <nav className="flex items-center gap-2 text-sm text-stone-500">
            <Link href="/" className="hover:text-stone-800">דף הבית</Link>
            <span>/</span>
            <Link href="/articles" className="hover:text-stone-800">מאמרים</Link>
            <span>/</span>
            <span className="text-stone-800 truncate max-w-xs">{article.title}</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <section className="py-12 bg-gradient-to-br from-stone-100 to-amber-50">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          {/* Tags */}
          {article.tag_names && article.tag_names.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {article.tag_names.map((tag, i) => (
                <Link 
                  key={i} 
                  href={`/articles?tag=${encodeURIComponent(tag)}`}
                  className="inline-flex items-center px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium hover:bg-amber-200 transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-stone-800 mb-6 font-serif leading-tight">
            {article.title}
          </h1>
          
          {article.excerpt && (
            <p className="text-xl text-stone-600 leading-relaxed mb-6">
              {article.excerpt}
            </p>
          )}
          
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-6 text-stone-500 pb-6 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-stone-200 flex items-center justify-center">
                <span className="text-sm font-bold text-stone-700">נ</span>
              </div>
              <span className="font-medium text-stone-700">נירה גבאי</span>
            </div>
            
            {article.created_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(article.created_date).toLocaleDateString('he-IL')}
              </span>
            )}
            
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {article.reading_time || 5} דקות קריאה
            </span>
            
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              {article.likes_count || 0} לייקים
            </span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          {/* Featured Image */}
          {article.image_url && (
            <div className="mb-12">
              <Image
                src={article.image_url}
                alt={`תמונת המאמר: ${article.title} - נירה גבאי פסיכותרפיה`}
                width={1200}
                height={600}
                unoptimized
                className="w-full h-auto max-h-[500px] object-cover rounded-2xl shadow-lg"
              />
            </div>
          )}
          
          {/* Article Content */}
          <article className="prose prose-xl max-w-none prose-stone 
            prose-headings:font-assistant prose-headings:text-stone-900 prose-headings:font-bold 
            prose-h1:text-4xl prose-h1:mt-24 prose-h1:mb-12 prose-h1:leading-[1.6] prose-h1:pb-6 prose-h1:border-b-2 prose-h1:border-amber-200
            prose-h2:text-3xl prose-h2:mt-20 prose-h2:mb-10 prose-h2:leading-[1.6]
            prose-h3:text-2xl prose-h3:mt-16 prose-h3:mb-8 prose-h3:leading-[1.7] prose-h3:text-amber-900
            prose-p:text-lg prose-p:leading-[2.0] prose-p:mb-8 prose-p:text-stone-700
            prose-a:text-amber-700 prose-a:font-medium prose-a:underline hover:prose-a:text-amber-800
            prose-ul:mr-8 prose-ul:space-y-3 prose-ul:my-8 prose-ul:list-disc
            prose-ol:mr-8 prose-ol:space-y-3 prose-ol:my-8 prose-ol:list-decimal
            prose-li:text-lg prose-li:leading-relaxed prose-li:text-stone-700 prose-li:mb-2
            prose-strong:text-stone-900 prose-strong:font-bold
            prose-em:text-stone-600 prose-em:italic
            prose-blockquote:border-r-4 prose-blockquote:border-amber-500 prose-blockquote:pr-6 prose-blockquote:py-4 prose-blockquote:my-8 prose-blockquote:italic prose-blockquote:bg-amber-50/50
            mb-12"
          >
            <ReactMarkdown remarkPlugins={[remarkBreaks]}>{article.content}</ReactMarkdown>
          </article>

          {/* Interactions (Likes, Share, Comments) */}
          <ArticleInteractions 
            articleId={article.id}
            initialLikesCount={article.likes_count || 0}
            initialViewsCount={article.views_count || 0}
          />

          {/* Author Box */}
          <div className="bg-gradient-to-br from-amber-50 to-stone-50 rounded-2xl p-6 md:p-8 my-12">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Image
                src="https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/hero-desktop.png"
                alt="נירה גבאי - מטפלת בפסיכותרפיה ומדריכת הורים, בעלת תואר M.A ממכון אדלר"
                width={96}
                height={96}
                className="rounded-full object-cover shadow-lg"
                loading="lazy"
              />
              <div className="text-center sm:text-right">
                <h3 className="text-xl font-bold text-stone-800 mb-2 font-serif">נירה גבאי</h3>
                <p className="text-stone-600 text-sm mb-4">
                  מטפלת בפסיכותרפיה ומדריכת הורים. מלווה מתבגרים, מבוגרים וזוגות בדרכם להגשמה עצמית.
                </p>
                <Link href="/about">
                  <button className="px-4 py-2 border-2 border-stone-300 text-stone-700 rounded-lg hover:border-stone-400 hover:bg-stone-50 transition-all">
                    קראו עוד עליי
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Related Articles */}
          <RelatedArticles 
            currentArticleId={article.id}
            tags={article.tag_names}
          />

          {/* Back Link */}
          <div className="mt-12 pt-8 border-t border-stone-200">
            <Link href="/articles">
              <button className="inline-flex items-center gap-2 px-6 py-3 border-2 border-stone-300 text-stone-700 rounded-lg hover:border-stone-400 hover:bg-stone-50 transition-all">
                <ArrowRight className="w-5 h-5" />
                חזרה לכל המאמרים
              </button>
            </Link>
          </div>
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
