import { NextRequest, NextResponse } from 'next/server';
import { MANAGE_COOKIE, isManageAuthorized } from '@/lib/manageAuth';
import { googleConfigured } from '@/lib/google/auth';
import { GSC_SITE, inspectUrl, searchAnalytics, sitePath } from '@/lib/google/gsc';
import { windows } from '@/lib/google/dates';
import type { GoogleArticle } from '@/lib/google/types';

export const runtime = 'nodejs';

// One article in Google, for the SEO card of the edit page: its search
// queries over the last 90 days and its index status from URL Inspection.
// The search rows are the site-wide page and page x query reports, filtered
// here, so they share the cache with every other article and with the
// organic card instead of spending a call per article.

const DAYS = 90;
const QUERIES = 15;

const round1 = (n: number) => Math.round(n * 10) / 10;

export async function GET(req: NextRequest) {
  if (!(await isManageAuthorized(req.cookies.get(MANAGE_COOKIE)?.value))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const slug = req.nextUrl.searchParams.get('slug') || '';
  if (!/^[a-z0-9-]+$/.test(slug)) return NextResponse.json({ error: 'bad slug' }, { status: 400 });
  if (!googleConfigured('gsc')) return NextResponse.json({ configured: false });

  const path = `/articles/${slug}`;
  const url = new URL(path, GSC_SITE).toString();
  const w = windows(DAYS).current;

  const [search, index] = await Promise.allSettled([
    Promise.all([
      searchAnalytics({ ...w, dimensions: ['page'] }),
      searchAnalytics({ ...w, dimensions: ['page', 'query'] }),
    ]),
    inspectUrl(url),
  ]);
  if (search.status === 'rejected') console.error('manage google article search failed:', search.reason);
  if (index.status === 'rejected') console.error('manage google article inspection failed:', index.reason);

  let totals: Extract<GoogleArticle, { configured: true }>['totals'] = null;
  let queries: Extract<GoogleArticle, { configured: true }>['queries'] = [];
  if (search.status === 'fulfilled') {
    const [pages, pageQueries] = search.value;
    const page = pages.find((r) => sitePath(r.keys[0]) === path);
    totals = page
      ? { clicks: page.clicks, impressions: page.impressions, position: round1(page.position) }
      : { clicks: 0, impressions: 0, position: null };
    queries = pageQueries
      .filter((r) => sitePath(r.keys[0]) === path)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, QUERIES)
      .map((r) => ({ query: r.keys[1], clicks: r.clicks, impressions: r.impressions, position: round1(r.position) }));
  }

  const body: GoogleArticle = {
    configured: true,
    days: DAYS,
    totals,
    queries,
    index: index.status === 'fulfilled' ? index.value : null,
  };
  return NextResponse.json(body);
}
