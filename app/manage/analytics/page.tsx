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
  fillDays,
  fillHours,
  type DayPoint,
  type Slot,
} from '@/components/manage/Charts';
import TrafficSources, { type TrafficRow } from '@/components/manage/TrafficSources';
import { EVENT_LABELS, PAGE_TYPE_LABELS } from '@/lib/siteEvents';
import { SERVICES } from '@/lib/services';
import { buildInsights } from '@/lib/analyticsInsights';
import { enquiries, readers } from '@/lib/heCount';

type Totals = { views: number; visits: number; conversions: number; signups: number; events?: number };

type Payload = {
  range_days: number;
  totals: Totals;
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
  const [range, setRange] = useState(30);
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
  const rangeLabel = isHourly ? '24 שעות' : `${data?.range_days ?? 30} ימים`;
  // A 24-hour range comes back in hourly buckets, so it needs the hourly fill.
  const days = data
    ? data.granularity === 'hour'
      ? fillHours(data.daily || [], 24)
      : fillDays(data.daily || [], data.range_days)
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
          <p className="text-[11px] md:text-sm text-stone-500 mt-0.5">
            נמדד ישירות באתר, לא דרך גוגל או פייסבוק
          </p>
        </div>
        <div className="flex gap-1.5" role="group" aria-label="טווח זמן">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setRange(r.days)}
              aria-pressed={range === r.days}
              className={`min-h-[36px] px-3 rounded-xl text-xs md:text-sm font-medium transition-colors ${
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

          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 md:gap-4">
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
