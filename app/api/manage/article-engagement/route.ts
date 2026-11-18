import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { MANAGE_COOKIE, isManageAuthorized } from '@/lib/manageAuth';
import { SHARE_CAMPAIGN, SHARE_MEDIUM } from '@/lib/shareLink';

export const runtime = 'nodejs';

// Reader behaviour inside the articles, aggregated in Postgres by
// manage_article_engagement - see db/2026-09-22-article-engagement.sql.
//
// A call of its own rather than more keys on /api/manage/analytics. That
// function is already 17KB of SQL that every card on the page depends on, and
// the two answer different questions over different units: one counts visits,
// this one counts readings. The page fetches both at once, so the extra round
// trip costs nothing it would not have waited for anyway, and a failure here
// leaves the rest of the dashboard standing.
//
// shared_visits is added here, in TypeScript, rather than in that function, so
// that it needs no database change: the visits that arrived through a link an
// article's share button handed out (lib/shareLink.ts). The rows are few - one
// per event of a tagged visit - so they are read and counted here.

const ALLOWED_RANGES = [1, 7, 30, 90];
const MAX_ROWS = 5000;

const SHARE_CHANNELS = ['whatsapp', 'facebook', 'instagram', 'copy_link', 'native'];

/** One press of a share button on an article: when, which button, which article. */
type ShareClick = { at: string; channel: string | null; slug: string; title: string };

type SharedVisits = {
  /** Visits (sessions) that opened a tagged share link. */
  visits: number;
  /** Of those, visits with a conversion event (WhatsApp, call, form...). */
  converted: number;
  by_channel: Array<{ channel: string; n: number }>;
  by_article: Array<{ path: string; slug: string; title: string; n: number }>;
};

/** Article titles by slug, for the slugs given. */
async function titlesFor(slugs: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(slugs.filter(Boolean))];
  if (unique.length === 0) return out;
  const { data } = await supabaseServer().from('articles').select('slug, title').in('slug', unique);
  for (const a of data || []) out.set(a.slug, a.title);
  return out;
}

const slugOf = (path: string) => decodeURIComponent((path.match(/^\/articles\/([^/?#]+)/) || [])[1] || '');

// The latest presses of a share button, newest first. Same filter as the
// share count in manage_article_engagement: articles only, bots excluded, and
// the channel only when it is one of the buttons (before 2026-09-22 the
// column held the title).
async function shareClicks(days: number): Promise<ShareClick[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabaseServer()
    .from('site_events')
    .select('created_at, entity, source')
    .eq('event_name', 'share')
    .eq('page_type', 'article')
    .is('bot_kind', null)
    .not('entity', 'is', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  const rows = data || [];
  const titles = await titlesFor(rows.map((r) => r.entity as string));
  return rows.map((r) => ({
    at: r.created_at,
    channel: SHARE_CHANNELS.includes(r.source) ? r.source : null,
    slug: r.entity,
    title: titles.get(r.entity) || r.entity,
  }));
}

// Readings per article per bucket, for the small trend beside each article in
// "המאמרים המובילים". Same unit and filters as `reading` in
// manage_article_engagement (one session + one article, bucketed on its first
// event, bots excluded, Israel time), counted here so it needs no database
// change. 90 days held ~450 article events on 2026-11-18, so the rows are few.
const IL_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
});

function bucketOf(iso: string, unit: 'day' | 'hour'): string {
  const p: Record<string, string> = {};
  for (const part of IL_PARTS.formatToParts(new Date(iso))) p[part.type] = part.value;
  const day = `${p.year}-${p.month}-${p.day}`;
  return unit === 'hour' ? `${day}T${p.hour}` : day;
}

type ArticleTrend = Record<string, Array<{ day: string; n: number }>>;

async function articleTrend(days: number): Promise<ArticleTrend> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const unit = days <= 1 ? 'hour' : 'day';
  const { data, error } = await supabaseServer()
    .from('site_events')
    .select('session_id, entity, created_at')
    .eq('page_type', 'article')
    .is('bot_kind', null)
    .not('entity', 'is', null)
    .not('session_id', 'is', null)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(MAX_ROWS);
  if (error) throw new Error(error.message);

  // Rows are oldest first, so the first row of a reading is where it starts.
  const seen = new Set<string>();
  const counts = new Map<string, Map<string, number>>();
  for (const r of data || []) {
    const key = `${r.session_id}|${r.entity}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const bucket = bucketOf(r.created_at, unit);
    const m = counts.get(r.entity) || new Map<string, number>();
    m.set(bucket, (m.get(bucket) || 0) + 1);
    counts.set(r.entity, m);
  }
  const out: ArticleTrend = {};
  for (const [slug, m] of counts) {
    out[slug] = [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, n]) => ({ day, n }));
  }
  return out;
}

async function sharedVisits(days: number): Promise<SharedVisits> {
  const supabase = supabaseServer();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('site_events')
    .select('session_id, created_at, path, utm_source, is_conversion')
    .eq('utm_medium', SHARE_MEDIUM)
    .eq('utm_campaign', SHARE_CAMPAIGN)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(MAX_ROWS);
  if (error) throw new Error(error.message);

  // One entry per visit: its channel, the page it landed on, and whether it
  // converted. Rows without a session are counted as their own visit.
  const sessions = new Map<string, { channel: string; landing: string; converted: boolean }>();
  (data || []).forEach((r, i) => {
    const key = r.session_id || `row-${i}`;
    const s = sessions.get(key);
    if (s) {
      if (r.is_conversion) s.converted = true;
    } else {
      sessions.set(key, {
        channel: r.utm_source || 'unknown',
        landing: r.path || '',
        converted: !!r.is_conversion,
      });
    }
  });

  const count = (pick: (s: { channel: string; landing: string }) => string) => {
    const m = new Map<string, number>();
    for (const s of sessions.values()) m.set(pick(s), (m.get(pick(s)) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  const byPath = count((s) => s.landing);
  const titles = await titlesFor(byPath.map(([path]) => slugOf(path)));
  return {
    visits: sessions.size,
    converted: [...sessions.values()].filter((s) => s.converted).length,
    by_channel: count((s) => s.channel).map(([channel, n]) => ({ channel, n })),
    by_article: byPath.map(([path, n]) => {
      const slug = slugOf(path);
      return { path, slug, title: titles.get(slug) || path, n };
    }),
  };
}

export async function GET(req: NextRequest) {
  if (!(await isManageAuthorized(req.cookies.get(MANAGE_COOKIE)?.value))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const asked = Number(req.nextUrl.searchParams.get('range') || 30);
  const days = ALLOWED_RANGES.includes(asked) ? asked : 30;

  try {
    const supabase = supabaseServer();
    // None of the additions may take the card down with it.
    const [{ data, error }, shared, clicks, trend] = await Promise.all([
      supabase.rpc('manage_article_engagement', { p_days: days }),
      sharedVisits(days).catch((e) => {
        console.error('manage shared visits failed:', e);
        return null;
      }),
      shareClicks(days).catch((e) => {
        console.error('manage share clicks failed:', e);
        return null;
      }),
      articleTrend(days).catch((e) => {
        console.error('manage article trend failed:', e);
        return null;
      }),
    ]);
    if (error) throw new Error(error.message);
    return NextResponse.json(
      data && typeof data === 'object' ? { ...data, shared_visits: shared, share_clicks: clicks, article_trend: trend } : data,
    );
  } catch (e) {
    console.error('manage article engagement failed:', e);
    return NextResponse.json({ error: 'load failed' }, { status: 500 });
  }
}
