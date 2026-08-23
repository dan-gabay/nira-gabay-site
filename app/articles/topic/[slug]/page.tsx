import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { supabaseServer } from '../../../../lib/supabaseServer';
import { TOPICS, TOPIC_BY_SLUG } from '../../../../lib/topics';
import {
  TEAL_DARK,
  MINT,
  ARTICLES_HERO_BG,
  CHIP_BASE,
  CHIP_IDLE,
  CHIP_ACTIVE,
} from '@/lib/palette';
import ArticleRow from '@/components/ArticleRow';
import ArticleCtaBanner from '@/components/ArticleCtaBanner';
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
    <div style={{ paddingTop: '80px' }}>
      <JsonLd data={collectionSchema} />
      <JsonLd data={breadcrumbSchema} />

      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden" style={{ background: TEAL_DARK }}>
        {/* Anchored left so the artwork's leaf survives the crop on narrow screens */}
        <Image
          src={ARTICLES_HERO_BG}
          alt=""
          fill
          priority
          className="object-cover"
          style={{ objectPosition: 'left center' }}
          sizes="100vw"
        />

        <div className="relative container mx-auto px-4 md:px-8 pt-5 pb-14 md:pt-12 md:pb-24">
          <nav
            aria-label="ניווט"
            className="text-[11px] md:text-sm text-white/60 mb-4 md:mb-6 text-center"
          >
            <Link href="/" className="hover:text-white transition-colors">
              דף הבית
            </Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <Link href="/articles" className="hover:text-white transition-colors">
              מאמרים
            </Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <span className="text-white/90">{topic.tag}</span>
          </nav>

          <div className="text-center max-w-2xl mx-auto">
            <span
              className="block w-10 md:w-12 h-px mx-auto mb-4 md:mb-6"
              style={{ background: 'rgba(255,255,255,0.35)' }}
            />
            <h1
              className="text-2xl md:text-5xl font-bold mb-2 md:mb-4 leading-tight"
              style={{ color: MINT }}
            >
              {topic.title}
            </h1>
            <p className="text-sm md:text-lg text-white/80 leading-relaxed">
              {topic.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* ───────── Topic chips (all crawlable links) ───────── */}
      <div className="container mx-auto px-4 md:px-8 pt-5 md:pt-8">
        <div
          className="flex items-center gap-2 md:gap-2.5 overflow-x-auto scrollbar-hide pb-1 md:justify-center"
          aria-label="ניווט בין נושאים"
        >
          <Link href="/articles" className={`${CHIP_BASE} ${CHIP_IDLE}`}>
            כל המאמרים
          </Link>
          {TOPICS.map((t) => {
            const isActive = t.slug === topic.slug;
            return (
              <Link
                key={t.slug}
                href={`/articles/topic/${t.slug}`}
                aria-current={isActive ? 'page' : undefined}
                className={`${CHIP_BASE} ${isActive ? CHIP_ACTIVE : CHIP_IDLE}`}
                style={isActive ? { background: MINT } : undefined}
              >
                {t.tag}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ───────── Intro ───────── */}
      <section className="pt-6 md:pt-10 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto lg:max-w-4xl space-y-3 md:space-y-4">
            {topic.intro.map((p, i) => (
              <p
                key={i}
                className="text-sm md:text-base text-stone-600 leading-relaxed"
              >
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Articles ───────── */}
      <section className="py-6 md:py-10 bg-gradient-to-b from-white to-stone-50">
        <div className="container mx-auto px-4 md:px-8">
          {/* The intro above stays in a reading-width column; the article
              grid takes the full container back on desktop. */}
          <div className="max-w-3xl mx-auto md:max-w-none">
            <h2 className="text-lg md:text-2xl font-bold text-stone-800 mb-4 md:mb-6">
              מאמרים בנושא {topic.tag}
            </h2>
            {articles.length > 0 ? (
              <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-5 lg:gap-6">
                {articles.map((article, index) => (
                  <ArticleRow
                    key={article.id}
                    article={article}
                    index={index}
                    headingLevel={3}
                  />
                ))}
              </div>
            ) : (
              <p className="text-stone-600 py-10 text-center">
                מאמרים חדשים בנושא יעלו בקרוב.
              </p>
            )}
          </div>
        </div>
      </section>

      <ArticleCtaBanner source="topic_page_cta" />
    </div>
  );
}
