'use client';

import { useEffect, useState } from 'react';
import { ACTION_COLOR, SERIES, SOURCE_SERIES, StackedBars, TrendLine } from '@/components/manage/Charts';
import { enquiries as enquiryCount } from '@/lib/heCount';
import { type Channel, type TrendWeek, type Trends as TrendsData } from '@/lib/trends';
import { Card, Empty, Explain, one } from './ui';

// "Is it getting better?" week by week, from the client back to the visit:
// enquiries and new clients first, because they are what the site is judged
// by, then the taps that start them, then the two ratios that explain a change
// in taps (how many visits tap, how deep a visit goes).
//
// Weekly and independent of the range control above. The range is for "what
// happened lately" and defaults to 24 hours, where a trend is one point; and
// at this site's volume a daily rate is mostly noise (1 tap in 20 visits is
// 5%, none the next day is 0%). Visits per day are already in the overview
// chart, so they are not drawn again here - they are in the tooltips.

const CLIENT_SERIES = [
  { key: 'clients', label: 'התחילו טיפול', color: SERIES.primary },
  { key: 'open', label: 'עוד לא ידוע', color: '#78716c' },
  { key: 'irrelevant', label: 'לא רלוונטיות', color: '#d6d3d1' },
];

const VIEWS_COLOR = '#6366f1';

// The two source hues the page already uses for ads and organic search
// (SOURCE_SERIES), and neutral stone for the rest, which is here for scale.
const CHANNEL_SERIES: Array<{ key: Channel; label: string; color: string }> = [
  { key: 'paid', label: 'מודעות גוגל', color: SOURCE_SERIES.google_ads },
  { key: 'organic', label: 'חיפוש אורגני', color: SOURCE_SERIES.organic_search },
  { key: 'other', label: 'אחר', color: '#a8a29e' },
];

const dm = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${d}/${m}`;
};

const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n, 12)).toISOString().slice(0, 10);
};

const weekTitle = (w: TrendWeek) =>
  `שבוע ${dm(w.week)}-${dm(addDays(w.week, 6))}${w.current ? ' (עד עכשיו)' : ''}`;

const rate = (w: TrendWeek) => (w.visits > 0 ? (w.taps / w.visits) * 100 : null);
const depth = (w: TrendWeek) => (w.visits > 0 ? w.views / w.visits : null);

/** The last finished week, and the average of every fully measured one. */
function headline(weeks: TrendWeek[], value: (w: TrendWeek) => number | null, fmt: (v: number) => string) {
  const full = weeks.filter((w) => !w.current && w.days === 7);
  const last = full[full.length - 1];
  const lastV = last ? value(last) : null;
  const vals = full.map(value).filter((v): v is number => v !== null);
  if (lastV === null || vals.length < 2) return undefined;
  const avg = vals.reduce((a, v) => a + v, 0) / vals.length;
  return `שבוע שעבר ${fmt(lastV)} · ממוצע ${fmt(avg)}`;
}

/** The whole window in one line: the weekly average of a handful is not a number. */
function clientsLine(weeks: TrendWeek[]) {
  const enquiries = weeks.reduce((a, w) => a + w.enquiries, 0);
  const clients = weeks.reduce((a, w) => a + w.clients, 0);
  if (enquiries === 0) return undefined;
  return `${weeks.length} שבועות: ${enquiryCount(enquiries)}, ${clients} התחילו טיפול`;
}

export function Trends() {
  const [state, setState] = useState<{ data: TrendsData | null; failed: boolean } | null>(null);

  useEffect(() => {
    let live = true;
    fetch('/api/manage/trends')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load failed'))))
      .then((d: TrendsData) => { if (live) setState({ data: d, failed: false }); })
      .catch(() => { if (live) setState({ data: null, failed: true }); });
    return () => { live = false; };
  }, []);

  if (!state) {
    return (
      <Card>
        <Empty>טוען...</Empty>
      </Card>
    );
  }
  if (state.failed || !state.data) {
    return (
      <Card>
        <Empty>לא הצלחתי לטעון את המגמות.</Empty>
      </Card>
    );
  }

  const weeks = state.data.weeks;
  if (weeks.length < 2) {
    return (
      <Card>
        <Empty>עוד אין מספיק שבועות למגמה.</Empty>
      </Card>
    );
  }

  const running = weeks[weeks.length - 1].current;
  const xLabel = (key: string) => dm(key);
  const byWeek = new Map(weeks.map((w) => [w.week, w]));
  const titleOf = (key: string) => {
    const w = byWeek.get(key);
    return w ? weekTitle(w) : dm(key);
  };
  const partialNote = (w: TrendWeek) =>
    w.days < 7 && !w.current ? <div className="text-stone-400">נמדדו {w.days} ימים מתוך 7</div> : null;


  return (
    <div className="grid md:grid-cols-2 gap-3 md:gap-4">
      <Card title="פניות ומטופלים חדשים" sub={clientsLine(weeks)}>
        <StackedBars
          data={weeks.map((w) => ({
            day: w.week,
            values: { clients: w.clients, open: w.open, irrelevant: w.irrelevant },
          }))}
          series={CLIENT_SERIES}
          height={180}
          aria="פניות שנרשמו בכל שבוע, לפי מה שיצא מהן: התחילו טיפול, עוד לא ידוע, לא רלוונטיות"
          emptyText="לא נרשמו פניות."
          emptyBucketText="לא נרשמו פניות"
          formatTotal={enquiryCount}
          tooltipOrder="series"
          xLabel={xLabel}
          tooltipExtra={(i) => (
            <div className="text-stone-400 whitespace-nowrap">{weekTitle(weeks[i])}</div>
          )}
        />
        <Explain>
          כל פנייה נספרת בשבוע שבו הגיעה, לפי מה שנירה סימנה עליה בעדכון הפניות. מטופלת שהתחילה טיפול בשבוע מאוחר
          יותר עדיין נספרת בשבוע של הפנייה. &quot;עוד לא ידוע&quot; הן פניות שעוד לא עודכנו, או שעדיין בשיחה.
        </Explain>
      </Card>

      <Card title="לחיצות ליצירת קשר" sub={headline(weeks, (w) => w.taps, (v) => one(v))}>
        <StackedBars
          data={weeks.map((w) => ({ day: w.week, values: { taps: w.taps } }))}
          series={[{ key: 'taps', label: 'ווטסאפ, טלפון, מייל וטופס', color: ACTION_COLOR }]}
          height={180}
          aria="לחיצות ליצירת קשר בכל שבוע"
          emptyText="אין לחיצות."
          emptyBucketText="אין לחיצות"
          formatTotal={(n) => (n === 1 ? 'לחיצה אחת' : `${n} לחיצות`)}
          xLabel={xLabel}
          tooltipExtra={(i) => (
            <div className="text-stone-500 whitespace-nowrap">
              {weekTitle(weeks[i])}
              <br />
              {weeks[i].visits.toLocaleString('he-IL')} ביקורים
              {partialNote(weeks[i])}
            </div>
          )}
        />
      </Card>

      <Card title="שיעור פנייה" sub={headline(weeks, rate, pct)}>
        <TrendLine
          data={weeks.map((w) => ({ day: w.week, value: rate(w) }))}
          color={ACTION_COLOR}
          format={pct}
          xLabel={xLabel}
          lastRunning={running}
          title={(i) => titleOf(weeks[i].week)}
          tooltip={(i) => (
            <>
              <div>
                <strong>{pct(rate(weeks[i]) ?? 0)}</strong> · {weeks[i].taps} לחיצות מתוך{' '}
                {weeks[i].visits.toLocaleString('he-IL')} ביקורים
              </div>
              {partialNote(weeks[i])}
            </>
          )}
          aria="שיעור הביקורים שהסתיימו בלחיצה ליצירת קשר, לפי שבוע"
        />
        <Explain>
          לחיצות ליצירת קשר מתוך כל הביקורים בשבוע. בכמה עשרות ביקורים, לחיצה אחת יותר או פחות מזיזה את הקו בכמעט
          נקודת אחוז, ולכן כדאי לקרוא כיוון של כמה שבועות ולא שבוע בודד.
        </Explain>
      </Card>

      <Card title="עמודים לביקור" sub={headline(weeks, depth, (v) => one(v))}>
        <TrendLine
          data={weeks.map((w) => ({ day: w.week, value: depth(w) }))}
          color={VIEWS_COLOR}
          format={(v) => one(v)}
          xLabel={xLabel}
          lastRunning={running}
          title={(i) => titleOf(weeks[i].week)}
          tooltip={(i) => (
            <>
              <div>
                <strong>{one(depth(weeks[i]) ?? 0)}</strong> · {weeks[i].views.toLocaleString('he-IL')} צפיות ב-
                {weeks[i].visits.toLocaleString('he-IL')} ביקורים
              </div>
              {partialNote(weeks[i])}
            </>
          )}
          aria="ממוצע העמודים שנצפו בביקור, לפי שבוע"
        />
      </Card>

      <PaidVsOrganic weeks={weeks} xLabel={xLabel} />
    </div>
  );
}

const pct = (v: number) => `${one(v)}%`;

/** The two lines; "other" stays in the table, where it is there for scale. */
const LINE_CHANNELS = CHANNEL_SERIES.filter((s) => s.key !== 'other');

/**
 * Ads against organic search, week by week: the visits of each as its
 * own line on one axis (Dan, 2026-10-24: two lines of visits, like the
 * enquiry-rate card), and under it the whole window per channel down to clients - the
 * comparison that says which channel brings people who become clients, not
 * only visitors.
 */
function PaidVsOrganic({ weeks, xLabel }: { weeks: TrendWeek[]; xLabel: (key: string) => string }) {
  const total = (ch: Channel, k: 'visits' | 'tapped' | 'enquiries' | 'clients') =>
    weeks.reduce((a, w) => a + w.channels[ch][k], 0);
  const rows = CHANNEL_SERIES.map((s) => ({
    ...s,
    visits: total(s.key, 'visits'),
    tapped: total(s.key, 'tapped'),
    enquiries: total(s.key, 'enquiries'),
    clients: total(s.key, 'clients'),
  }));
  const allVisits = rows.reduce((a, r) => a + r.visits, 0);
  const share = (r: (typeof rows)[number]) => (allVisits > 0 ? Math.round((r.visits / allVisits) * 100) : 0);
  const num = (n: number) => n.toLocaleString('he-IL');

  return (
    <Card title="ביקורים: מודעות מול אורגני" sub={`${weeks.length} שבועות`} className="md:col-span-2">
      <TrendLine
        data={weeks.map((w) => ({ day: w.week }))}
        lines={LINE_CHANNELS.map((s) => ({
          key: s.key,
          label: s.label,
          color: s.color,
          values: weeks.map((w) => w.channels[s.key].visits),
        }))}
        format={(v) => num(Math.round(v))}
        xLabel={xLabel}
        lastRunning={weeks[weeks.length - 1]?.current}
        height={200}
        title={(i) => weekTitle(weeks[i])}
        tooltip={(i) => (
          <>
            {LINE_CHANNELS.map((s) => {
              const c = weeks[i].channels[s.key];
              return (
                <div key={s.key} className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-2.5 h-[3px] rounded-full flex-shrink-0" style={{ background: s.color }} />
                  {s.label}: <strong>{num(c.visits)} ביקורים</strong>
                  <span className="text-stone-400">
                    ({c.tapped > 0 ? `${c.tapped} עם לחיצה` : 'בלי לחיצות'})
                  </span>
                </div>
              );
            })}
          </>
        )}
        aria="ביקורים בכל שבוע, קו למודעות וקו לחיפוש אורגני"
      />

      <div className="mt-4 pt-4 border-t border-stone-100 overflow-x-auto">
        <table className="w-full text-[12px] md:text-[13px] text-stone-700 tabular-nums">
          <thead>
            <tr className="text-[11px] text-stone-400 text-start">
              <th className="font-normal text-start pb-1.5">ערוץ</th>
              <th className="font-normal text-start pb-1.5">ביקורים</th>
              <th className="font-normal text-start pb-1.5">ביקורים עם לחיצה</th>
              <th className="font-normal text-start pb-1.5">פניות שנרשמו</th>
              <th className="font-normal text-start pb-1.5">התחילו טיפול</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-stone-100">
                <td className="py-1.5 pe-2 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: r.color }} aria-hidden="true" />
                    {r.label}
                  </span>
                </td>
                <td className="py-1.5 pe-2 whitespace-nowrap">
                  {num(r.visits)} <span className="text-[11px] text-stone-400">{share(r)}%</span>
                </td>
                <td className="py-1.5 pe-2 whitespace-nowrap">
                  {num(r.tapped)}
                  {r.visits > 0 && (
                    <span className="text-[11px] text-stone-400"> {one((r.tapped / r.visits) * 100)}%</span>
                  )}
                </td>
                <td className="py-1.5 pe-2 whitespace-nowrap">{num(r.enquiries)}</td>
                <td className="py-1.5 font-semibold text-stone-800">{num(r.clients)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Explain>
        בטבלה, &quot;ביקורים עם לחיצה&quot; הם ביקורים שהייתה בהם לפחות לחיצה אחת ליצירת קשר (בכרטיס לחיצות
        למעלה נספרות הלחיצות עצמן, ולכן המספרים קצת שונים). מודעות הן ביקורים עם סימון של קמפיין גוגל. אורגני הוא ביקור שהגיע מתוצאות החיפוש הרגילות של גוגל או מנוע
        אחר. &quot;אחר&quot; כולל כניסה ישירה, רשתות חברתיות, כלי AI ואתרים מפנים. פנייה שנרשמה משויכת לערוץ לפי מה
        שנשמר איתה (סימון גוגל אדס, או הגעה מחיפוש). מי שראה מודעה וחזר אחר כך ישירות נספר ב&quot;אחר&quot;, ולכן
        המודעות יכולות להיות קצת יותר ממה שרואים כאן.
      </Explain>
    </Card>
  );
}
