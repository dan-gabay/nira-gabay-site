// The site's public URL list, in one place.
//
// It existed already, inline in app/sitemap.ts. IndexNow needs the same list -
// and needs to know which entries actually changed - so it moved here rather
// than being written a second time and left to drift from the sitemap.
//
// Each entry carries a `contentKey`: a short string that changes when, and
// only when, the page's content changes. That is what lets IndexNow submit an
// article the day it is published and stay quiet about it on every deploy
// afterwards, which is what the protocol asks for.

import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TOPICS } from './topics';
import { SERVICES } from './services';
import { SERVICES_LIVE } from './publish';

export const BASE_URL = 'https://www.niragabay.com';

/**
 * The content key for the pages whose text lives in JSX rather than in data:
 * /, /about, /contact, /clinic, /articles, /services, /privacy.
 *
 * Nothing can derive their content automatically at runtime - the source files
 * are not in the deployed lambda - so this is the manual half of the scheme.
 * Bump it when one of those pages gets a real content edit; leave it alone for
 * styling and layout. Getting it wrong in the quiet direction costs a slightly
 * late re-crawl. Bumping it on every deploy would be exactly the spam IndexNow
 * asks implementers not to send.
 */
export const STATIC_CONTENT_VERSION = '2026-10-10';

/**
 * The same, for the service pages (lib/services.ts). Their content key is a
 * hash of the copy, so IndexNow never needs this - but a sitemap <lastmod>
 * does, and nothing at runtime knows when that copy last changed. Bump it with
 * a real edit to a service page.
 */
export const SERVICES_CONTENT_VERSION = '2026-10-27';

// What these pages used to claim was `new Date()`: every fetch of the sitemap
// said every static page had changed that very second. Google documents that
// it ignores <lastmod> from a sitemap where it proves inaccurate, and it then
// stops trusting the article dates too, which are the ones that are real. A
// date that only moves when the content does is the whole value of the field.
const asDate = (day: string) => `${day}T00:00:00.000Z`;

/** The later of two timestamps (ISO strings compare correctly as text). */
const later = (a: string, b: string | null | undefined) => (b && b > a ? b : a);

const hash = (value: unknown) =>
  createHash('sha1').update(JSON.stringify(value)).digest('hex').slice(0, 12);

export type SiteUrl = {
  url: string;
  lastModified: Date | string;
  changeFrequency: 'weekly' | 'monthly' | 'yearly';
  priority: number;
  /** Changes if and only if the page's content changed. */
  contentKey: string;
};

type ArticleRow = {
  slug: string;
  updated_date: string | null;
  created_date: string | null;
  tags: string | null;
};

export async function getSiteUrls(supabase: SupabaseClient): Promise<SiteUrl[]> {
  const { data } = await supabase
    .from('articles')
    .select('slug, updated_date, created_date, tags')
    .eq('is_published', true);

  const articles = (data || []) as ArticleRow[];
  const staticKey = `static:${STATIC_CONTENT_VERSION}`;

  // The homepage and the articles index list the newest articles, so they
  // change when one is published or rewritten as well as when their own copy
  // does.
  const staticDay = asDate(STATIC_CONTENT_VERSION);
  const newestArticle = articles
    .map((a) => a.updated_date || a.created_date)
    .filter((d): d is string => Boolean(d))
    .sort()
    .pop();
  const listingDay = later(staticDay, newestArticle);

  const pages: SiteUrl[] = [
    { url: BASE_URL, lastModified: listingDay, changeFrequency: 'monthly', priority: 1, contentKey: staticKey },
    { url: `${BASE_URL}/about`, lastModified: staticDay, changeFrequency: 'monthly', priority: 0.9, contentKey: staticKey },
    { url: `${BASE_URL}/articles`, lastModified: listingDay, changeFrequency: 'weekly', priority: 0.9, contentKey: staticKey },
    ...(SERVICES_LIVE
      ? [{ url: `${BASE_URL}/clinic`, lastModified: staticDay, changeFrequency: 'monthly' as const, priority: 0.8, contentKey: staticKey }]
      : []),
    { url: `${BASE_URL}/contact`, lastModified: staticDay, changeFrequency: 'monthly', priority: 0.7, contentKey: staticKey },
    // A trust-anchor page: about/contact/privacy are the three an AI agent
    // checks before it will name a business. Low priority, but it has to be
    // discoverable to count.
    { url: `${BASE_URL}/privacy`, lastModified: staticDay, changeFrequency: 'yearly', priority: 0.3, contentKey: staticKey },
    { url: `${BASE_URL}/accessibility`, lastModified: staticDay, changeFrequency: 'yearly', priority: 0.3, contentKey: staticKey },
    ...(SERVICES_LIVE
      ? [{ url: `${BASE_URL}/services`, lastModified: asDate(SERVICES_CONTENT_VERSION), changeFrequency: 'monthly' as const, priority: 0.9, contentKey: staticKey }]
      : []),
  ];

  // Service pages: the commercial-intent entry points, ranked just under the
  // homepage. Static copy, so lastModified is SERVICES_CONTENT_VERSION rather
  // than a row - but the content key tracks the copy itself, so editing one
  // service page submits that page and not the other five.
  const serviceUrls: SiteUrl[] = (SERVICES_LIVE ? SERVICES : []).map((s) => ({
    url: `${BASE_URL}/services/${s.slug}`,
    lastModified: asDate(SERVICES_CONTENT_VERSION),
    changeFrequency: 'monthly',
    priority: 0.9,
    contentKey: `service:${hash(s)}`,
  }));

  // Topic hub pages - only hubs with 2+ published articles (thinner hubs
  // noindex themselves and stay out of the sitemap until they fill up).
  const topicUrls: SiteUrl[] = TOPICS.flatMap((topic) => {
    const members = articles.filter((a) =>
      (a.tags || '').split(',').map((t) => t.trim()).includes(topic.tag),
    );
    if (members.length < 2) return [];
    const lastModified = members
      .map((a) => a.updated_date || a.created_date)
      .filter(Boolean)
      .sort()
      .pop();
    return [{
      url: `${BASE_URL}/articles/topic/${topic.slug}`,
      lastModified: lastModified || staticDay,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      // A hub changes when its membership or its own copy changes.
      contentKey: `topic:${hash([topic, members.map((m) => m.slug).sort(), lastModified])}`,
    }];
  });

  const articleUrls: SiteUrl[] = articles.map((article) => ({
    url: `${BASE_URL}/articles/${article.slug}`,
    lastModified: article.updated_date || article.created_date || staticDay,
    changeFrequency: 'weekly',
    priority: 0.8,
    // The row's own timestamp is the truth about when it last changed.
    contentKey: `article:${article.updated_date || article.created_date || ''}`,
  }));

  return [...pages, ...serviceUrls, ...topicUrls, ...articleUrls];
}
