import { cache } from 'react';
import { draftMode } from 'next/headers';
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
import ArticleCtaBanner from '@/components/ArticleCtaBanner';
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
  updated_date?: string;
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

// Fetch the article once per request (shared between generateMetadata and the
// page). In Draft Mode (enabled via /api/preview, used by the /manage
// "preview" button) the is_published filter is skipped so unpublished
// drafts render through the exact same template instead of 404ing.
const getArticle = cache(async (slug: string, isPreview: boolean): Promise<Article | null> => {
  const supabase = supabaseServer();

  // First try by slug
  let query = supabase.from('articles').select('*').eq('slug', slug);
  if (!isPreview) query = query.eq('is_published', true);
  let { data: row } = await query.single();

  // If not found by slug, try by ID
  if (!row) {
    let queryById = supabase.from('articles').select('*').eq('id', slug);
    if (!isPreview) queryById = queryById.eq('is_published', true);
    const { data: rowById } = await queryById.single();
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
  const { isEnabled: isPreview } = await draftMode();
  const article = await getArticle(slug, isPreview);

  if (!article) {
    return {
      title: 'מאמר לא נמצא',
      robots: { index: false, follow: false },
    };
  }

  // A previewed draft's metadata is otherwise generated normally (so you can
  // see exactly how the real title/description will look) - only robots is
  // forced noindex, as a defense-in-depth belt (a real crawler never has the
  // draft-mode cookie in the first place, so this shouldn't ever matter).
  const isUnpublishedPreview = isPreview && !article.is_published;

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
      modifiedTime: article.updated_date || article.created_date,
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
    ...(isUnpublishedPreview ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params; // Next.js 15+: params is a Promise!
  const { isEnabled: isPreview } = await draftMode();

  // Cached fetch (deduped with generateMetadata): by slug first, then by ID
  const article = await getArticle(slug, isPreview);

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
  // dateModified always comes from the live updated_date (the stored
  // schema_json freezes it at insert time and goes stale on every edit).
  const dateModified = article.updated_date || article.created_date;
  const articleSchema = article.schema_json
    ? { ...article.schema_json, dateModified }
    : {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.meta_description || article.excerpt,
    image: article.image_url,
    datePublished: article.created_date,
    dateModified,
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
      {isPreview && !article.is_published && (
        <div className="bg-amber-500 text-stone-900 text-sm font-medium py-2 px-4 flex items-center justify-center gap-3">
          <span>תצוגה מקדימה - המאמר עדיין לא פורסם</span>
          <a href="/api/preview/disable" className="underline hover:no-underline">
            יציאה מתצוגה מקדימה
          </a>
        </div>
      )}
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      {faqSchema && <JsonLd data={faqSchema} />}
      {!isPreview && (
        <ArticleViewTracker
          articleId={article.id}
          articleTitle={article.title}
          tags={article.tag_names || []}
        />
      )}

      {/* Breadcrumb */}
      <div className="bg-stone-50 py-2.5 border-b border-stone-100">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          {/* Fixed crumbs must not shrink or the flex layout squeezes them and
              Hebrew words break mid-word on mobile; only the title flexes. */}
          <nav className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-stone-500">
            <Link href="/" className="hover:text-stone-800 shrink-0 whitespace-nowrap">דף הבית</Link>
            <span className="shrink-0">/</span>
            <Link href="/articles" className="hover:text-stone-800 shrink-0 whitespace-nowrap">מאמרים</Link>
            {primaryTopic && (
              <>
                <span className="shrink-0">/</span>
                <Link href={`/articles/topic/${primaryTopic.slug}`} className="hover:text-stone-800 shrink-0 whitespace-nowrap">
                  {primaryTopic.tag}
                </Link>
              </>
            )}
            <span className="shrink-0">/</span>
            <span className="text-stone-800 truncate min-w-0">{article.title}</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <section className="py-4 md:py-6 bg-gradient-to-br from-stone-100 to-amber-50">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          {/* Tags */}
          {article.tag_names && article.tag_names.length > 0 && (
            <div className="flex flex-wrap gap-1.5 md:gap-2 mb-2.5 md:mb-3">
              {article.tag_names.map((tag, i) => (
                <ArticleTag key={i} tag={tag} articleId={article.id} />
              ))}
            </div>
          )}
          
          <h1 className="text-2xl md:text-3xl font-bold text-stone-800 mb-2.5 font-serif leading-snug">
            {article.title}
          </h1>
          
          {article.excerpt && (
            <p className="text-sm md:text-base text-stone-600 leading-relaxed mb-3 md:mb-4">
              {article.excerpt}
            </p>
          )}
          
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:gap-4 text-xs md:text-sm text-stone-500">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-amber-100 to-stone-200 flex items-center justify-center">
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
      <section className="pt-4 pb-10 md:pt-6 md:pb-16">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          {/* Featured Image */}
          {article.image_url && (
            <div className="mb-5 md:mb-12 relative w-full aspect-[16/9] rounded-xl overflow-hidden shadow-lg">
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
          
          {/* Article Content.
              `prose` is a plain hook for the article-body rules in
              globals.css - @tailwindcss/typography is not installed, so
              prose-* utilities would generate nothing. Sizes and spacing
              (including the mobile/desktop scale) all live in that stylesheet.

              It sits on the markdown wrappers rather than the <article> so the
              aside below is outside prose scope. Typography's `not-prose`
              escape hatch compiles to nothing here too, so while the aside was
              inside prose its paragraph and list picked up the body rhythm -
              14px paragraph margins, a 20px list margin and a bullet indent -
              on top of the box's own padding. Out of scope, its own classes
              apply as written. */}
          <article className="max-w-none font-assistant mb-8 md:mb-12">
            {splitContent && inlineLinks.length > 0 ? (
              <>
                <div className="prose max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkBreaks]} components={markdownComponents}>
                    {splitContent[0]}
                  </ReactMarkdown>
                </div>
                <aside className="bg-amber-50 border border-amber-200 rounded-2xl p-4 md:p-6 my-6 md:my-8">
                  <p className="font-bold text-stone-800 text-sm md:text-base mb-2 md:mb-3">מומלץ לקרוא גם:</p>
                  <ul className="space-y-1.5 md:space-y-2 text-sm md:text-base">
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
                <div className="prose max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkBreaks]} components={markdownComponents}>
                    {splitContent[1]}
                  </ReactMarkdown>
                </div>
              </>
            ) : (
              <div className="prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkBreaks]} components={markdownComponents}>
                  {article.content}
                </ReactMarkdown>
              </div>
            )}
          </article>

          {/* Article Read Tracking */}
          <ArticleReadTracker
            articleId={article.id}
            articleTitle={article.title}
            readingTime={article.reading_time}
          />

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
          <div className="bg-gradient-to-br from-amber-50 to-stone-50 rounded-2xl p-5 md:p-8 my-8 md:my-12">
            <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
              <Image
                src="https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/hero-desktop.png"
                alt="נירה גבאי - מטפלת בפסיכותרפיה ומדריכת הורים"
                width={96}
                height={96}
                className="w-16 h-16 md:w-24 md:h-24 rounded-full object-cover shadow-lg flex-shrink-0"
                loading="lazy"
              />
              <div className="text-center sm:text-right">
                <h3 className="text-lg md:text-xl font-bold text-stone-800 mb-1.5 md:mb-2 font-serif">נירה גבאי</h3>
                <p className="text-stone-600 text-xs md:text-sm mb-3 md:mb-4">
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

          {/* Back Link - a single anchor, not a button nested inside one */}
          <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-stone-200 flex justify-center">
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 min-h-[44px] px-5 md:px-6 rounded-full border border-stone-300 text-stone-700 text-sm md:text-base hover:border-stone-400 hover:bg-stone-50 transition-colors"
            >
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
              חזרה לכל המאמרים
            </Link>
          </div>
        </div>
      </section>

      <ArticleCtaBanner source="article_page_cta" />
    </div>
  );
}
