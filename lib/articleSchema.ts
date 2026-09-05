// The BlogPosting node for a single article.
//
// It used to be built in two places - inline in app/articles/[slug]/page.tsx
// for articles that predate the SEO pipeline, and in lib/seo/generate.ts for
// the ones it inserts - and each place spelled the author out by hand:
//
//     author: { '@type': 'Person', name: 'נירה גבאי', jobTitle: '...', url: '...' }
//
// Three copies of one person, none of them linked to the Person node the root
// layout already emits. A parser reading an article page saw two unrelated
// people with the same name: the site's Person, and an author literal. That is
// the whole reason this file exists - the author is now a reference to the
// canonical node (see lib/identitySchema.ts), so the article and the person
// resolve as one graph.
//
// The stored `schema_json` column is still respected for the fields it is the
// authority on (headline, description, keywords - the pipeline's own editorial
// output). Everything that goes stale the moment a row is edited - the author,
// the publisher, dateModified, the URL - is recomputed here from the live row.

import { authorRef, publisherRef, webSiteRef, BASE_URL } from './identitySchema';

export type ArticleSchemaInput = {
  title: string;
  slug: string;
  content?: string | null;
  excerpt?: string | null;
  image_url?: string | null;
  created_date?: string | null;
  updated_date?: string | null;
  meta_description?: string | null;
  canonical_url?: string | null;
  tag_names?: string[] | null;
  schema_json?: Record<string, unknown> | null;
};

const FALLBACK_IMAGE =
  'https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/hero-desktop.png';

/** Words in the article body, for `wordCount`. Hebrew splits on whitespace. */
function countWords(content: string | null | undefined): number | undefined {
  if (!content) return undefined;
  const words = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*_>[\]()`|-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return words.length || undefined;
}

export function buildArticleSchema(article: ArticleSchemaInput): Record<string, unknown> {
  const url = article.canonical_url || `${BASE_URL}/articles/${article.slug}`;
  const datePublished = article.created_date || undefined;
  // Always the live value: the stored schema_json freezes dateModified at
  // insert time and goes stale on the first edit.
  const dateModified = article.updated_date || article.created_date || undefined;
  const tags = article.tag_names?.filter(Boolean) ?? [];

  // The stored schema_json is a *fallback*, never a preference. It was written
  // once at insert time from the row as it stood then, so every field it holds
  // is a snapshot: edit the title in /manage and the stored headline still says
  // what the title used to be. The live row wins on everything the live row
  // knows; the column only fills gaps for articles that predate a field.
  const stored = (article.schema_json ?? {}) as Record<string, unknown>;
  const asString = (value: unknown) =>
    typeof value === 'string' && value.trim() ? value : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: article.title,
    name: article.title,
    description:
      article.meta_description ||
      article.excerpt ||
      asString(stored.description) ||
      undefined,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: 'he-IL',
    datePublished,
    dateModified,
    image: article.image_url || FALLBACK_IMAGE,
    author: authorRef,
    // Schema.org allows Organization or Person here; the practice node is a
    // ProfessionalService, which is an Organization subtype, so this validates.
    publisher: publisherRef,
    isPartOf: webSiteRef,
    // `about` gives an AI answer engine the article's subjects as entities
    // rather than as a comma-joined string.
    ...(tags.length > 0
      ? {
          about: tags.map((tag) => ({ '@type': 'Thing', name: tag })),
          keywords: tags.join(', '),
          articleSection: tags[0],
        }
      : asString(stored.keywords)
        ? { keywords: asString(stored.keywords) }
        : {}),
    wordCount: countWords(article.content),
  };
}
