// Week buckets for the trends section of /manage/analytics.
//
// The figures arrive per Israel calendar day (the SQL's 'daily' keys) and the
// enquiries as timestamps; both are folded into Sunday-to-Saturday weeks,
// because that is the working week here and a week is the shortest bucket in
// which a site of ~130 visits and a handful of taps has a rate worth reading.
// Pure functions, so tests/trends.test.ts can check them against fixed dates.

export type TrendWeek = {
  /** 'YYYY-MM-DD', the Sunday the week starts on (Israel calendar). */
  week: string;
  /** Days of the week that were inside measurement (7 for a full week). */
  days: number;
  /** The week that is still running. */
  current: boolean;
  visits: number;
  views: number;
  /** Taps on WhatsApp, phone, email and form submits. */
  taps: number;
  /** Enquiries logged in contact_messages, by the week they arrived. */
  enquiries: number;
  /** Of those, marked started_therapy or ongoing. */
  clients: number;
  irrelevant: number;
  /** Not marked yet, or marked spoke: neither a client nor ruled out. */
  open: number;
  /** The same week by channel: paid ads, organic search, everything else. */
  channels: Record<Channel, ChannelWeek>;
};

export type Channel = 'paid' | 'organic' | 'other';

export type ChannelWeek = {
  visits: number;
  /** Visits with at least one tap on contact (not the tap count). */
  tapped: number;
  enquiries: number;
  clients: number;
};

export const CHANNELS: Channel[] = ['paid', 'organic', 'other'];

/** A traffic group from manage_analytics (traffic_daily.grp) as a channel. */
export function channelOfGroup(grp: string): Channel {
  if (grp === 'google_ads') return 'paid';
  if (grp === 'organic_search') return 'organic';
  return 'other';
}

const SEARCH_HOST = /(^|\.)(google|bing|duckduckgo|yahoo|yandex)\./i;

/**
 * A logged enquiry's channel, from what the contact form and the click
 * handlers stored with it: a gclid or a paid medium is the ads; a search
 * engine referrer with no campaign tags is organic search.
 */
export function channelOfEnquiry(e: {
  gclid?: string | null;
  utm_medium?: string | null;
  utm_source?: string | null;
  referrer?: string | null;
}): Channel {
  const medium = (e.utm_medium || '').toLowerCase();
  if (e.gclid || ['cpc', 'ppc', 'paid', 'paidsearch'].includes(medium)) return 'paid';
  if (!e.utm_source && !medium && e.referrer) {
    try {
      if (SEARCH_HOST.test(new URL(e.referrer).hostname)) return 'organic';
    } catch {
      // not a URL: falls through to other
    }
  }
  return 'other';
}

export type Trends = {
  weeks: TrendWeek[];
  /** 'YYYY-MM-DD', the first day site events were recorded. */
  first_event: string | null;
};

const DAY = 86_400_000;

const toUtcNoon = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d, 12);
};

const fmt = (t: number) => new Date(t).toISOString().slice(0, 10);

/** The Sunday that starts the week a 'YYYY-MM-DD' day falls in. */
export function weekOf(day: string): string {
  const t = toUtcNoon(day);
  return fmt(t - new Date(t).getUTCDay() * DAY);
}

/** 'YYYY-MM-DD' plus n days. */
export function addDays(day: string, n: number): string {
  return fmt(toUtcNoon(day) + n * DAY);
}

const IL_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The Israel calendar day of an instant, as 'YYYY-MM-DD'. */
export function israelDay(at: Date): string {
  return IL_DAY.format(at);
}

/**
 * Folds the daily figures and the logged enquiries into weeks.
 *
 * `today` and `windowStart` are Israel days. Only weeks that start on or after
 * windowStart are kept, so the oldest week is never a stub cut off by the
 * query's window; a week that started before measurement did is kept, with
 * `days` saying how much of it was measured.
 */
export function buildWeeks({
  daily,
  enquiries,
  today,
  windowStart,
  firstEvent,
  traffic = [],
}: {
  daily: Array<{ day: string; visits: number; views: number; conversions: number }>;
  enquiries: Array<{ day: string; status: string | null; channel?: Channel }>;
  /** Visits per day per traffic group (manage_analytics traffic_daily). */
  traffic?: Array<{ day: string; grp: string; visits: number; conversions: number }>;
  today: string;
  windowStart: string;
  firstEvent: string | null;
}): TrendWeek[] {
  const thisWeek = weekOf(today);
  let start = weekOf(windowStart);
  if (start < windowStart) start = addDays(start, 7);
  if (firstEvent && weekOf(firstEvent) > start) start = weekOf(firstEvent);

  const weeks = new Map<string, TrendWeek>();
  for (let w = start; w <= thisWeek; w = addDays(w, 7)) {
    let days = 7;
    if (w === thisWeek) days = Math.round((toUtcNoon(today) - toUtcNoon(w)) / DAY) + 1;
    if (firstEvent && firstEvent > w) days -= Math.round((toUtcNoon(firstEvent) - toUtcNoon(w)) / DAY);
    weeks.set(w, {
      week: w,
      days: Math.max(0, days),
      current: w === thisWeek,
      visits: 0,
      views: 0,
      taps: 0,
      enquiries: 0,
      clients: 0,
      irrelevant: 0,
      open: 0,
      channels: {
        paid: { visits: 0, tapped: 0, enquiries: 0, clients: 0 },
        organic: { visits: 0, tapped: 0, enquiries: 0, clients: 0 },
        other: { visits: 0, tapped: 0, enquiries: 0, clients: 0 },
      },
    });
  }

  for (const d of daily) {
    const w = weeks.get(weekOf(d.day));
    if (!w) continue;
    w.visits += d.visits;
    w.views += d.views;
    w.taps += d.conversions;
  }

  for (const t of traffic) {
    const w = weeks.get(weekOf(t.day));
    if (!w) continue;
    const c = w.channels[channelOfGroup(t.grp)];
    c.visits += t.visits;
    c.tapped += t.conversions;
  }

  for (const e of enquiries) {
    const w = weeks.get(weekOf(e.day));
    if (!w) continue;
    w.enquiries += 1;
    const c = w.channels[e.channel ?? 'other'];
    c.enquiries += 1;
    const s = e.status || 'new';
    if (s === 'started_therapy' || s === 'ongoing') {
      w.clients += 1;
      c.clients += 1;
    } else if (s === 'irrelevant') w.irrelevant += 1;
    else w.open += 1;
  }

  return [...weeks.values()];
}
