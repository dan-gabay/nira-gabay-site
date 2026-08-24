'use client';

import { useEffect, useState } from 'react';
import { Eye, Users, MessageCircle, Mail, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  LineChart,
  BarChart,
  RankedList,
  fillDays,
  fillHours,
  type DayPoint,
} from '@/components/manage/Charts';
import { EVENT_LABELS, PAGE_TYPE_LABELS } from '@/lib/siteEvents';

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
  first_event: string | null;
};

const RANGES = [
  { days: 1, label: '24 שעות' },
  { days: 7, label: '7 ימים' },
  { days: 30, label: '30 יום' },
  { days: 90, label: '90 יום' },
];

function Trend({ now, prev }: { now: number; prev: number }) {
  if (now === prev) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-stone-400">
        <Minus className="w-3 h-3" aria-hidden="true" />
        ללא שינוי
      </span>
    );
  }
  const up = now > prev;
  const pct = prev === 0 ? null : Math.round(((now - prev) / prev) * 100);
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
      {up ? <TrendingUp className="w-3 h-3" aria-hidden="true" /> : <TrendingDown className="w-3 h-3" aria-hidden="true" />}
      {pct === null ? `${now - prev >= 0 ? '+' : ''}${now - prev}` : `${pct > 0 ? '+' : ''}${pct}%`}
    </span>
  );
}

function Tile({
  icon: Icon, label, value, prev, hint,
}: {
  icon: typeof Eye; label: string; value: number; prev: number; hint?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-3.5 md:p-5">
      <div className="flex items-center gap-1.5 text-stone-400 mb-1">
        <Icon className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="text-[11px] md:text-sm">{label}</span>
      </div>
      <p className="text-xl md:text-3xl font-bold text-stone-800 leading-none tabular-nums">{value}</p>
      <div className="mt-1"><Trend now={value} prev={prev} /></div>
      {hint && <p className="text-[10px] md:text-[11px] text-stone-400 mt-1.5 leading-snug">{hint}</p>}
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-3.5 md:p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-sm md:text-base font-bold text-stone-800">{title}</h2>
        {sub && <span className="text-[11px] text-stone-400">{sub}</span>}
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

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
            <Tile icon={Users} label="ביקורים" value={data.totals.visits} prev={data.previous.visits}
                  hint="מבקרים שונים, לפי ביקור" />
            <Tile icon={Eye} label="צפיות בעמודים" value={data.totals.views} prev={data.previous.views} />
            <Tile icon={MessageCircle} label="פניות" value={data.totals.conversions} prev={data.previous.conversions}
                  hint="ווטסאפ, טלפון, מייל וטופס" />
            <Tile icon={Mail} label="הרשמות לרשימה" value={data.totals.signups} prev={data.previous.signups} />
          </div>

          <Card title="תנועה לאורך זמן" sub={rangeLabel}>
            <LineChart data={days} labels={{ primary: 'צפיות', secondary: 'ביקורים' }} />
          </Card>

          {/* Conversions get their own chart rather than a second axis: they
              are two orders of magnitude below pageviews, and a shared scale
              would flatten them into the baseline. */}
          <Card title={isHourly ? 'פניות לפי שעה' : 'פניות לפי יום'} sub="ווטסאפ, טלפון, מייל וטופס">
            <BarChart data={days} />
          </Card>

          <div className="grid gap-2.5 md:gap-4 lg:grid-cols-2">
            <Card title="העמודים הנצפים ביותר">
              <RankedList
                emptyText="אין עדיין צפיות בטווח הזה."
                rows={(data.top_pages || []).map((p) => ({
                  label: p.path,
                  sub: PAGE_TYPE_LABELS[p.page_type] || p.page_type,
                  value: p.views,
                }))}
              />
            </Card>

            <Card title="מאיפה הגיעו הפניות">
              <RankedList
                emptyText="אין עדיין פניות בטווח הזה."
                rows={(data.conversions_by_source || []).map((c) => ({
                  label: EVENT_LABELS[c.name] || c.name,
                  sub: c.source,
                  value: c.n,
                }))}
              />
            </Card>

            <Card title="מקורות תנועה">
              <RankedList
                emptyText="אין עדיין נתונים."
                rows={(data.referrers || []).map((r) => ({ label: r.host, value: r.n }))}
              />
            </Card>

            <Card title="פעולות באתר">
              <RankedList
                emptyText="אין עדיין נתונים."
                rows={(data.by_event || [])
                  .filter((e) => e.name !== 'page_view')
                  .map((e) => ({ label: EVENT_LABELS[e.name] || e.name, value: e.n }))}
              />
            </Card>

            {/* Which articles were actually read in the selected window.
                "top_pages" mixes every page type together and shows a slug;
                this is the question Nira asks, answered by title. */}
            <Card title="המאמרים הנקראים ביותר" sub="בתקופה שנבחרה">
              <RankedList
                emptyText="אין עדיין צפיות במאמרים בתקופה הזו."
                rows={(data.top_articles || []).map((a) => ({
                  label: a.title,
                  sub: `${a.readers} קוראים`,
                  value: a.views,
                }))}
              />
            </Card>

            <Card title="לפי סוג עמוד">
              <RankedList
                emptyText="אין עדיין נתונים."
                rows={(data.by_page_type || []).map((p) => ({
                  label: PAGE_TYPE_LABELS[p.page_type] || p.page_type,
                  sub: p.conversions > 0 ? `${p.conversions} פניות` : undefined,
                  value: p.views,
                }))}
              />
            </Card>

            <Card title="מאיפה הגיעו" sub="לפי ביקור, כולל ממומן">
              <RankedList
                emptyText="אין עדיין תנועה."
                rows={(data.campaigns || []).map((c) => ({
                  label: c.channel,
                  // Campaign, then ad group, then keyword - whichever the ad
                  // platform actually sent. Google auto-tagging sends none of
                  // them, so a Google Ads row shows only the conversions until
                  // a final URL suffix is set on the campaign.
                  sub:
                    [c.utm_campaign, c.utm_content, c.utm_term]
                      .filter(Boolean)
                      .join(' · ') ||
                    (c.conversions > 0 ? `${c.conversions} פניות` : undefined),
                  value: c.visits,
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
