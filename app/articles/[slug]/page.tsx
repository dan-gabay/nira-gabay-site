import { cache } from 'react';
import { supabaseServer } from '../../../lib/supabaseServer';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Calendar, Clock, Heart } from 'lucide-react';
import ArticleInteractions from '../ArticleInteractions';
import ArticleReadTracker from '@/components/ArticleReadTracker';
import ArticleViewTracker from '@/components/ArticleViewTracker';
import ArticleTag from '@/components/ArticleTag';
import ArticleFaq from '@/components/ArticleFaq';
import RelatedArticles from '../RelatedArticles';
import NewsletterSignup from '@/components/NewsletterSignup';
import { TOPIC_BY_TAG } from '@/lib/topics';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import JsonLd from '@/components/JsonLd';
import type { Metadata } from 'next';

type Props = { params: Promise<{ slug: string }> };

// Revalidate article pages every hour (ISR)
export const revalidate = 3600;

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
  // SEO fields (populated by the import pipeline)
  meta_title?: string | null;
  meta_description?: string | null;
  canonical_url?: string | null;
  faq?: unknown | null;
  schema_json?: Record<string, unknown> | null;
  internal_links?: Array<{ slug: string; title?: string; anchor?: string; reason?: string }> | null;
  seo_package?: { og_title?: string; og_description?: string } | null;
  focus_keyword?: string | null;
  secondary_keywords?: string[] | null;
};

// Pre-render all published article pages at build time
export async function generateStaticParams() {
  try {
    const supabase = supabaseServer();
    const { data } = await supabase
      .from('articles')
      .select('slug')
      .eq('is_published', true);

    return (data || [])
      .filter((row): row is { slug: string } => Boolean(row.slug))
      .map(({ slug }) => ({ slug }));
  } catch {
    // Supabase env vars unavailable at build time (e.g. local build without
    // SUPABASE_URL) - fall back to on-demand rendering with ISR caching.
    return [];
  }
}

// Fetch the article once per request (shared between generateMetadata and the page)
const getArticle = cache(async (slug: string): Promise<Article | null> => {
  const supabase = supabaseServer();

  // First try by slug
  let { data: row } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  // If not found by slug, try by ID
  if (!row) {
    const { data: rowById } = await supabase
      .from('articles')
      .select('*')
      .eq('id', slug)
      .eq('is_published', true)
      .single();
    row = rowById;
  }

  if (!row) return null;

  const tags = row.tags
    ? row.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
    : [];

  return { ...row, tag_names: tags } as Article;
});

// Verify which of the given slugs are published (cached per request).
// Keyed by a comma-joined string so React.cache can dedupe the call.
const getPublishedSlugs = cache(async (slugsKey: string): Promise<Set<string>> => {
  if (!slugsKey) return new Set();
  const supabase = supabaseServer();
  const { data } = await supabase
    .from('articles')
    .select('slug')
    .in('slug', slugsKey.split(','))
    .eq('is_published', true);

  return new Set((data || []).map((r: { slug: string }) => r.slug));
});

// Split markdown content at the third "## " heading, so a contextual aside can
// be placed in the body. Returns null when there are fewer than 3 H2 headings.
function splitAtThirdH2(content: string): [string, string] | null {
  let idx = -1;
  let from = 0;
  for (let count = 0; count < 3; count++) {
    idx = content.indexOf('\n## ', from);
    if (idx === -1) return null;
    from = idx + 4;
  }
  return [content.slice(0, idx), content.slice(idx)];
}

// The page renders its own <h1>, so demote any stray "# " heading in the
// markdown content to <h2> for a valid heading hierarchy.
const markdownComponents: Components = { h1: 'h2' };

// Dynamic metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return {
      title: 'מאמר לא נמצא',
      robots: { index: false, follow: false },
    };
  }
  
  // Prefer the generated/validated SEO fields, falling back to the basics.
  const seoPkg = article.seo_package || {};
  const metaTitle = article.meta_title || article.title;
  const metaDescription =
    article.meta_description || article.excerpt || article.content?.substring(0, 160);
  const canonical = article.canonical_url || `https://www.niragabay.com/articles/${slug}`;
  const ogTitle = seoPkg.og_title || metaTitle;
  const ogDescription = seoPkg.og_description || metaDescription;
  const secondaryKeywords: string[] = Array.isArray(article.secondary_keywords)
    ? article.secondary_keywords
    : [];
  const keywords = [
    article.focus_keyword,
    ...secondaryKeywords,
    ...(article.tag_names || []),
  ].filter((k): k is string => Boolean(k));

  return {
    // A stored meta_title already includes the "| נירה גבאי" brand, so emit it
    // as `absolute` to bypass the layout's "%s | נירה גבאי" template (otherwise
    // the brand is appended twice). Pre-pipeline articles fall back to the bare
    // title and let the template add the brand once.
    title: article.meta_title ? { absolute: article.meta_title } : article.title,
    description: metaDescription,
    keywords,
    alternates: {
      canonical,
    },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      type: 'article',
      publishedTime: article.created_date,
      authors: ['נירה גבאי'],
      url: canonical,
      siteName: 'נירה גבאי - פסיכותרפיה והדרכת הורים',
      locale: 'he_IL',
      images: [{
        url: article.image_url || 'https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/hero-desktop.png',
        width: 1200,
        height: 630,
        alt: article.title,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDescription,
      images: [article.image_url || 'https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/hero-desktop.png'],
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params; // Next.js 15+: params is a Promise!

  // Cached fetch (deduped with generateMetadata): by slug first, then by ID
  const article = await getArticle(slug);

  if (!article) {
    // Real 404 (renders not-found.tsx) instead of a 200 soft-404.
    notFound();
  }

  // In-body "recommended reading" aside: placed before the third H2 heading.
  // Only rendered when the content has at least 3 H2s and the linked articles
  // are verified as published.
  const splitContent = article.content ? splitAtThirdH2(article.content) : null;
  let inlineLinks: Array<{ slug: string; title?: string; anchor?: string }> = [];
  if (splitContent && Array.isArray(article.internal_links) && article.internal_links.length > 0) {
    const candidates = article.internal_links.filter(
      (l) => l?.slug && l.slug !== article.slug
    );
    if (candidates.length > 0) {
      const publishedSlugs = await getPublishedSlugs(
        candidates.map((l) => l.slug).join(',')
      );
      inlineLinks = candidates
        .filter((l) => publishedSlugs.has(l.slug))
        .slice(0, 2);
    }
  }

  // Structured Data - prefer the generated/validated schema, fall back to a
  // locally-built BlogPosting for articles imported before the SEO pipeline.
  const articleSchema = article.schema_json ?? {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.meta_description || article.excerpt,
    image: article.image_url,
    datePublished: article.created_date,
    dateModified: article.created_date,
    author: {
      '@type': 'Person',
      name: 'נירה גבאי',
      jobTitle: 'מטפלת בפסיכותרפיה ומדריכת הורים',
      url: 'https://www.niragabay.com/about'
    },
    publisher: {
      '@type': 'Organization',
      name: 'נירה גבאי - פסיכותרפיה והדרכת הורים',
      logo: {
        '@type': 'ImageObject',
        url: 'https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/logo.png'
      }
    },
    keywords: article.tag_names?.join(', '),
    articleBody: article.content
  };

  // FAQPage schema (generated by the SEO pipeline) - great for AI/rich results.
  const faqSchema =
    article.faq && typeof article.faq === 'object' &&
    Array.isArray((article.faq as { mainEntity?: unknown }).mainEntity) &&
    (article.faq as { mainEntity: unknown[] }).mainEntity.length > 0
      ? article.faq
      : null;

  // Topic hub for the article's primary (first) tag - adds a hub level to the
  // breadcrumb so the article sits under its cluster, not flat under /articles.
  const primaryTopic = article.tag_names?.length
    ? TOPIC_BY_TAG.get(article.tag_names[0]) ?? null
    : null;

  // Breadcrumb Schema
  const breadcrumbTrail = [
    { name: 'דף הבית', item: 'https://www.niragabay.com' },
    { name: 'מאמרים', item: 'https://www.niragabay.com/articles' },
    ...(primaryTopic
      ? [{ name: primaryTopic.tag, item: `https://www.niragabay.com/articles/topic/${primaryTopic.slug}` }]
      : []),
    { name: article.title, item: `https://www.niragabay.com/articles/${article.slug}` },
  ];
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbTrail.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.item,
    })),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-stone-50" style={{ paddingTop: '80px' }}>
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      {faqSchema && <JsonLd data={faqSchema} />}
      <ArticleViewTracker 
        articleId={article.id} 
        articleTitle={article.title} 
        tags={article.tag_names || []}
      />
      
      {/* Breadcrumb */}
      <div className="bg-stone-50 py-2.5 border-b border-stone-100">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <nav className="flex items-center gap-2 text-sm text-stone-500">
            <Link href="/" className="hover:text-stone-800">דף הבית</Link>
            <span>/</span>
            <Link href="/articles" className="hover:text-stone-800">מאמרים</Link>
            {primaryTopic && (
              <>
                <span>/</span>
                <Link href={`/articles/topic/${primaryTopic.slug}`} className="hover:text-stone-800">
                  {primaryTopic.tag}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="text-stone-800 truncate max-w-xs">{article.title}</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <section className="py-5 md:py-6 bg-gradient-to-br from-stone-100 to-amber-50">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          {/* Tags */}
          {article.tag_names && article.tag_names.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {article.tag_names.map((tag, i) => (
                <ArticleTag key={i} tag={tag} articleId={article.id} />
              ))}
            </div>
          )}
          
          <h1 className="text-2xl md:text-3xl font-bold text-stone-800 mb-2.5 font-serif leading-snug">
            {article.title}
          </h1>
          
          {article.excerpt && (
            <p className="text-base text-stone-600 leading-relaxed mb-4">
              {article.excerpt}
            </p>
          )}
          
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-stone-500">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-100 to-stone-200 flex items-center justify-center">
                <span className="text-xs font-bold text-stone-700">נ</span>
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
      <section className="pt-5 pb-12 md:pt-6 md:pb-16">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          {/* Featured Image */}
          {article.image_url && (
            <div className="mb-8 md:mb-12 relative w-full aspect-[16/9] rounded-xl overflow-hidden shadow-lg">
              <Image
                src={article.image_url}
                alt={`תמונת המאמר: ${article.title} - נירה גבאי פסיכותרפיה`}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 1024px"
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
            {splitContent && inlineLinks.length > 0 ? (
              <>
                <ReactMarkdown remarkPlugins={[remarkBreaks]} components={markdownComponents}>
                  {splitContent[0]}
                </ReactMarkdown>
                <aside className="not-prose bg-amber-50 border border-amber-200 rounded-2xl p-5 md:p-6 my-8">
                  <p className="font-bold text-stone-800 mb-3">מומלץ לקרוא גם:</p>
                  <ul className="space-y-2">
                    {inlineLinks.map((link) => (
                      <li key={link.slug}>
                        <Link
                          href={`/articles/${link.slug}`}
                          className="text-amber-700 font-medium underline hover:text-amber-800 transition-colors"
                        >
                          {link.anchor || link.title || link.slug}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </aside>
                <ReactMarkdown remarkPlugins={[remarkBreaks]} components={markdownComponents}>
                  {splitContent[1]}
                </ReactMarkdown>
              </>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkBreaks]} components={markdownComponents}>
                {article.content}
              </ReactMarkdown>
            )}
          </article>

          {/* Article Read Tracking */}
          <ArticleReadTracker articleId={article.id} articleTitle={article.title} />

          {/* Interactions (Likes, Share, Comments) */}
          <ArticleInteractions 
            articleId={article.id}
            initialLikesCount={article.likes_count || 0}
            initialViewsCount={article.views_count || 0}
          />

          {/* Newsletter Signup */}
          <NewsletterSignup source="article" />

          {/* Visible FAQ - same content as the FAQPage JSON-LD above */}
          <ArticleFaq faq={article.faq} />

          {/* Author Box */}
          <div className="bg-gradient-to-br from-amber-50 to-stone-50 rounded-2xl p-6 md:p-8 my-12">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Image
                src="https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/hero-desktop.png"
                alt="נירה גבאי - מטפלת בפסיכותרפיה ומדריכת הורים"
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
            recommendedSlugs={(article.internal_links || []).map((l) => l.slug).filter(Boolean)}
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
