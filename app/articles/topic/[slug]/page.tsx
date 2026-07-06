import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { supabaseServer } from '../../../../lib/supabaseServer';
import { TOPICS, TOPIC_BY_SLUG } from '../../../../lib/topics';
import ArticleGrid from '@/components/ArticleGrid';
import JsonLd from '@/components/JsonLd';
import type { ArticleListItem } from '../../ArticlesBrowser';

// Revalidate hub pages every 5 minutes, like the article index
export const revalidate = 300;

const BASE_URL = 'https://www.niragabay.com';

export function generateStaticParams() {
  return TOPICS.map((t) => ({ slug: t.slug }));
}

// One fetch per request, shared between generateMetadata and the page
const getTopicArticles = cache(async (tag: string): Promise<ArticleListItem[]> => {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from('articles')
    .select('id, title, slug, excerpt, image_url, reading_time, created_date, tags')
    .eq('is_published', true)
    .order('created_date', { ascending: false });

  return (data || [])
    .map((a) => ({
      ...a,
      tag_names: a.tags
        ? a.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : [],
    }))
    .filter((a) => a.tag_names.includes(tag));
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = TOPIC_BY_SLUG.get(slug);
  if (!topic) {
    return { title: 'נושא לא נמצא', robots: { index: false, follow: false } };
  }

  const articles = await getTopicArticles(topic.tag);
  const url = `${BASE_URL}/articles/topic/${topic.slug}`;

  return {
    title: { absolute: topic.metaTitle },
    description: topic.metaDescription,
    alternates: { canonical: url },
    // Thin-hub guard: stay out of the index until the topic has enough content
    robots: articles.length < 2 ? { index: false, follow: true } : undefined,
    openGraph: {
      title: topic.metaTitle,
      description: topic.metaDescription,
      url,
      type: 'website',
      locale: 'he_IL',
      siteName: 'נירה גבאי',
    },
  };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = TOPIC_BY_SLUG.get(slug);
  if (!topic) notFound();

  const articles = await getTopicArticles(topic.tag);
  const url = `${BASE_URL}/articles/topic/${topic.slug}`;
  const otherTopics = TOPICS.filter((t) => t.slug !== topic.slug);

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: topic.title,
    description: topic.metaDescription,
    url,
    inLanguage: 'he-IL',
    isPartOf: { '@type': 'WebSite', name: 'נירה גבאי', url: BASE_URL },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: articles.map((a, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${BASE_URL}/articles/${a.slug}`,
        name: a.title,
      })),
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'דף הבית', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'מאמרים', item: `${BASE_URL}/articles` },
      { '@type': 'ListItem', position: 3, name: topic.title, item: url },
    ],
  };

  return (
    <div className="overflow-hidden" style={{ paddingTop: '80px' }}>
      <JsonLd data={collectionSchema} />
      <JsonLd data={breadcrumbSchema} />

      {/* Hero */}
      <section className="py-10 md:py-16 bg-gradient-to-br from-stone-100 to-amber-50">
        <div className="container mx-auto px-4 md:px-8">
          <nav aria-label="ניווט" className="text-sm text-stone-500 mb-4 text-center">
            <Link href="/" className="hover:text-amber-700">דף הבית</Link>
            <span className="mx-2">/</span>
            <Link href="/articles" className="hover:text-amber-700">מאמרים</Link>
            <span className="mx-2">/</span>
            <span className="text-stone-700">{topic.title}</span>
          </nav>
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-block px-3 py-1.5 bg-amber-100 rounded-full text-amber-800 text-sm mb-4">
              {topic.tag}
            </span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-stone-800 mb-3 md:mb-4">
              {topic.title}
            </h1>
            <p className="text-base md:text-lg text-stone-600">{topic.subtitle}</p>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="py-8 md:py-10 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto space-y-4">
            {topic.intro.map((p, i) => (
              <p key={i} className="text-stone-600 leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className="py-8 md:py-12 bg-gradient-to-b from-white to-stone-50">
        <div className="container mx-auto px-4 md:px-8">
          <h2 className="text-2xl font-bold text-stone-800 mb-6 md:mb-8">
            מאמרים בנושא {topic.tag}
          </h2>
          {articles.length > 0 ? (
            <ArticleGrid articles={articles} />
          ) : (
            <p className="text-stone-600 py-10 text-center">מאמרים חדשים בנושא יעלו בקרוב.</p>
          )}
        </div>
      </section>

      {/* Other topics */}
      <section className="py-8 md:py-10 bg-white border-t border-stone-100">
        <div className="container mx-auto px-4 md:px-8">
          <h2 className="text-lg font-bold text-stone-800 mb-4">נושאים נוספים</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/articles"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors"
            >
              כל המאמרים
            </Link>
            {otherTopics.map((t) => (
              <Link
                key={t.slug}
                href={`/articles/topic/${t.slug}`}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors"
              >
                {t.tag}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-amber-50">
        <div className="container mx-auto px-4 md:px-8 text-center">
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
