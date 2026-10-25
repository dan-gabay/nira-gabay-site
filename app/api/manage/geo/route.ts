import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { MANAGE_COOKIE, isManageAuthorized } from '@/lib/manageAuth';
import { BASE_URL, getSiteUrls } from '@/lib/siteUrls';
import { TOPICS } from '@/lib/topics';
import { SERVICES } from '@/lib/services';
import { addDays, israelDay } from '@/lib/trends';
import { BASELINE_DAYS, buildCrawlReport, unreadListedPages, type BotHit } from '@/lib/geo/crawl';
import { loadVisibilityReport } from '@/lib/geo/visibility';
import { runQuickChecks } from '@/lib/geo/siteChecks';

export const runtime = 'nodejs';
// Never cached: the page is a live read, and it sits behind the admin gate.
export const dynamic = 'force-dynamic';

// The GEO section (/manage/analytics, folded under מקורות) in one call: crawl activity from bot_hits, AI
// referral visits from manage_analytics, the prompt observations from the
// repo, and a quick live check of what the site serves to crawlers.
//
// No migration. bot_hits is read directly (three columns, paged) and folded in
// lib/geo/crawl.ts; manage_analytics already separates ai_referral visits. If
// the table grows past what paging comfortably handles, the fold moves into an
// SQL function - the shape of this response would not change.
//
// Nothing about a person leaves this route: bot_hits holds no IP, user agent
// or session, and from manage_analytics only the ai_referral group's counts
// and tool names are passed on.

const ALLOWED_RANGES = [7, 30, 56, 90];
const PAGE = 1000;
const MAX_ROWS = 200_000;

export async function GET(req: NextRequest) {
  if (!(await isManageAuthorized(req.cookies.get(MANAGE_COOKIE)?.value))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const asked = Number(req.nextUrl.searchParams.get('range') || 56);
  const days = ALLOWED_RANGES.includes(asked) ? asked : 56;
  const today = israelDay(new Date());
  // The window plus the days the spike baseline reads, plus one for the
  // Israel/UTC day boundary.
  const since = new Date(`${addDays(today, -(days + BASELINE_DAYS))}T00:00:00+03:00`).toISOString();

  try {
    const supabase = supabaseServer();
    const columns = 'created_at, bot_kind, path, bot_agent';

    const [{ count, error: countError }, first, analytics, siteUrls, titles] = await Promise.all([
      supabase.from('bot_hits').select('id', { count: 'exact', head: true }).gte('created_at', since),
      supabase.from('bot_hits').select('created_at').order('created_at', { ascending: true }).limit(1),
      supabase.rpc('manage_analytics', { p_days: days }),
      getSiteUrls(supabase),
      supabase.from('articles').select('slug, title').eq('is_published', true),
    ]);
    if (countError) throw new Error(countError.message);

    const total = Math.min(count ?? 0, MAX_ROWS);
    const pages = Math.ceil(total / PAGE);
    const rows: BotHit[] = [];
    // Ten pages at a time: fast enough, and polite to PostgREST.
    for (let start = 0; start < pages; start += 10) {
      const batch = await Promise.all(
        Array.from({ length: Math.min(10, pages - start) }, (_, i) =>
          supabase
            .from('bot_hits')
            .select(columns)
            .gte('created_at', since)
            .order('id', { ascending: true })
            .range((start + i) * PAGE, (start + i + 1) * PAGE - 1),
        ),
      );
      for (const r of batch) {
        if (r.error) throw new Error(r.error.message);
        rows.push(...((r.data || []) as unknown as BotHit[]));
      }
    }

    const listed = new Set(siteUrls.map((u) => new URL(u.url).pathname));
    const valid = new Set<string>([
      '/services',
      '/clinic',
      '/accessibility',
      ...TOPICS.map((t) => `/articles/topic/${t.slug}`),
      ...SERVICES.map((s) => `/services/${s.slug}`),
    ]);
    const redirects = new Set(['/blog', '/articles/birth-order-family-dynamics']);

    const measuredFrom = first.data?.[0]?.created_at ? israelDay(new Date(first.data[0].created_at)) : null;
    const crawl = buildCrawlReport({
      // The health checks below identify themselves as a monitor; they are
      // not crawls and must not show up as crawl errors either.
      rows: rows.filter((r) => r.bot_kind !== 'monitor'),
      today,
      days,
      check: { listed, valid, redirects },
      measuredFrom,
    });

    const payload = (analytics.data ?? {}) as {
      traffic_daily?: Array<{ day: string; grp: string; visits: number; conversions: number }>;
      traffic?: Array<{ grp: string; detail: string | null; visits: number; conversions: number }>;
      totals?: { visits?: number };
      first_event?: string | null;
    };
    const referrals = {
      error: analytics.error ? 'load failed' : null,
      daily: (payload.traffic_daily || [])
        .filter((r) => r.grp === 'ai_referral')
        .map(({ day, visits, conversions }) => ({ day, visits, conversions })),
      tools: (payload.traffic || [])
        .filter((r) => r.grp === 'ai_referral')
        .map(({ detail, visits, conversions }) => ({ tool: detail, visits, conversions })),
      siteVisits: payload.totals?.visits ?? null,
      measuredFrom: payload.first_event ?? null,
    };

    const checks = await runQuickChecks(BASE_URL, fetch);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      rangeDays: days,
      rowsRead: rows.length,
      truncated: (count ?? 0) > MAX_ROWS,
      crawl,
      unread: unreadListedPages(crawl, listed),
      titles: Object.fromEntries(((titles.data || []) as Array<{ slug: string; title: string }>).map((a) => [a.slug, a.title])),
      referrals,
      visibility: loadVisibilityReport(),
      checks,
    });
  } catch (e) {
    console.error('manage geo failed:', e);
    return NextResponse.json({ error: 'load failed' }, { status: 500 });
  }
}
