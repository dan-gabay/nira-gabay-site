'use client';

import { useEffect, useState } from 'react';
import {
  Eye, Users, MessageCircle, Mail, Percent, Layers,
  TrendingUp, TrendingDown, Minus, Lightbulb, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import {
  LineChart,
  BarChart,
  RankedList,
  SlotBars,
  SourceBars,
  SOURCE_SERIES,
  bucketKeys,
  fillDays,
  fillHours,
  fillSeries,
  type DayPoint,
  type Slot,
} from '@/components/manage/Charts';
import TrafficSources, { GROUP_LABELS, type TrafficRow } from '@/components/manage/TrafficSources';
import {
  ReturningVisitors,
  SourceQuality,
  type ReturningSummary,
  type ReturningBucket,
  type SourceQualityRow,
} from '@/components/manage/Audience';
import { EVENT_LABELS, PAGE_TYPE_LABELS } from '@/lib/siteEvents';
import { SERVICES } from '@/lib/services';
import { buildInsights } from '@/lib/analyticsInsights';
import { enquiries, readers } from '@/lib/heCount';
import { BOT_KIND_LABELS, type BotKind } from '@/lib/botDetect';

type Totals = { views: number; visits: number; conversions: number; signups: number; events?: number };

type Payload = {
  range_days: number;
  totals: Totals;
  /** Automated clients, counted apart from the numbers above. */
  bots?: Array<{ kind: string; hits: number; sessions: number }>;
  previous: Totals;
  granularity?: 'hour' | 'day';
  daily: DayPoint[];
  top_articles: Array<{ slug: string; title: string; views: number; readers: number }>;
  by_event: Array<{ name: string; n: number }>;
  by_page_type: Array<{ page_type: string; views: number; conversions: number }>;
  top_pages: Array<{ path: string; page_type: string; views: number }>;
  conversions_by_source: Array<{ name: string; source: string; n: number }>;
  referrers: Array<{ host: string; n: number }>;
  campaigns: Array<{
    channel: string;
    utm_campaign: string | null;
    utm_content: string | null;
    utm_term: string | null;
    visits: number;
    conversions: number;
  }>;
  devices: Array<{ device: string; n: number }>;
  // Added 2026-09-02. An older cached response will not carry them, so every
  // read of these is guarded.
  traffic?: TrafficRow[];
  // Added 2026-09-05, so guarded like the rest of this block.
  traffic_daily?: Array<{ day: string; grp: string; visits: number; conversions: number }>;
  landing_pages?: Array<{ path: string; page_type: string; visits: number; conversions: number }>;
  service_funnel?: Array<{ slug: string; views: number; visits: number; conversions: number }>;
  by_hour?: Array<{ hour: number; visits: number; conversions: number }>;
  by_weekday?: Array<{ dow: number; visits: number; conversions: number }>;
  engagement?: {
    visits: number;
    one_page_visits: number;
    deep_visits: number;
    article_reads: number;
    article_completed: number;
  };
  // Added 2026-09-14 with the visitor counter, so guarded the same way: a
  // response cached before it landed simply has no returning section.
  returning?: ReturningSummary;
  returning_buckets?: ReturningBucket[];
  engagement_by_source?: SourceQualityRow[];
  first_event: string | null;
};

const RANGES = [
  { days: 1, label: '24 שעות' },
  { days: 7, label: '7 ימים' },
  { days: 30, label: '30 יום' },
  { days: 90, label: '90 יום' },
];

const DEVICE_LABELS: Record<string, string> = {
  mobile: 'טלפון',
  desktop: 'מחשב',
  tablet: 'טאבלט',
  unknown: 'לא ידוע',
};

const WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

// What a response from before the visitor counter looks like. Zero known
// visits is the card's own "not measured yet" state, so an old cached payload
// degrades to the same honest sentence as a fresh install.
const EMPTY_RETURNING: ReturningSummary = {
  known_visits: 0,
  new_visits: 0,
  returning_visits: 0,
  loyal_visits: 0,
  new_conversions: 0,
  returning_conversions: 0,
  median_visit_at_conversion: null,
  median_days_at_conversion: null,
};

const SERVICE_TITLES = new Map(SERVICES.map((s) => [s.slug, s.title]));
const serviceName = (slug: string) => SERVICE_TITLES.get(slug) || slug;

const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);
const one = (n: number) => (Math.round(n * 10) / 10).toString();

function Trend({ now, prev, unit }: { now: number; prev: number; unit?: string }) {
  const isRate = unit !== undefined;
  if (now === prev) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-stone-400">
        <Minus className="w-3 h-3" aria-hidden="true" />
        ללא שינוי
      </span>
    );
  }
  const up = now > prev;
  // A rate is compared in points, not in percent of a percent: "3% up from 2%"
  // is a 50% rise and saying so is true and useless.
  if (isRate) {
    const delta = Math.round((now - prev) * 10) / 10;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[11px] ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
        {up ? <TrendingUp className="w-3 h-3" aria-hidden="true" /> : <TrendingDown className="w-3 h-3" aria-hidden="true" />}
        {delta > 0 ? '+' : ''}{delta}{unit}
      </span>
    );
  }
  const p = prev === 0 ? null : Math.round(((now - prev) / prev) * 100);
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
      {up ? <TrendingUp className="w-3 h-3" aria-hidden="true" /> : <TrendingDown className="w-3 h-3" aria-hidden="true" />}
      {p === null
        ? `${now - prev >= 0 ? '+' : ''}${Math.round((now - prev) * 10) / 10}`
        : `${p > 0 ? '+' : ''}${p}%`}
    </span>
  );
}

function Tile({
  icon: Icon, label, value, prev, display, unit, hint,
}: {
  icon: typeof Eye; label: string; value: number; prev: number;
  display?: string; unit?: string; hint?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-3.5 md:p-5">
      <div className="flex items-center gap-1.5 text-stone-400 mb-1">
        <Icon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
        <span className="text-[11px] md:text-sm truncate">{label}</span>
      </div>
      <p className="text-xl md:text-3xl font-bold text-stone-800 leading-none tabular-nums">
        {display ?? value}
      </p>
      <div className="mt-1"><Trend now={value} prev={prev} unit={unit} /></div>
      {hint && <p className="text-[10px] md:text-[11px] text-stone-400 mt-1.5 leading-snug">{hint}</p>}
    </div>
  );
}

function Hero({ label, value, display, prev, unit }: {
  label: string; value: number; display?: string; prev: number; unit?: string;
}) {
  return (
    <div>
      <p className="text-[11px] text-stone-400">{label}</p>
      {/* Number and trend share a baseline. Stacked, the gap under a 30px
          figure read as an empty band and cost a whole row per headline. */}
      <p className="flex items-baseline gap-2 mt-1">
        <span className="text-[28px] font-bold text-stone-800 leading-none tabular-nums">
          {display ?? value}
        </span>
        <Trend now={value} prev={prev} unit={unit} />
      </p>
    </div>
  );
}

function Mini({ label, value, display, prev, unit }: {
  label: string; value: number; display?: string; prev: number; unit?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[11px] text-stone-500 truncate">{label}</span>
      <span className="flex items-baseline gap-1.5 flex-shrink-0">
        <span className="text-sm font-bold text-stone-800 tabular-nums">{display ?? value}</span>
        <Trend now={value} prev={prev} unit={unit} />
      </span>
    </div>
  );
}

/**
 * The six tiles, folded into one card for the phone.
 *
 * The grid is right on a desktop and wrong at 390px: six bordered cards, each
 * spending about 165px of height on a two-digit number, push every chart on
 * this page below three screens of scrolling. Worse, it hands a standing zero
 * (list signups) exactly as much room as the one figure the page exists for.
 *
 * So on a phone the same six numbers are ranked rather than tiled. Two get the
 * headline - did anyone come, and did anyone write - and the four that qualify
 * them get a line each. Nothing is dropped and nothing is rounded differently;
 * only the weight changes. The bot note moves in here too, because it is a
 * caveat on these numbers and belongs next to them, not above the tabs where
 * it was the first thing the screen showed.
 */
function SummaryMobile({
  visits, prevVisits, conversions, prevConversions,
  convRate, prevConvRate, perVisit, prevPerVisit,
  views, prevViews, signups, prevSignups, note,
}: {
  visits: number; prevVisits: number; conversions: number; prevConversions: number;
  convRate: number; prevConvRate: number; perVisit: number; prevPerVisit: number;
  views: number; prevViews: number; signups: number; prevSignups: number;
  note?: string;
}) {
  return (
    <div className="md:hidden bg-white rounded-2xl border border-stone-200 p-4">
      <div className="grid grid-cols-2 gap-3">
        <Hero label="ביקורים" value={visits} prev={prevVisits} />
        <Hero label="פניות" value={conversions} prev={prevConversions} />
      </div>
      <div className="mt-3.5 pt-3 border-t border-stone-100 grid gap-2">
        <Mini label="שיעור פנייה" value={convRate} display={`${one(convRate)}%`}
              prev={prevConvRate} unit=" נק'" />
        <Mini label="עמודים לביקור" value={perVisit} display={one(perVisit)}
              prev={prevPerVisit} unit="" />
        <Mini label="צפיות בעמודים" value={views} prev={prevViews} />
        <Mini label="הרשמות לרשימה" value={signups} prev={prevSignups} />
      </div>
      {note && (
        <p className="text-[10px] text-stone-400 mt-3 pt-2.5 border-t border-stone-100 leading-snug">
          {note}
        </p>
      )}
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-3.5 md:p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-sm md:text-base font-bold text-stone-800">{title}</h2>
        {sub && <span className="text-[11px] text-stone-400 text-end">{sub}</span>}
      </div>
      {children}
    </section>
  );
}

export default function AnalyticsPage() {
  // 24 hours is the default because this is now the landing screen of the
  // admin (app/manage/page.tsx redirects here). The first question on opening
  // it is "what happened since I last looked", not "what did the month do" -
  // the longer ranges are one click away and answer a different question.
  const [range, setRange] = useState(1);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setFailed(false);
    fetch(`/api/manage/analytics?range=${range}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load failed'))))
      .then((d) => { if (live) { setData(d); setLoading(false); } })
      .catch(() => { if (live) { setFailed(true); setLoading(false); } });
    return () => { live = false; };
  }, [range]);

  // A 24-hour range comes back in hourly buckets, so it needs the hourly fill,
  // and both chart labels follow from the same flag - "1 ימים" and "פניות לפי
  // יום" were both wrong on that range.
  const isHourly = data?.granularity === 'hour';
  const rangeLabel = isHourly ? '24 שעות' : `${data?.range_days ?? range} ימים`;

  // Bots, kept out of every number above and named here instead. Sessions, not
  // hits: one crawler fetching forty pages is one client, not forty visitors.
  const bots = data?.bots ?? [];
  const botSessions = bots.reduce((a, b) => a + b.sessions, 0);
  const botSummary = bots
    .slice()
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 3)
    .map((b) => `${BOT_KIND_LABELS[b.kind as BotKind] ?? b.kind} ${b.sessions}`)
    .join(', ');
  // A 24-hour range comes back in hourly buckets, so it needs the hourly fill.
  const days = data
    ? data.granularity === 'hour'
      ? fillHours(data.daily || [], 24)
      : fillDays(data.daily || [], data.range_days)
    : [];
  // Visitors by source, over the same buckets the chart above uses.
  //
  // Only the groups that actually sent someone in this range get a line: a
  // source with no traffic would otherwise be a flat zero along the baseline,
  // which is a line that says nothing and one more hue competing for the eye.
  // The colours are pinned per group in SOURCE_SERIES, so a group appearing or
  // disappearing never repaints the ones that stayed.
  const trafficRows = data?.traffic_daily || [];
  const sourceSeries = Object.keys(SOURCE_SERIES)
    .map((key) => ({
      key,
      label: GROUP_LABELS[key] || key,
      color: SOURCE_SERIES[key],
      total: trafficRows.reduce((a, r) => a + (r.grp === key ? r.visits : 0), 0),
    }))
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total);
  const sourcePoints = data
    ? fillSeries(
        trafficRows,
        isHourly ? bucketKeys(24, 'hour') : bucketKeys(data.range_days, 'day'),
      )
    : [];

  const noData = Boolean(data) && (data?.totals.events ?? 0) === 0;

  const insights = data
    ? buildInsights(
        {
          totals: data.totals,
          previous: data.previous,
          range_days: data.range_days,
          traffic: data.traffic,
          service_funnel: data.service_funnel,
          by_hour: data.by_hour,
          devices: data.devices,
          engagement: data.engagement,
          landing_pages: data.landing_pages,
          engagement_by_source: data.engagement_by_source,
          returning: data.returning,
        },
        serviceName,
      )
    : [];

  // Rates, computed here rather than in SQL so the previous window uses exactly
  // the same formula as the current one.
  const convRate = data ? pct(data.totals.conversions, data.totals.visits) : 0;
  const prevConvRate = data ? pct(data.previous.conversions, data.previous.visits) : 0;
  const perVisit = data && data.totals.visits > 0 ? data.totals.views / data.totals.visits : 0;
  const prevPerVisit = data && data.previous.visits > 0 ? data.previous.views / data.previous.visits : 0;

  // Hour-of-day is what the range chart already shows when the range IS a day,
  // so it only earns a card on the longer ranges.
  const hourSlots: Slot[] = Array.from({ length: 24 }, (_, h) => {
    const row = (data?.by_hour || []).find((x) => x.hour === h);
    return { label: String(h).padStart(2, '0'), visits: row?.visits ?? 0, conversions: row?.conversions ?? 0 };
  });
  const weekSlots: Slot[] = WEEKDAYS.map((label, dow) => {
    const row = (data?.by_weekday || []).find((x) => x.dow === dow);
    return { label, visits: row?.visits ?? 0, conversions: row?.conversions ?? 0 };
  });
  const hasClock = (data?.by_hour || []).length > 0 && !isHourly;

  const eng = data?.engagement;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-stone-800">נתוני האתר</h1>
          <p className="hidden md:block text-sm text-stone-500 mt-0.5">
            נמדד ישירות באתר, לא דרך גוגל או פייסבוק
          </p>
          {/* Said out loud rather than left implicit: every figure on this page
              counts people only. A crawler is still served, still stored and
              still listed here - it just is not a visit. */}
          {botSessions > 0 && (
            <p className="hidden md:block text-[11px] text-stone-400 mt-1">
              ללא {botSessions.toLocaleString('he-IL')} כניסות אוטומטיות
              {botSummary && <> ({botSummary})</>}
            </p>
          )}
        </div>
        {/* Four equal segments across the full width on a phone, where the
            left-aligned pill row left a ragged gap and gave each tab a target
            narrower than a thumb. Unchanged from md up. */}
        <div className="grid grid-cols-4 gap-1.5 w-full md:flex md:w-auto" role="group" aria-label="טווח זמן">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setRange(r.days)}
              aria-pressed={range === r.days}
              className={`min-h-[38px] px-1.5 md:px-3 rounded-xl text-xs md:text-sm font-medium transition-colors ${
                range === r.days
                  ? 'bg-stone-800 text-white'
                  : 'bg-white border border-stone-300 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-stone-400">טוען...</p>}

      {failed && (
        <div className="bg-white rounded-2xl border border-rose-200 p-4 text-sm text-stone-700">
          לא הצלחתי לטעון את הנתונים. נסה לרענן.
        </div>
      )}

      {data && !loading && (
        <>
          {noData && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 md:p-5">
              <p className="font-semibold text-stone-800 text-sm md:text-base">עדיין אין נתונים</p>
              <p className="text-xs md:text-sm text-stone-600 mt-1 leading-relaxed">
                המדידה מתחילה לאסוף מרגע שהעמודים עלו לאוויר, אז היא לא מכילה
                היסטוריה. כל ביקור מכאן והלאה נספר. תן לזה יום או יומיים.
              </p>
            </div>
          )}

          <SummaryMobile
            visits={data.totals.visits} prevVisits={data.previous.visits}
            conversions={data.totals.conversions} prevConversions={data.previous.conversions}
            convRate={convRate} prevConvRate={prevConvRate}
            perVisit={perVisit} prevPerVisit={prevPerVisit}
            views={data.totals.views} prevViews={data.previous.views}
            signups={data.totals.signups} prevSignups={data.previous.signups}
            note={
              botSessions > 0
                ? `ללא ${botSessions.toLocaleString('he-IL')} כניסות אוטומטיות${botSummary ? ` (${botSummary})` : ''}`
                : undefined
            }
          />

          <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 md:gap-4">
            <Tile icon={Users} label="ביקורים" value={data.totals.visits} prev={data.previous.visits}
                  hint="מבקרים שונים, לפי ביקור" />
            <Tile icon={Eye} label="צפיות בעמודים" value={data.totals.views} prev={data.previous.views} />
            <Tile icon={MessageCircle} label="פניות" value={data.totals.conversions} prev={data.previous.conversions}
                  hint="ווטסאפ, טלפון, מייל וטופס" />
            <Tile icon={Percent} label="שיעור פנייה" value={convRate} prev={prevConvRate}
                  display={`${one(convRate)}%`} unit=" נק'"
                  hint="כמה מהביקורים הפכו לפנייה" />
            <Tile icon={Mail} label="הרשמות לרשימה" value={data.totals.signups} prev={data.previous.signups} />
            <Tile icon={Layers} label="עמודים לביקור" value={perVisit} prev={prevPerVisit}
                  display={one(perVisit)} unit=""
                  hint="כמה עמודים נקראים בממוצע" />
          </div>

          {/* The numbers above, said out loud. Silent when the sample is too
              small to support a sentence - see lib/analyticsInsights.ts. */}
          {insights.length > 0 && (
            <section className="bg-white rounded-2xl border border-stone-200 p-3.5 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-500" aria-hidden="true" />
                <h2 className="text-sm md:text-base font-bold text-stone-800">מה עולה מהנתונים</h2>
              </div>
              <ul className="space-y-2">
                {insights.map((ins) => (
                  <li key={ins.text} className="flex items-start gap-2 text-[13px] md:text-sm text-stone-700 leading-relaxed">
                    {ins.tone === 'warn' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    ) : ins.tone === 'good' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-300 flex-shrink-0 mt-2" aria-hidden="true" />
                    )}
                    <span className="min-w-0">{ins.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Card title="תנועה לאורך זמן" sub={rangeLabel}>
            <LineChart data={days} labels={{ primary: 'צפיות', secondary: 'ביקורים' }} />
          </Card>

          {/* Conversions get their own chart rather than a second axis: they
              are two orders of magnitude below pageviews, and a shared scale
              would flatten them into the baseline. */}
          <Card title={isHourly ? 'פניות לפי שעה' : 'פניות לפי יום'} sub="ווטסאפ, טלפון, מייל וטופס">
            <BarChart data={days} />
          </Card>

          <Card title="מאיפה הגיעו המבקרים" sub="לחיצה על שורה פותחת את הפירוט">
            <TrafficSources rows={data.traffic || []} />
          </Card>

          {/* The card above is the totals for the range: who sent the most.
              This is the same split over time - which is the question the
              totals cannot answer. A campaign that was paused, a post that
              went out on one day, a slow drift in organic: all of them are a
              single number in the card above and a visible shape here.

              Stacked rather than one line per source, so the column height is
              the day's total and the segments are what it was made of. The
              sort above puts the biggest source first, which places it on the
              baseline - the only position in a stack with a straight edge to
              read a trend against. */}
          <Card title="מבקרים לפי מקור הגעה, לאורך זמן" sub={rangeLabel}>
            <SourceBars data={sourcePoints} series={sourceSeries} />
          </Card>

          {/* Volume is the question the two cards above answer. This is the one
              they cannot: a paid click and a search arrival are the same single
              number up there, and nothing on the page said that one of them
              reads three pages and the other reads one. */}
          <Card title="איכות התנועה לפי מקור" sub="כמה עמודים נקראים בפועל">
            <SourceQuality rows={data.engagement_by_source || []} />
          </Card>

          {/* Every other card on this page counts visits, and a visit cannot
              tell forty people who came once from ten who came four times. */}
          <Card title="מבקרים חוזרים" sub="לפי דפדפן, בלי IP">
            <ReturningVisitors
              summary={data.returning ?? EMPTY_RETURNING}
              buckets={data.returning_buckets || []}
              totalVisits={data.totals.visits}
            />
          </Card>

          {hasClock && (
            <Card title="מתי נכנסים ומתי פונים" sub="שעון ישראל">
              <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
                <div>
                  <p className="text-[11px] text-stone-400 mb-1">לפי שעה ביום</p>
                  <SlotBars slots={hourSlots} />
                </div>
                <div>
                  <p className="text-[11px] text-stone-400 mb-1">לפי יום בשבוע</p>
                  <SlotBars slots={weekSlots} />
                </div>
              </div>
            </Card>
          )}

          {/* grid-cols-1 is not decoration: without an explicit column count the
              single implicit track sizes to its widest content - one long
              article title - and pushed the whole page ~75px past the phone's
              screen edge. Tailwind's grid-cols-* are minmax(0,1fr), which is
              what stops that. */}
          <div className="grid grid-cols-1 gap-2.5 md:gap-4 lg:grid-cols-2">
            {/* The pages the ad budget lands on, as a funnel. This is the card
                the campaign is judged by. */}
            <Card title="עמודי השירות: מביקור לפנייה" sub="ביקורים · פניות">
              <RankedList
                emptyText="אין עדיין ביקורים בעמודי השירות בטווח הזה."
                rows={(data.service_funnel || []).map((s) => ({
                  label: serviceName(s.slug),
                  meta:
                    s.conversions === 0
                      ? 'ללא פניות'
                      : `${enquiries(s.conversions)} · ${one(pct(s.conversions, s.visits))}%`,
                  value: s.visits,
                }))}
              />
            </Card>

            {/* Where a visit starts, which is a different question from which
                page collects the most views. */}
            <Card title="דפי כניסה" sub="העמוד שבו התחיל הביקור">
              <RankedList
                emptyText="אין עדיין נתונים."
                rows={(data.landing_pages || []).map((l) => ({
                  label: l.path,
                  sub: PAGE_TYPE_LABELS[l.page_type] || l.page_type,
                  meta: l.conversions > 0 ? enquiries(l.conversions) : undefined,
                  value: l.visits,
                }))}
              />
            </Card>

            {/* Which articles were actually read in the selected window,
                answered by title rather than by slug. */}
            <Card title="המאמרים הנקראים ביותר" sub="בתקופה שנבחרה">
              <RankedList
                emptyText="אין עדיין צפיות במאמרים בתקופה הזו."
                rows={(data.top_articles || []).map((a) => ({
                  label: a.title,
                  sub: readers(a.readers),
                  value: a.views,
                }))}
              />
            </Card>

            {/* Articles are excluded here - they have their own card above, and
                listing them twice made this one a slightly worse copy of it. */}
            <Card title="העמודים הנצפים ביותר" sub="ללא מאמרים">
              <RankedList
                emptyText="אין עדיין צפיות בטווח הזה."
                rows={(data.top_pages || [])
                  .filter((p) => p.page_type !== 'article')
                  .map((p) => ({
                    label: p.path,
                    sub: PAGE_TYPE_LABELS[p.page_type] || p.page_type,
                    value: p.views,
                  }))}
              />
            </Card>

            <Card title="מאיפה הגיעו הפניות" sub="הכפתור שנלחץ">
              <RankedList
                emptyText="אין עדיין פניות בטווח הזה."
                rows={(data.conversions_by_source || []).map((c) => ({
                  label: EVENT_LABELS[c.name] || c.name,
                  sub: c.source,
                  value: c.n,
                }))}
              />
            </Card>

            <Card title="לפי סוג עמוד">
              <RankedList
                emptyText="אין עדיין נתונים."
                rows={(data.by_page_type || []).map((p) => ({
                  label: PAGE_TYPE_LABELS[p.page_type] || p.page_type,
                  meta: p.conversions > 0 ? enquiries(p.conversions) : undefined,
                  value: p.views,
                }))}
              />
            </Card>

            {/* Depth and actions in one card: both answer "did anything happen
                after the page loaded", and split across two cards neither had
                enough rows to be worth a heading. */}
            <Card title="מעורבות באתר">
              {eng && eng.visits > 0 ? (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-stone-50 rounded-xl p-2.5">
                    <p className="text-[11px] text-stone-400">עמוד אחד ויצאו</p>
                    <p className="text-base font-bold text-stone-800 tabular-nums">
                      {eng.one_page_visits}
                      <span className="text-[11px] font-normal text-stone-400"> · {Math.round(pct(eng.one_page_visits, eng.visits))}%</span>
                    </p>
                  </div>
                  <div className="bg-stone-50 rounded-xl p-2.5">
                    <p className="text-[11px] text-stone-400">3 עמודים ומעלה</p>
                    <p className="text-base font-bold text-stone-800 tabular-nums">
                      {eng.deep_visits}
                      <span className="text-[11px] font-normal text-stone-400"> · {Math.round(pct(eng.deep_visits, eng.visits))}%</span>
                    </p>
                  </div>
                </div>
              ) : null}
              <RankedList
                emptyText="אין עדיין נתונים."
                rows={(data.by_event || [])
                  .filter((e) => e.name !== 'page_view')
                  .map((e) => ({ label: EVENT_LABELS[e.name] || e.name, value: e.n }))}
              />
            </Card>

            <Card title="מכשירים" sub="לפי ביקור">
              <RankedList
                emptyText="אין עדיין נתונים."
                rows={(data.devices || []).map((d) => ({
                  label: DEVICE_LABELS[d.device] || d.device,
                  value: d.n,
                }))}
              />
            </Card>
          </div>

          <p className="text-[11px] text-stone-400 leading-relaxed">
            הנתונים נאספים ישירות באתר ולכן כוללים גם מבקרים שחוסמים את גוגל
            אנליטיקס ואת הפיקסל של מטא. לא נשמרות כתובות IP ולא פרטים מזהים.
            {data.first_event && ` המדידה פועלת מ-${data.first_event}.`}
          </p>
        </>
      )}
    </div>
  );
}
