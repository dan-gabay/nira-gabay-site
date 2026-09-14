'use client';

import { SplitBar } from './Charts';
import { GROUP_LABELS } from './TrafficSources';
import { enquiries } from '@/lib/heCount';

// Two cards that answer questions the rest of the dashboard cannot:
//
//   1. Is anyone coming back? Every other card treats a visit as the unit and
//      so cannot tell forty people who came once from ten who came four times.
//   2. Which source sends people who actually read? "מאיפה הגיעו" ranks by
//      volume, and volume is exactly the measure on which a paid click and a
//      search arrival look identical.
//
// Both are deliberately conservative about small samples: a rate over eight
// visits is noise dressed as a finding, and this dashboard is read as if every
// number on it means something.

const MIN_FOR_RATE = 10;

const one = (n: number) => (Math.round(n * 10) / 10).toString();
const share = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

// ─────────────────────────────────────────── returning visitors

export type ReturningSummary = {
  known_visits: number;
  new_visits: number;
  returning_visits: number;
  loyal_visits: number;
  new_conversions: number;
  returning_conversions: number;
  median_visit_at_conversion: number | null;
  median_days_at_conversion: number | null;
};

export type ReturningBucket = { ord: number; visits: number; conversions: number };

const BUCKET_LABELS: Record<number, string> = {
  1: 'ביקור ראשון',
  2: 'ביקור 2-3',
  4: 'ביקור 4-9',
  10: '10 ומעלה',
};

// An ordered variable, so a one-hue ramp rather than four competing colours:
// darker means more visits, and the order is readable without the legend.
// Tailwind teal 500/600/700/800 - validated as an ordinal ramp (monotone
// lightness, every adjacent gap over the ΔL floor, single hue, and the lightest
// step still clears 2:1 against white). #0d9488 is the dashboard's own primary.
const BUCKET_COLORS: Record<number, string> = {
  1: '#14b8a6',
  2: '#0d9488',
  4: '#0f766e',
  10: '#115e59',
};

export function ReturningVisitors({
  summary,
  buckets,
  totalVisits,
}: {
  summary: ReturningSummary;
  buckets: ReturningBucket[];
  totalVisits: number;
}) {
  const known = summary.known_visits;
  if (known === 0) {
    return (
      <p className="text-xs md:text-sm text-stone-400 py-2">
        המדידה של מבקרים חוזרים התחילה עכשיו, ולכן היא עוד לא מכסה את הטווח הזה.
        ביקור חוזר נספר רק מהפעם הבאה שאותו דפדפן חוזר.
      </p>
    );
  }

  const parts = buckets
    .slice()
    .sort((a, b) => a.ord - b.ord)
    .map((b) => ({
      key: String(b.ord),
      label: BUCKET_LABELS[b.ord] || `ביקור ${b.ord}`,
      value: b.visits,
      color: BUCKET_COLORS[b.ord] || '#a8a29e',
    }));

  const newRate = summary.new_visits >= MIN_FOR_RATE ? share(summary.new_conversions, summary.new_visits) : null;
  const retRate =
    summary.returning_visits >= MIN_FOR_RATE ? share(summary.returning_conversions, summary.returning_visits) : null;

  return (
    <div>
      <SplitBar parts={parts} />

      <div className="mt-3 space-y-1.5 text-[12px] md:text-[13px] text-stone-600 leading-relaxed">
        {/* The comparison the card exists for. Shown only when both sides have
            enough visits to carry a percentage. */}
        {newRate !== null && retRate !== null && (
          <p>
            פונים בביקור ראשון: <strong className="text-stone-800 tabular-nums">{newRate}%</strong>
            {' · '}
            בביקור חוזר: <strong className="text-stone-800 tabular-nums">{retRate}%</strong>
          </p>
        )}

        {/* Median, not average: one person who came back eleven times before
            writing would drag a mean past anything true about the rest. */}
        {summary.median_visit_at_conversion !== null && (
          <p>
            חצי מהפניות הגיעו עד הביקור ה-
            <strong className="text-stone-800 tabular-nums">{one(summary.median_visit_at_conversion)}</strong>
            {summary.median_days_at_conversion !== null && (
              <>
                , כלומר עד{' '}
                <strong className="text-stone-800 tabular-nums">
                  {one(summary.median_days_at_conversion)}
                </strong>{' '}
                ימים מהביקור הראשון
              </>
            )}
            .
          </p>
        )}

        {summary.returning_conversions + summary.new_conversions > 0 &&
          newRate === null &&
          retRate === null && (
            <p>
              {enquiries(summary.new_conversions)} בביקור ראשון,{' '}
              {enquiries(summary.returning_conversions)} בביקור חוזר.
            </p>
          )}
      </div>

      {/* Said plainly, because the gap is real and will stay real for a while:
          the counter only exists on browsers that have been here since it was
          added, and nothing can be back-filled. */}
      <p className="text-[11px] text-stone-400 mt-3 leading-relaxed">
        נמדד על {known.toLocaleString('he-IL')} מתוך {totalVisits.toLocaleString('he-IL')} ביקורים בטווח.
        הספירה היא לפי דפדפן, לא לפי אדם: מי שמנקה היסטוריה או מגיע ממכשיר אחר נספר כחדש, ואין כאן כתובות IP.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────── quality by source

export type SourceQualityRow = {
  grp: string;
  visits: number;
  views: number;
  one_page_visits: number;
  deep_visits: number;
  conversions: number;
};

export function SourceQuality({ rows }: { rows: SourceQualityRow[] }) {
  if (rows.length === 0) {
    return <p className="text-xs md:text-sm text-stone-400 py-2">אין עדיין תנועה בטווח הזה.</p>;
  }

  const ranked = rows
    .slice()
    .sort((a, b) => b.visits - a.visits)
    .map((r) => ({ ...r, perVisit: r.visits > 0 ? r.views / r.visits : 0 }));
  const maxPerVisit = Math.max(...ranked.map((r) => r.perVisit), 1);

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full text-[12px] md:text-[13px]">
        <thead>
          {/* nowrap on every header and every figure: at 390px "ביקורים"
              broke across two lines and 284 rendered as 28 over 4. The
              bounce column is the one that can go on a phone - it is the
              least load-bearing of the four and the row is unreadable with
              five. */}
          <tr className="text-stone-400 text-[11px]">
            <th className="text-start font-normal pb-2 pe-2">מקור</th>
            <th className="text-end font-normal pb-2 ps-2 whitespace-nowrap">ביקורים</th>
            <th className="text-end font-normal pb-2 ps-2 whitespace-nowrap w-[38%]">עמודים לביקור</th>
            <th className="text-end font-normal pb-2 ps-2 whitespace-nowrap hidden sm:table-cell">עמוד אחד ויצאו</th>
            <th className="text-end font-normal pb-2 ps-3 whitespace-nowrap">פניות</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((r) => {
            const enough = r.visits >= MIN_FOR_RATE;
            return (
              <tr key={r.grp} className="border-t border-stone-100">
                <td className="py-2 pe-2 text-stone-700">{GROUP_LABELS[r.grp] || r.grp}</td>
                <td className="py-2 ps-2 text-end tabular-nums text-stone-800 font-semibold whitespace-nowrap">
                  {r.visits}
                </td>
                <td className="py-2 ps-2">
                  {/* The one column worth drawing: it is the whole point of the
                      card, and a bar compares four numbers faster than four
                      decimals do. */}
                  <div className="flex items-center gap-2 justify-end">
                    <span
                      className={`tabular-nums font-semibold w-8 text-end ${
                        enough ? 'text-stone-800' : 'text-stone-400'
                      }`}
                    >
                      {one(r.perVisit)}
                    </span>
                    {/* No bar under the threshold. An average over three
                        visits drawn at the same weight as one over 284 is the
                        chart telling a lie the number does not. */}
                    {enough && (
                      <span className="flex-1 h-1.5 rounded-full bg-stone-100 overflow-hidden max-w-[120px]">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${(r.perVisit / maxPerVisit) * 100}%`, background: '#0d9488' }}
                          aria-hidden="true"
                        />
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2 ps-2 text-end tabular-nums text-stone-500 whitespace-nowrap hidden sm:table-cell">
                  {enough ? `${share(r.one_page_visits, r.visits)}%` : <span title="מעט מדי ביקורים">-</span>}
                </td>
                <td className="py-2 ps-2 text-end tabular-nums text-stone-500 whitespace-nowrap">
                  {r.conversions || '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-[11px] text-stone-400 mt-3 leading-relaxed">
        מספרים מוצגים מלאים רק ממקור עם {MIN_FOR_RATE} ביקורים ומעלה. מקור שמביא הרבה ביקורים עם עמוד אחד לביקור
        מביא תנועה, לא קוראים.
      </p>
    </div>
  );
}
