// Crawl activity for the GEO page (/manage/geo), folded from public.bot_hits.
//
// bot_hits already holds one row per automated request (proxy.ts, lib/botLog.ts)
// and /manage/analytics already shows a range of it. What that section cannot
// answer, and this does:
//
//   - week by week, not only the selected range, so a trend is visible;
//   - when each page was LAST read, per kind, so "has OAI-SearchBot seen the
//     new article yet" has an answer;
//   - which requests were for pages that do not exist (/articles/null and
//     friends), kept apart so they neither inflate "most crawled" nor vanish;
//   - which days were unusual, against the days before them.
//
// Pure functions over plain rows, so tests/geo-crawl.test.ts can check them
// against fixed data. Nothing here reads or produces anything about a person:
// bot_hits has no IP, no user agent and no session, and every figure below is
// a count of requests, which is not a count of readers, of recommendations or
// of impressions. The page says so next to every number.

import { addDays, israelDay, weekOf } from '@/lib/trends';

export type BotHit = {
  created_at: string;
  bot_kind: string;
  path: string | null;
  /** Only once db/2026-10-24-bot-hits-agent.sql has run; null before. */
  bot_agent?: string | null;
};

/** The three kinds the GEO page is about. Everything else is 'other'. */
export const GEO_KINDS = ['ai_crawler', 'ai_answer', 'search'] as const;
export type GeoKind = (typeof GEO_KINDS)[number];

const isGeoKind = (k: string): k is GeoKind => (GEO_KINDS as readonly string[]).includes(k);

export type KindCounts = Record<GeoKind, number>;
const zero = (): KindCounts => ({ ai_crawler: 0, ai_answer: 0, search: 0 });

export type PathStatus = 'listed' | 'valid' | 'redirect' | 'invalid';

export type PathCheck = {
  /** In the sitemap. */
  listed: ReadonlySet<string>;
  /** Real pages that are deliberately not in the sitemap (thin topic hubs, /services while unpublished...). */
  valid: ReadonlySet<string>;
  /** Paths that 301 elsewhere (next.config.ts redirects). */
  redirects: ReadonlySet<string>;
};

export function pathStatus(path: string, check: PathCheck): PathStatus {
  const p = normalisePath(path);
  if (check.listed.has(p)) return 'listed';
  if (check.redirects.has(p) || p.startsWith('/blog/')) return 'redirect';
  if (check.valid.has(p)) return 'valid';
  return 'invalid';
}

/** '/about/' and '/about' are one page; '' is the homepage. */
export function normalisePath(path: string): string {
  if (!path || path === '/') return '/';
  return path.replace(/\/+$/, '') || '/';
}

/**
 * Why a path that is not a page was asked for, in the few cases that can be
 * told from the path alone. Everything else is just 'unknown'.
 */
export function invalidReason(path: string): 'null_segment' | 'probe' | 'old_url' | 'unknown' {
  // A literal null/undefined as the last segment: a client resolved a missing
  // value as a relative link against the page it was on - which is why it
  // turns up as /null, /articles/null and /articles/topic/null, one per
  // directory depth.
  if (/\/(null|undefined|%24undefined|\$undefined)$/i.test(path)) return 'null_segment';
  if (/^\/(\.git|\.env|wp-|wp\/|xmlrpc|admin|phpmyadmin|cgi-bin)/i.test(path)) return 'probe';
  // The old site's post URLs (Hebrew slugs under /post/) still circulate in
  // shared links.
  if (path.startsWith('/post/')) return 'old_url';
  return 'unknown';
}

export type DayRow = { day: string } & KindCounts & { other: number };
export type WeekRow = { week: string; days: number; current: boolean } & KindCounts;

export type PageRow = {
  path: string;
  status: PathStatus;
  counts: KindCounts;
  /** ISO timestamp of the most recent request of each kind, or null. */
  last: Record<GeoKind, string | null>;
};

export type InvalidRow = {
  path: string;
  reason: ReturnType<typeof invalidReason>;
  hits: number;
  kinds: string[];
  first: string;
  last: string;
};

export type Spike = {
  day: string;
  kind: GeoKind;
  count: number;
  /** Median of the same kind over the BASELINE_DAYS before it. */
  baseline: number;
};

export type AgentRow = { agent: string; kind: string; hits: number; last: string };

export type CrawlReport = {
  from: string;
  to: string;
  /** First row bot_hits holds at all, Israel day. */
  measuredFrom: string | null;
  totals: KindCounts & { other: number };
  daily: DayRow[];
  weekly: WeekRow[];
  pages: PageRow[];
  invalid: InvalidRow[];
  spikes: Spike[];
  /** Per crawler name, once bot_agent is being written; empty before. */
  agents: AgentRow[];
  /** How many rows in the window carry a crawler name. 0 = not yet measured. */
  agentRows: number;
  lastSeen: Record<GeoKind, string | null>;
};

/** Days a spike is measured against. Two weeks covers both weekdays and weekends. */
export const BASELINE_DAYS = 14;
/** A day is a spike at this multiple of its baseline... */
export const SPIKE_FACTOR = 3;
/** ...and only if it is also this many requests above it, so 1 -> 4 is not news. */
export const SPIKE_MIN_EXCESS = 50;

const median = (xs: number[]) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const laterIso = (a: string | null, b: string) => (a && a > b ? a : b);

/**
 * Folds rows into the report. `today` and `days` set the window; rows outside
 * it are ignored, except that the BASELINE_DAYS before `from` are read so the
 * first days of the window can be judged for spikes too.
 */
export function buildCrawlReport({
  rows,
  today,
  days,
  check,
  measuredFrom = null,
}: {
  rows: BotHit[];
  /** Israel day, 'YYYY-MM-DD'. */
  today: string;
  days: number;
  check: PathCheck;
  measuredFrom?: string | null;
}): CrawlReport {
  const from = addDays(today, -(days - 1));
  const baselineFrom = addDays(from, -BASELINE_DAYS);

  const dayMap = new Map<string, DayRow>();
  for (let d = baselineFrom; d <= today; d = addDays(d, 1)) {
    dayMap.set(d, { day: d, ...zero(), other: 0 });
  }

  const pageMap = new Map<string, PageRow>();
  const invalidMap = new Map<string, InvalidRow>();
  const agentMap = new Map<string, AgentRow>();
  const totals = { ...zero(), other: 0 };
  const lastSeen: Record<GeoKind, string | null> = { ai_crawler: null, ai_answer: null, search: null };
  let agentRows = 0;

  for (const r of rows) {
    const day = israelDay(new Date(r.created_at));
    const bucket = dayMap.get(day);
    if (!bucket) continue; // outside baseline + window
    const kind = r.bot_kind;
    if (isGeoKind(kind)) bucket[kind] += 1;
    else bucket.other += 1;

    if (day < from) continue; // baseline only

    if (isGeoKind(kind)) {
      totals[kind] += 1;
      lastSeen[kind] = laterIso(lastSeen[kind], r.created_at);
    } else {
      totals.other += 1;
    }

    if (r.bot_agent) {
      agentRows += 1;
      const key = `${r.bot_agent}|${kind}`;
      const a = agentMap.get(key) ?? { agent: r.bot_agent, kind, hits: 0, last: r.created_at };
      a.hits += 1;
      a.last = laterIso(a.last, r.created_at);
      agentMap.set(key, a);
    }

    if (!r.path) continue;
    const path = normalisePath(r.path);
    const status = pathStatus(path, check);

    if (status === 'invalid') {
      const inv = invalidMap.get(path) ?? {
        path,
        reason: invalidReason(path),
        hits: 0,
        kinds: [],
        first: r.created_at,
        last: r.created_at,
      };
      inv.hits += 1;
      if (!inv.kinds.includes(kind)) inv.kinds.push(kind);
      if (r.created_at < inv.first) inv.first = r.created_at;
      inv.last = laterIso(inv.last, r.created_at);
      invalidMap.set(path, inv);
      continue;
    }

    if (!isGeoKind(kind)) continue;
    const page = pageMap.get(path) ?? {
      path,
      status,
      counts: zero(),
      last: { ai_crawler: null, ai_answer: null, search: null },
    };
    page.counts[kind] += 1;
    page.last[kind] = laterIso(page.last[kind], r.created_at);
    pageMap.set(path, page);
  }

  const allDays = [...dayMap.values()];
  const daily = allDays.filter((d) => d.day >= from);

  // Spikes: each window day against the median of the BASELINE_DAYS before it.
  const spikes: Spike[] = [];
  allDays.forEach((d, i) => {
    if (d.day < from || i < BASELINE_DAYS) return;
    const prior = allDays.slice(i - BASELINE_DAYS, i);
    // Before measurement began the zeros are not quiet days, they are no data.
    if (measuredFrom && prior[0].day < measuredFrom) return;
    for (const kind of GEO_KINDS) {
      const baseline = median(prior.map((p) => p[kind]));
      const count = d[kind];
      if (count >= baseline * SPIKE_FACTOR && count - baseline >= SPIKE_MIN_EXCESS) {
        spikes.push({ day: d.day, kind, count, baseline });
      }
    }
  });

  const weekMap = new Map<string, WeekRow>();
  for (const d of daily) {
    // A day before bot_hits existed is not a quiet day; it is not in any week.
    if (measuredFrom && d.day < measuredFrom) continue;
    const w = weekOf(d.day);
    const row = weekMap.get(w) ?? { week: w, days: 0, current: w === weekOf(today), ...zero() };
    row.days += 1;
    for (const k of GEO_KINDS) row[k] += d[k];
    weekMap.set(w, row);
  }

  const pages = [...pageMap.values()].sort(
    (a, b) =>
      b.counts.ai_answer - a.counts.ai_answer ||
      b.counts.ai_crawler - a.counts.ai_crawler ||
      b.counts.search - a.counts.search ||
      a.path.localeCompare(b.path),
  );

  return {
    from,
    to: today,
    measuredFrom,
    totals,
    daily,
    weekly: [...weekMap.values()],
    pages,
    invalid: [...invalidMap.values()].sort((a, b) => b.hits - a.hits),
    spikes,
    agents: [...agentMap.values()].sort((a, b) => b.hits - a.hits),
    agentRows,
    lastSeen,
  };
}

/**
 * Pages in the sitemap that no AI crawler or search engine requested inside
 * the window - the ones to submit or link to, if any.
 */
export function unreadListedPages(report: CrawlReport, listed: Iterable<string>): string[] {
  const seen = new Set(
    report.pages.filter((p) => p.counts.ai_crawler + p.counts.search + p.counts.ai_answer > 0).map((p) => p.path),
  );
  return [...listed].filter((p) => !seen.has(p)).sort();
}
