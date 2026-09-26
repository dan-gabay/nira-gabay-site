'use client';

import { SlotBars, SplitBar, SERIES, type Slot } from '@/components/manage/Charts';
import { ReturningVisitors, type ReturningSummary } from '@/components/manage/Audience';
import { Card } from './ui';
import { DEVICE_LABELS } from './labels';
import type { Payload } from './types';

// "מי המבקרים ומתי?" Last on the page because it changes the least from one
// range to the next and informs the fewest decisions: which screen to check a
// change on, whether anyone comes back, and when the ads should be running.

const WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

// Mobile keeps the page's volume teal; the rest step down to neutral greys so
// the bar reads as "phone, and everything else".
const DEVICE_COLORS: Record<string, string> = {
  mobile: SERIES.primary,
  desktop: '#78716c',
  tablet: '#d6d3d1',
  unknown: '#e7e5e4',
};

// What a response from before the visitor counter looks like; zero known visits
// is the card's own "not measured yet" state.
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

export function AudienceSection({ data, isHourly }: { data: Payload; isHourly: boolean }) {
  const devices = (data.devices || [])
    .slice()
    .sort((a, b) => b.n - a.n)
    .map((d) => ({
      key: d.device,
      label: DEVICE_LABELS[d.device] || d.device,
      value: d.n,
      color: DEVICE_COLORS[d.device] || '#e7e5e4',
    }));

  const hourSlots: Slot[] = Array.from({ length: 24 }, (_, h) => {
    const row = (data.by_hour || []).find((x) => x.hour === h);
    return { label: String(h).padStart(2, '0'), visits: row?.visits ?? 0, conversions: row?.conversions ?? 0 };
  });
  const weekSlots: Slot[] = WEEKDAYS.map((label, dow) => {
    const row = (data.by_weekday || []).find((x) => x.dow === dow);
    return { label, visits: row?.visits ?? 0, conversions: row?.conversions ?? 0 };
  });
  // On 24 hours the timeline at the top already is the hour-of-day chart.
  const hasClock = (data.by_hour || []).length > 0 && !isHourly;

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 md:gap-4">
        <Card title="מכשירים" sub="לפי ביקור">
          <SplitBar parts={devices} />
        </Card>
        <Card title="מבקרים חוזרים" sub="לפי דפדפן, בלי IP">
          <ReturningVisitors
            summary={data.returning ?? EMPTY_RETURNING}
            buckets={data.returning_buckets || []}
            totalVisits={data.totals.visits}
          />
        </Card>
      </div>

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
    </div>
  );
}
