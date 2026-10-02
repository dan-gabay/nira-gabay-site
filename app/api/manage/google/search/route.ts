import { NextRequest, NextResponse } from 'next/server';
import { MANAGE_COOKIE, isManageAuthorized } from '@/lib/manageAuth';
import { googleConfigured } from '@/lib/google/auth';
import { searchAnalytics, sitePath, type GscRow } from '@/lib/google/gsc';
import { googleDays, windows } from '@/lib/google/dates';
import type { GoogleSearch, GoogleSearchQuery } from '@/lib/google/types';

export const runtime = 'nodejs';

// Search Console for the organic card: what people searched per page, the
// queries Google already shows the site for but far down, and the daily
// trend against the previous window. Read live (cached in lib/google), never
// stored. Its own call so a Google failure leaves the rest of the dashboard
// standing, the same as /api/manage/organic-search.

const ALLOWED_RANGES = [1, 7, 30, 90];

// "Far back": Google associates the page with the query but ranks it past the
// first page and a half. Below this many impressions a position is noise.
const FAR_FROM = 15;
const FAR_MIN_IMPRESSIONS = 5;

const PAGES = 30;
const QUERIES_PER_PAGE = 10;
const FAR_ROWS = 30;

const round1 = (n: number) => Math.round(n * 10) / 10;

const sum = (rows: GscRow[]) => ({
  clicks: rows.reduce((a, r) => a + r.clicks, 0),
  impressions: rows.reduce((a, r) => a + r.impressions, 0),
});

export async function GET(req: NextRequest) {
  if (!(await isManageAuthorized(req.cookies.get(MANAGE_COOKIE)?.value))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!googleConfigured('gsc')) return NextResponse.json({ configured: false });

  const asked = Number(req.nextUrl.searchParams.get('range') || 30);
  const range = ALLOWED_RANGES.includes(asked) ? asked : 30;
  const days = googleDays(range);
  const w = windows(days);

  try {
    const [daily, prevDaily, pages, queries, pageQueries] = await Promise.all([
      searchAnalytics({ ...w.current, dimensions: ['date'] }),
      searchAnalytics({ ...w.previous, dimensions: ['date'] }),
      searchAnalytics({ ...w.current, dimensions: ['page'] }),
      searchAnalytics({ ...w.current, dimensions: ['query'] }),
      searchAnalytics({ ...w.current, dimensions: ['page', 'query'] }),
    ]);

    const byPage = new Map<string, GoogleSearchQuery[]>();
    const byQuery = new Map<string, Array<{ path: string; position: number; impressions: number }>>();
    for (const r of pageQueries) {
      const path = sitePath(r.keys[0]);
      const q = { query: r.keys[1], clicks: r.clicks, impressions: r.impressions, position: round1(r.position) };
      byPage.set(path, [...(byPage.get(path) || []), q]);
      byQuery.set(q.query, [
        ...(byQuery.get(q.query) || []),
        { path, position: q.position, impressions: r.impressions },
      ]);
    }

    const body: GoogleSearch = {
      configured: true,
      days,
      widened: days !== range,
      totals: sum(daily),
      previous: sum(prevDaily),
      daily: daily.map((r) => ({ day: r.keys[0], clicks: r.clicks, impressions: r.impressions })),
      pages: pages
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, PAGES)
        .map((r) => {
          const path = sitePath(r.keys[0]);
          return {
            path,
            clicks: r.clicks,
            impressions: r.impressions,
            position: round1(r.position),
            queries: (byPage.get(path) || []).sort((a, b) => b.impressions - a.impressions).slice(0, QUERIES_PER_PAGE),
          };
        }),
      far: queries
        .filter((r) => r.position > FAR_FROM && r.impressions >= FAR_MIN_IMPRESSIONS)
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, FAR_ROWS)
        .map((r) => {
          const shown = (byQuery.get(r.keys[0]) || []).sort((a, b) => b.impressions - a.impressions);
          return {
            query: r.keys[0],
            clicks: r.clicks,
            impressions: r.impressions,
            position: round1(r.position),
            path: shown[0]?.path ?? null,
            competing: shown.length > 1 ? shown.map(({ path, position }) => ({ path, position })) : [],
          };
        }),
    };
    return NextResponse.json(body);
  } catch (e) {
    console.error('manage google search failed:', e);
    return NextResponse.json({ error: 'load failed' }, { status: 502 });
  }
}
