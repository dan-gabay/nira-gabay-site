import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { SERVICES_LIVE } from '@/lib/publish';
import { getService } from '@/lib/services';
import { TOPICS } from '@/lib/topics';
import {
  aboutMarkdown,
  articleMarkdown,
  articlesIndexMarkdown,
  clinicMarkdown,
  contactMarkdown,
  homeMarkdown,
  notFoundMarkdown,
  privacyMarkdown,
  serviceMarkdown,
  servicesIndexMarkdown,
  topicMarkdown,
  type ArticleFull,
  type ArticleSummary,
} from '@/lib/agent/markdown';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The Markdown representation of every public page.
//
// Reached two ways. Normally middleware.ts rewrites here when a request's
// Accept header ranks text/markdown above text/html, and the visitor's URL
// never changes - /services/cbt stays /services/cbt, it is just served as
// Markdown. It is also directly addressable at /api/md/<path> for anyone who
// would rather ask for it explicitly than negotiate.
//
// Header discipline, which is the part that decides whether this works behind
// a CDN at all:
// - Content-Type says what was actually sent (text/markdown, RFC 7763).
// - Vary: Accept tells every cache in front of this that the response depends
//   on the request's Accept header. Without it the first variant to be cached
//   is served to everyone, and half the audience gets the wrong one.

const SUMMARY_COLUMNS = 'slug, title, excerpt, reading_time, created_date, updated_date, tags';

function markdownResponse(body: string, status: number, negotiated: boolean) {
  const headers: Record<string, string> = {
    'Content-Type': 'text/markdown; charset=utf-8',
    Vary: 'Accept, Accept-Encoding',
    // Short enough that an edited article is not stale for long, long enough
    // that a crawler sweeping the site is not re-rendering every page.
    'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
  };
  // Only the direct /api/md/* address is a duplicate URL. The negotiated
  // variant is the page itself and must not be marked noindex.
  if (!negotiated) headers['X-Robots-Tag'] = 'noindex';
  return new NextResponse(body, { status, headers });
}

async function publishedArticles(limit?: number): Promise<ArticleSummary[]> {
  try {
    const supabase = supabaseServer();
    let query = supabase
      .from('articles')
      .select(SUMMARY_COLUMNS)
      .eq('is_published', true)
      .order('created_date', { ascending: false });
    if (limit) query = query.limit(limit);
    const { data } = await query;
    return (data || []) as ArticleSummary[];
  } catch {
    return [];
  }
}

async function publishedArticle(slug: string): Promise<ArticleFull | null> {
  try {
    const supabase = supabaseServer();
    const { data } = await supabase
      .from('articles')
      .select(`${SUMMARY_COLUMNS}, content`)
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();
    return (data as ArticleFull) || null;
  } catch {
    return null;
  }
}

/** `/articles/topic/anxiety` -> the topic's published members. */
async function topicArticles(tag: string): Promise<ArticleSummary[]> {
  const all = await publishedArticles();
  return all.filter((a) =>
    (a.tags || '')
      .split(',')
      .map((t) => t.trim())
      .includes(tag),
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await params;
  const segments = (path || []).map((s) => decodeURIComponent(s));
  const pathname = `/${segments.join('/')}`;
  const negotiated = req.headers.get('x-md-negotiated') === '1';
  const md = (body: string, status = 200) => markdownResponse(body, status, negotiated);

  // Root.
  if (segments.length === 0) {
    return md(homeMarkdown(await publishedArticles(3)));
  }

  const [first, second, third] = segments;

  if (segments.length === 1) {
    switch (first) {
      case 'about':
        return md(aboutMarkdown());
      case 'contact':
        return md(contactMarkdown());
      case 'privacy':
        return md(privacyMarkdown());
      case 'clinic':
        // Gated behind the same flag as the HTML page (lib/publish.ts), so the
        // Markdown representation cannot become a way around an unpublished page.
        if (!SERVICES_LIVE) break;
        return md(clinicMarkdown());
      case 'services':
        if (!SERVICES_LIVE) break;
        return md(servicesIndexMarkdown());
      case 'articles':
        return md(articlesIndexMarkdown(await publishedArticles()));
    }
  }

  if (segments.length === 2 && first === 'services' && SERVICES_LIVE) {
    const service = getService(second);
    if (service) return md(serviceMarkdown(service));
  }

  if (segments.length === 2 && first === 'articles') {
    const article = await publishedArticle(second);
    if (article) return md(articleMarkdown(article));
  }

  if (segments.length === 3 && first === 'articles' && second === 'topic') {
    const topic = TOPICS.find((t) => t.slug === third);
    if (topic) {
      const members = await topicArticles(topic.tag);
      // Matches app/sitemap.ts: a hub with fewer than two members is not a page.
      if (members.length >= 2) return md(topicMarkdown(topic, members));
    }
  }

  return md(notFoundMarkdown(pathname), 404);
}
