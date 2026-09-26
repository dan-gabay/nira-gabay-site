'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { VisitsTimeline, ACTION_COLOR, SERIES, type DayPoint } from '@/components/manage/Charts';
import type { Insight } from '@/lib/analyticsInsights';
import { Card, Kpi, one, pct, type Delta } from './ui';
import type { Totals } from './types';

// "איך הולך?" in one screen: four numbers, what they mean, and their shape
// over the range. Everything below this section is the explanation of it.
//
// Four KPIs, not six. Views are the visits figure drawn again at 1.4x, and list
// signups have been a standing zero since the list launched; both stay on the
// page (views in the visits sub-line and the chart tooltip) without taking a
// tile of the same weight as enquiries.

export function Overview({
  totals,
  previous,
  prevComplete,
  firstEvent,
  insights,
  timeline,
  rangeLabel,
}: {
  totals: Totals;
  previous: Totals;
  /** False when the previous window starts before measurement did. */
  prevComplete: boolean;
  firstEvent: string | null;
  insights: Insight[];
  timeline: DayPoint[];
  rangeLabel: string;
}) {
  const rate = pct(totals.conversions, totals.visits);
  const prevRate = pct(previous.conversions, previous.visits);
  const perVisit = totals.visits > 0 ? totals.views / totals.visits : 0;
  const prevPerVisit = previous.visits > 0 ? previous.views / previous.visits : 0;

  // No comparison at all rather than a dishonest one: a month measured against
  // the eight days that existed before it read "+701%", and that number was
  // on the screen for weeks being true and meaningless.
  const d = (delta: NonNullable<Delta>): Delta => (prevComplete ? delta : null);

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
        <Kpi
          label="פניות"
          value={totals.conversions}
          delta={d({ kind: 'count', now: totals.conversions, prev: previous.conversions })}
          sub="ווטסאפ, טלפון, מייל וטופס"
          accent={ACTION_COLOR}
        />
        <Kpi
          label="ביקורים"
          value={totals.visits.toLocaleString('he-IL')}
          delta={d({ kind: 'count', now: totals.visits, prev: previous.visits })}
          sub={`${totals.views.toLocaleString('he-IL')} צפיות בעמודים`}
          accent={SERIES.primary}
        />
        <Kpi
          label="שיעור פנייה"
          value={`${one(rate)}%`}
          delta={previous.visits >= 20 ? d({ kind: 'rate', now: rate, prev: prevRate }) : null}
          sub="מתוך כל הביקורים"
        />
        <Kpi
          label="עמודים לביקור"
          value={one(perVisit)}
          delta={previous.visits >= 20 ? d({ kind: 'ratio', now: perVisit, prev: prevPerVisit }) : null}
          sub="כמה עמודים נקראים בממוצע"
        />
      </div>

      {!prevComplete && firstEvent && (
        <p className="text-[11px] text-stone-400 px-0.5 -mt-1">
          אין השוואה לתקופה הקודמת: המדידה התחילה ב-{heDate(firstEvent)}, כך שהתקופה הקודמת לא נמדדה במלואה.
        </p>
      )}

      {/* The figures above, said as sentences. Silent under a minimum sample,
          which at this site's volume is often - see lib/analyticsInsights.ts. */}
      {insights.length > 0 && (
        <Card title="מה עולה מהנתונים">
          <ul className="space-y-2.5">
            {insights.map((ins) => (
              <li key={ins.text} className="flex items-start gap-2 text-[13px] md:text-sm text-stone-700 leading-relaxed">
                {ins.tone === 'warn' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" aria-label="לתשומת לב" />
                ) : ins.tone === 'good' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" aria-label="חיובי" />
                ) : (
                  <span className="w-4 flex-shrink-0 flex justify-center mt-2" aria-hidden="true">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                  </span>
                )}
                <span className="min-w-0">{ins.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="ביקורים ופניות לאורך זמן" sub={rangeLabel}>
        <VisitsTimeline
          data={timeline}
          granularity={timeline[0]?.day.includes('T') ? 'hour' : 'day'}
          measuredFrom={firstEvent}
        />
      </Card>
    </div>
  );
}

/** '2026-08-23' as '23.8.2026'. */
export const heDate = (iso: string) => {
  const [y, m, dd] = iso.slice(0, 10).split('-').map(Number);
  return `${dd}.${m}.${y}`;
};
