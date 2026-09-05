import type { Metadata } from 'next';
import { supabaseServer } from '../../lib/supabaseServer';
import ArticlesBrowser, { type ArticleListItem, type Tag } from './ArticlesBrowser';
import JsonLd from '@/components/JsonLd';
import { BASE_URL, authorRef, webSiteRef } from '@/lib/identitySchema';

// Revalidate the article list every 5 minutes (ISR)
export const revalidate = 300;

// Metadata lives on the page (not a layout) so it applies to the index route
// only. A layout here would shadow the root title template ('%s | נירה גבאי')
// for the [slug] child route, leaving articles without meta_title unbranded.
export const metadata: Metadata = {
  title: { absolute: 'מאמרים - נירה גבאי | פסיכותרפיה, הורות וזוגיות' },
  description:
    'מאמרים מאת נירה גבאי, מטפלת בפסיכותרפיה ומדריכת הורים, על פסיכותרפיה, הדרכת הורים, זוגיות, CBT והתמודדות רגשית.',
  alternates: {
    canonical: 'https://www.niragabay.com/articles',
  },
  openGraph: {
    title: 'מאמרים - נירה גבאי | פסיכותרפיה, הורות וזוגיות',
    description:
      'מאמרים על פסיכותרפיה, הדרכת הורים, זוגיות, CBT והתמודדות רגשית.',
    url: 'https://www.niragabay.com/articles',
    type: 'website',
  },
};

type SearchParams = Promise<{ search?: string; tag?: string }>;

export default async function Articles({ searchParams }: { searchParams: SearchParams }) {
  const { search, tag } = await searchParams;
  const supabase = supabaseServer();

  // List fields only - content is intentionally not fetched
  const [{ data: articlesData }, { data: tagsData }] = await Promise.all([
    supabase
      .from('articles')
      .select('id, title, slug, excerpt, image_url, reading_time, likes_count, views_count, created_date, is_published, tags')
      .eq('is_published', true)
      .order('created_date', { ascending: false }),
    supabase.from('tags').select('id, name'),
  ]);

  // Transform the data to extract tag names from the tags string field
  const articles: ArticleListItem[] = (articlesData || []).map((article) => ({
    ...article,
    tag_names: article.tags
      ? article.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : [],
  }));

  const allTags: Tag[] = tagsData || [];

  // The index was the one content route with no structured data at all: an AI
  // answer engine arriving here saw a page of links and no statement of what
  // they were. Same shape as the topic hubs (CollectionPage wrapping an
  // ItemList) so the two read consistently.
  //
  // The list is built from the full published set, not from the filtered view -
  // ?search= and ?tag= are canonicalised to /articles, so the markup has to
  // describe the canonical page.
  const url = `${BASE_URL}/articles`;
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#collection`,
    name: 'מאמרים - נירה גבאי',
    description:
      'מאמרים מאת נירה גבאי, מטפלת בפסיכותרפיה ומדריכת הורים, על פסיכותרפיה, הדרכת הורים, זוגיות, CBT והתמודדות רגשית.',
    url,
    inLanguage: 'he-IL',
    isPartOf: webSiteRef,
    author: authorRef,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: articles.length,
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
      { '@type': 'ListItem', position: 2, name: 'מאמרים', item: url },
    ],
  };

  return (
    <>
      <JsonLd data={collectionSchema} />
      <JsonLd data={breadcrumbSchema} />
      <ArticlesBrowser
        articles={articles}
        allTags={allTags}
        initialSearch={typeof search === 'string' ? search : undefined}
        initialTag={typeof tag === 'string' ? tag : undefined}
      />
    </>
  );
}
