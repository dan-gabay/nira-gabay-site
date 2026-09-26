'use client';

import { SplitBar } from './Charts';
import { enquiries } from '@/lib/heCount';
import { Empty, MIN_FOR_RATE, Note, one, wholePct } from './analytics/ui';

// Is anyone coming back? Every other card treats a visit as the unit and so
// cannot tell forty people who came once from ten who came four times.
// Rates stay under the page's MIN_FOR_RATE floor, like everywhere else.

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
      <Empty>
        המדידה של מבקרים חוזרים התחילה עכשיו, ולכן היא עוד לא מכסה את הטווח הזה.
        ביקור חוזר נספר רק מהפעם הבאה שאותו דפדפן חוזר.
      </Empty>
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

  const newRate = summary.new_visits >= MIN_FOR_RATE ? wholePct(summary.new_conversions, summary.new_visits) : null;
  const retRate =
    summary.returning_visits >= MIN_FOR_RATE ? wholePct(summary.returning_conversions, summary.returning_visits) : null;

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
      <Note>
        נמדד על {known.toLocaleString('he-IL')} מתוך {totalVisits.toLocaleString('he-IL')} ביקורים בטווח.
        הספירה היא לפי דפדפן, לא לפי אדם: מי שמנקה היסטוריה או מגיע ממכשיר אחר נספר כחדש, ואין כאן כתובות IP.
      </Note>
    </div>
  );
}
