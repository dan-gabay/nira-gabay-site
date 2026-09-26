'use client';

import { SERIES } from '@/components/manage/Charts';
import { enquiries as enquiryCount } from '@/lib/heCount';
import { Card, Empty, MIN_FOR_RATE, Note, StackBar, duration, rateText, wholePct } from './ui';
import type { SiteBehavior } from './types';

// "כמה עמודים ביקור עובר, וכמה זמן זה לוקח?" One row per depth, so the
// question under it is answerable by eye: does a visit that goes further end
// in an enquiry more often?
//
// Duration is first event to last event in the visit. There is no exit event,
// so the time on the last page is never counted and a one-page visit reads as
// zero - which is why that row shows no duration at all rather than a
// misleading "0 שנ׳", and why it is a median: one tab left open overnight would
// drag a mean past anything true about the rest.

const LABELS: Record<number, string> = {
  1: 'עמוד אחד',
  2: '2 עמודים',
  3: '3-4 עמודים',
  5: '5 עמודים ומעלה',
};

const COLS = 'md:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)_6rem_7.5rem]';

export function VisitDepth({ data }: { data: SiteBehavior | null }) {
  if (!data) {
    return (
      <Card title="עומק ביקור">
        <Empty>טוען...</Empty>
      </Card>
    );
  }
  const rows = data.depth;
  const total = rows.reduce((a, r) => a + r.visits, 0);
  if (total === 0) {
    return (
      <Card title="עומק ביקור">
        <Empty>אין עדיין ביקורים בטווח הזה.</Empty>
      </Card>
    );
  }
  const max = Math.max(...rows.map((r) => r.visits));

  const single = rows.find((r) => r.ord === 1);
  const multi = rows.filter((r) => r.ord > 1);
  const multiVisits = multi.reduce((a, r) => a + r.visits, 0);
  const multiConv = multi.reduce((a, r) => a + r.converted, 0);
  const compare = single && single.visits >= MIN_FOR_RATE && multiVisits >= MIN_FOR_RATE;

  return (
    <Card title="עומק ביקור" sub="כמה עמודים, כמה זמן, ומי פנה">
      {/* The two sentences the rows below add up to. */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] md:text-[13px] text-stone-600 mb-3">
        {multiVisits > 0 && data.multi_page_median_secs !== null && (
          <p>
            ביקור שעבר בין עמודים נמשך בחציון{' '}
            <strong className="text-stone-800 tabular-nums">{duration(data.multi_page_median_secs)}</strong>
          </p>
        )}
        {compare && (
          <p>
            שיעור פנייה: עמוד אחד <strong className="text-stone-800 tabular-nums">{rateText(single.converted, single.visits)}</strong>
            {' · '}
            יותר מעמוד אחד <strong className="text-stone-800 tabular-nums">{rateText(multiConv, multiVisits)}</strong>
          </p>
        )}
      </div>

      <div className={`hidden md:grid ${COLS} gap-3 px-2 pb-2 text-[11px] text-stone-400 border-b border-stone-100`}>
        <span>עומק</span>
        <span>ביקורים</span>
        <span className="text-end">זמן חציוני</span>
        <span className="text-end">פניות</span>
      </div>
      <ul className="divide-y divide-stone-100">
        {rows.map((r) => {
          const share = wholePct(r.visits, total);
          const time = r.ord === 1 ? '-' : duration(r.median_secs);
          const conv =
            r.converted === 0
              ? 'ללא פניות'
              : `${enquiryCount(r.converted)}${r.visits >= MIN_FOR_RATE ? ` · ${rateText(r.converted, r.visits)}` : ''}`;
          const bar = (
            <StackBar
              of={r.visits}
              max={max}
              parts={[{ key: 'v', value: r.visits, color: SERIES.primary }]}
              label={`${LABELS[r.ord]}: ${r.visits} ביקורים, ${share}%`}
            />
          );
          return (
            <li key={r.ord} className="px-2 py-2.5">
              {/* Phone: name and count, the bar, then one grey line. */}
              <div className="md:hidden">
                <div className="flex items-baseline gap-2 text-[13px]">
                  <span className="flex-1 min-w-0 truncate font-medium text-stone-800">{LABELS[r.ord] || r.ord}</span>
                  <span className="font-semibold text-stone-800 tabular-nums">{r.visits}</span>
                  <span className="text-[11px] text-stone-400 tabular-nums w-8 text-end">{share}%</span>
                </div>
                {bar}
                <p className="mt-1 text-[11px] text-stone-500">
                  {r.ord > 1 && <>חציון {time} · </>}
                  <span className={r.converted > 0 ? 'text-amber-800 font-medium' : ''}>{conv}</span>
                  {r.with_article > 0 && <> · {r.with_article} קראו מאמר</>}
                </p>
              </div>

              {/* Desktop: the table row. */}
              <div className={`hidden md:grid ${COLS} gap-3 items-center text-[13px]`}>
                <span className="truncate text-stone-800">{LABELS[r.ord] || r.ord}</span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-stone-800 tabular-nums w-9">{r.visits}</span>
                  <span className="flex-1 -mt-1">{bar}</span>
                  <span className="text-[11px] text-stone-400 tabular-nums w-8 text-end">{share}%</span>
                </span>
                <span className="text-end tabular-nums text-stone-700">
                  {r.ord === 1 ? <span className="text-stone-300" title="אין זמן לביקור של עמוד אחד">-</span> : time}
                </span>
                <span className={`text-end tabular-nums ${r.converted > 0 ? 'text-amber-800 font-medium' : 'text-stone-400'}`}>
                  {conv}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <Note>
        זמן נמדד מהפעולה הראשונה בביקור ועד האחרונה. הזמן על העמוד האחרון לא נספר, כי אין אירוע יציאה, ולכן לביקור של
        עמוד אחד אין זמן כלל, וגם הזמנים האחרים קצרים מהאמת. מוצג חציון ולא ממוצע, כדי שלשונית אחת שנשארה פתוחה לא
        תעוות את התמונה.
      </Note>
    </Card>
  );
}
