'use client';

import { useEffect, useRef, useState } from 'react';

import { enquiries, visits as visitCount } from '@/lib/heCount';

// Charts for the admin analytics page, hand-built in SVG - the whole dashboard
// is two chart shapes, and a library would cost more than it saves.
//
// Palette: teal #0D9488 and amber #B45309. The site's own #1A4A44 / #3FC195
// were the obvious first choice and both failed validation - the dark teal
// sits below the chroma floor and reads as grey, and the mint falls under 3:1
// against a light surface. This pair clears the lightness band, the chroma
// floor, CVD separation and contrast in both light and dark.
export const SERIES = {
  primary: '#0D9488',
  secondary: '#B45309',
} as const;

const INK = '#57534e';   // stone-600, for all text - never the series colour
const MUTED = '#a8a29e'; // stone-400, for grid and axes
const GRID = '#e7e5e4';  // stone-200

/** Actual pixel width, so strokes and type never scale with the viewport. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

// Buckets arrive as either 2026-08-23 (a day) or 2026-08-23T14 (an hour), so
// the label follows the key rather than needing to be told which it is.
const heDay = (key: string) => {
  const [date, hour] = key.split('T');
  if (hour !== undefined) return `${hour}:00`;
  const d = new Date(`${date}T00:00`);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

function niceMax(v: number): number {
  if (v <= 4) return 4;
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / mag) * mag;
}

export type DayPoint = { day: string; views: number; visits: number; conversions: number };

/**
 * The clock the whole dashboard is read on.
 *
 * Both halves of a bucket key have to agree on it. The SQL emits keys in Israel
 * local time; these builders used to assemble theirs from the browser's clock
 * with getHours()/getDate(), which is only the same thing while the browser
 * happens to sit in Israel - and was not the same thing at all while the SQL
 * was still emitting UTC. A key the two sides spell differently is not an error
 * anywhere, it is a bucket that silently reads as zero.
 */
const CLOCK = 'Asia/Jerusalem';

const KEY_PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: CLOCK,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
});

/**
 * The bucket an instant falls into, spelled exactly as the SQL spells it.
 * Exported for the tests: this one function is where the off-by-three-hours
 * bug lived, and it is the only part of the axis that can be checked against a
 * fixed instant rather than against whatever "now" happens to be.
 */
export function clockKey(at: Date, unit: 'day' | 'hour'): string {
  const p: Record<string, string> = {};
  for (const part of KEY_PARTS.formatToParts(at)) p[part.type] = part.value;
  const day = `${p.year}-${p.month}-${p.day}`;
  return unit === 'hour' ? `${day}T${p.hour}` : day;
}

/**
 * The bucket keys a range covers, oldest first - the x axis, gaps included.
 *
 * Hours step by an absolute hour, so a DST change repeats or skips exactly the
 * hour the real clock does. Days step on a noon anchor rather than by adding 24
 * hours to a local midnight: on the two days a year the offset moves, adding
 * 24 hours to midnight lands on the same calendar date twice, or skips one.
 */
export function bucketKeys(count: number, unit: 'day' | 'hour'): string[] {
  const out: string[] = [];
  if (unit === 'hour') {
    const now = Date.now();
    for (let i = count - 1; i >= 0; i--) out.push(clockKey(new Date(now - i * 3_600_000), 'hour'));
    return out;
  }
  const [y, m, d] = clockKey(new Date(), 'day').split('-').map(Number);
  const anchor = Date.UTC(y, m - 1, d, 12);
  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(anchor - i * 86_400_000);
    out.push(
      `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-` +
        `${String(t.getUTCDate()).padStart(2, '0')}`,
    );
  }
  return out;
}

/** Fills gaps, so a quiet hour reads as zero instead of the line jumping it. */
export function fillHours(rows: DayPoint[], hours = 24): DayPoint[] {
  return fillPoints(rows, bucketKeys(hours, 'hour'));
}

/** Fills gaps, so a quiet Tuesday reads as zero instead of vanishing. */
export function fillDays(rows: DayPoint[], days: number): DayPoint[] {
  return fillPoints(rows, bucketKeys(days, 'day'));
}

function fillPoints(rows: DayPoint[], keys: string[]): DayPoint[] {
  const by = new Map(rows.map((r) => [r.day, r]));
  return keys.map(
    (day) => by.get(day) || { day, views: 0, visits: 0, conversions: 0 },
  );
}

// ─────────────────────────────────────────────── two-series line

export function LineChart({
  data,
  labels,
  height = 190,
}: {
  data: DayPoint[];
  labels: { primary: string; secondary: string };
  height?: number;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const pad = { t: 12, r: 10, b: 26, l: 34 };
  const iw = Math.max(0, w - pad.l - pad.r);
  const ih = height - pad.t - pad.b;
  const max = niceMax(Math.max(1, ...data.map((d) => Math.max(d.views, d.visits))));

  const x = (i: number) => (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => ih - (v / max) * ih;
  const line = (key: 'views' | 'visits') =>
    data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ');

  const ticks = [0, max / 2, max];
  const every = Math.max(1, Math.ceil(data.length / (w < 420 ? 4 : 8)));

  return (
    <div ref={ref} className="relative w-full">
      {/* Legend: two series, so identity is never colour alone. */}
      <div className="flex items-center gap-4 mb-1.5 text-[11px] md:text-xs" style={{ color: INK }}>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: SERIES.primary }} />
          {labels.primary}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: SERIES.secondary }} />
          {labels.secondary}
        </span>
      </div>

      {w > 0 && (
        <svg
          width={w}
          height={height}
          role="img"
          aria-label={`${labels.primary} ו${labels.secondary} לאורך זמן`}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const px = e.clientX - r.left - pad.l;
            const i = Math.round((px / Math.max(1, iw)) * (data.length - 1));
            setHover(Math.min(data.length - 1, Math.max(0, i)));
          }}
        >
          <g transform={`translate(${pad.l},${pad.t})`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={0} x2={iw} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
                <text x={-8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill={MUTED}>
                  {Math.round(t)}
                </text>
              </g>
            ))}

            {data.map((d, i) =>
              i % every === 0 ? (
                <text key={d.day} x={x(i)} y={ih + 17} textAnchor="middle" fontSize={10} fill={MUTED}>
                  {heDay(d.day)}
                </text>
              ) : null,
            )}

            <path d={line('views')} fill="none" stroke={SERIES.primary} strokeWidth={2}
                  strokeLinejoin="round" strokeLinecap="round" />
            <path d={line('visits')} fill="none" stroke={SERIES.secondary} strokeWidth={2}
                  strokeLinejoin="round" strokeLinecap="round" />

            {hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={0} y2={ih} stroke={MUTED} strokeWidth={1} strokeDasharray="3 3" />
                {(['views', 'visits'] as const).map((k) => (
                  <circle
                    key={k}
                    cx={x(hover)}
                    cy={y(data[hover][k])}
                    r={4.5}
                    fill={k === 'views' ? SERIES.primary : SERIES.secondary}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </g>
            )}
          </g>
        </svg>
      )}

      {hover !== null && data[hover] && (
        <div
          className="pointer-events-none absolute top-0 bg-white border border-stone-200 rounded-lg shadow-sm px-2.5 py-1.5 text-[11px] leading-relaxed"
          style={{
            // `left`, not `insetInlineStart`: x() is measured from the SVG's
            // left edge and this page is RTL, so an inline-start offset put the
            // tooltip on the opposite side of the chart from the cursor.
            left: Math.min(Math.max(0, x(hover) + pad.l - 45), Math.max(0, w - 110)),
            color: INK,
          }}
        >
          <div className="font-semibold text-stone-800">{heDay(data[hover].day)}</div>
          <div>{labels.primary}: <strong>{data[hover].views}</strong></div>
          <div>{labels.secondary}: <strong>{data[hover].visits}</strong></div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────── conversion bars

export function BarChart({ data, height = 150 }: { data: DayPoint[]; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const pad = { t: 10, r: 10, b: 26, l: 34 };
  const iw = Math.max(0, w - pad.l - pad.r);
  const ih = height - pad.t - pad.b;
  const max = niceMax(Math.max(1, ...data.map((d) => d.conversions)));

  // 2px of surface between bars, per the mark spec.
  const step = data.length ? iw / data.length : iw;
  const bw = Math.max(2, step - 2);
  const y = (v: number) => ih - (v / max) * ih;
  const ticks = [0, max];
  const every = Math.max(1, Math.ceil(data.length / (w < 420 ? 4 : 8)));

  return (
    <div ref={ref} className="relative w-full">
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label="פניות לפי יום"
             onMouseLeave={() => setHover(null)}>
          <g transform={`translate(${pad.l},${pad.t})`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={0} x2={iw} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
                <text x={-8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill={MUTED}>
                  {Math.round(t)}
                </text>
              </g>
            ))}

            {data.map((d, i) =>
              i % every === 0 ? (
                <text key={d.day} x={i * step + bw / 2} y={ih + 17} textAnchor="middle" fontSize={10} fill={MUTED}>
                  {heDay(d.day)}
                </text>
              ) : null,
            )}

            {data.map((d, i) => (
              <g key={d.day} onMouseEnter={() => setHover(i)}>
                {/* Full-height hit target: a 1-conversion bar is 4px tall. */}
                <rect x={i * step} y={0} width={Math.max(bw, 6)} height={ih} fill="transparent" />
                {d.conversions > 0 && (
                  <rect
                    x={i * step}
                    y={y(d.conversions)}
                    width={bw}
                    height={Math.max(3, ih - y(d.conversions))}
                    rx={2}
                    fill={SERIES.primary}
                    opacity={hover === null || hover === i ? 1 : 0.55}
                  />
                )}
              </g>
            ))}
          </g>
        </svg>
      )}

      {hover !== null && data[hover] && (
        <div
          className="pointer-events-none absolute top-0 bg-white border border-stone-200 rounded-lg shadow-sm px-2.5 py-1.5 text-[11px]"
          style={{
            insetInlineStart: Math.min(Math.max(0, hover * step + pad.l - 30), Math.max(0, w - 90)),
            color: INK,
          }}
        >
          <span className="font-semibold text-stone-800">{heDay(data[hover].day)}</span>
          {' · '}
          <strong>{data[hover].conversions}</strong> פניות
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────── proportion bar

/**
 * One measure split into named parts, drawn as a single bar with the legend
 * carrying the numbers. A pie would need three labels and a key to say the
 * same thing, and would still not let you compare two periods by eye.
 */
export function SplitBar({
  parts,
}: {
  parts: Array<{ key: string; label: string; value: number; color: string }>;
}) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  if (total === 0) return <p className="text-xs md:text-sm text-stone-400 py-2">אין עדיין תנועה בטווח הזה.</p>;
  const shown = parts.filter((p) => p.value > 0);

  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden bg-stone-100" role="img"
           aria-label={shown.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(', ')}>
        {shown.map((p) => (
          <span key={p.key} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] md:text-xs" style={{ color: INK }}>
        {shown.map((p) => (
          <span key={p.key} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: p.color }} />
            {p.label}
            <strong className="tabular-nums text-stone-800">{p.value}</strong>
            <span className="text-stone-400 tabular-nums">{Math.round((p.value / total) * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────── categorical bars

export type Slot = { label: string; visits: number; conversions: number };

/**
 * Visits per slot as bars, with the slots that produced an enquiry marked by a
 * dot above the bar. Used for hour-of-day and day-of-week, where the x axis is
 * a fixed cycle rather than a timeline - the same shape would be misleading as
 * a line, because there is no continuity between 23:00 and 00:00.
 *
 * The bars carry one measure and keep one colour. Recolouring a bar because it
 * converted made four of seven weekdays amber, which reads as a second
 * category rather than as a mark on the first.
 */
export function SlotBars({ slots, height = 110 }: { slots: Slot[]; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { t: 10, r: 2, b: 18, l: 2 };
  const iw = Math.max(0, w - pad.l - pad.r);
  const ih = height - pad.t - pad.b;
  const max = Math.max(1, ...slots.map((s) => s.visits));
  const step = slots.length ? iw / slots.length : iw;
  // Seven bars across a full-width card are 95px each and read as a wall, so
  // the bar is capped and centred in its slot instead of filling it.
  const bw = Math.max(2, Math.min(step - 2, 30));
  const every = slots.length > 12 ? (w < 420 ? 4 : 2) : 1;
  const bx = (i: number) => i * step + (step - bw) / 2;

  return (
    <div ref={ref} className="relative w-full">
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label="ביקורים ופניות לפי משבצת זמן"
             onMouseLeave={() => setHover(null)}>
          <g transform={`translate(${pad.l},${pad.t})`}>
            {slots.map((s, i) => {
              const h = (s.visits / max) * ih;
              return (
                <g key={s.label} onMouseEnter={() => setHover(i)}>
                  <rect x={i * step} y={0} width={Math.max(step, 6)} height={ih} fill="transparent" />
                  <rect
                    x={bx(i)}
                    y={ih - h}
                    width={bw}
                    height={Math.max(s.visits > 0 ? 2 : 0, h)}
                    rx={2}
                    fill={SERIES.primary}
                    opacity={hover === null || hover === i ? 1 : 0.5}
                  />
                  {s.conversions > 0 && (
                    <circle cx={bx(i) + bw / 2} cy={Math.max(4, ih - h - 6)} r={3.5} fill={SERIES.secondary} />
                  )}
                  {i % every === 0 && (
                    <text x={bx(i) + bw / 2} y={ih + 13} textAnchor="middle" fontSize={9} fill={MUTED}>
                      {s.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      )}
      <div className="mt-1 text-[11px]" style={{ color: INK }}>
        {hover !== null && slots[hover] ? (
          <span>
            <strong className="text-stone-800">{slots[hover].label}</strong>
            {' · '}{visitCount(slots[hover].visits)}
            {slots[hover].conversions > 0 && <> · {enquiries(slots[hover].conversions)}</>}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-stone-400">
            <span className="w-2 h-2 rounded-full" style={{ background: SERIES.secondary }} />
            נקודה = התקבלה פנייה
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────── ranked list

export function RankedList({
  rows,
  emptyText,
}: {
  rows: Array<{ label: string; sub?: string; value: number; meta?: string }>;
  emptyText: string;
}) {
  if (rows.length === 0) {
    return <p className="text-xs md:text-sm text-stone-400 py-2">{emptyText}</p>;
  }
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <ol className="space-y-1.5">
      {rows.map((r) => (
        <li key={`${r.label}-${r.sub || ''}`} className="relative">
          {/* Magnitude as a single-hue bar behind the row: one measure, so one
              hue at varying strength rather than a categorical palette. */}
          <span
            aria-hidden="true"
            className="absolute inset-y-0 start-0 rounded-md"
            style={{ width: `${(r.value / max) * 100}%`, background: '#0D948814' }}
          />
          <span className="relative flex items-center gap-2 px-2 py-1.5 text-[13px] md:text-sm">
            <span className="flex-1 min-w-0 truncate text-stone-700" title={r.label}>
              {r.label}
              {r.sub && <span className="text-stone-400"> · {r.sub}</span>}
            </span>
            {r.meta && (
              <span className="flex-shrink-0 text-[11px] text-stone-500 tabular-nums">{r.meta}</span>
            )}
            <span className="font-semibold text-stone-800 tabular-nums flex-shrink-0">{r.value}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

// ─────────────────────────────────────────── traffic sources over time

/**
 * The categorical palette for the traffic-source stack.
 *
 * Six fixed slots, one per source group, assigned by entity and never by rank -
 * so filtering the range, or a group dropping to zero, can never repaint the
 * survivors.
 *
 * These are re-stepped from the values the line version used, and the reason is
 * the switch to a stack. Lines almost never touch, so that palette only had to
 * clear the *adjacent* pairlist, and it did. Stacked segments touch by
 * construction, and worse, which pairs touch is not fixed: a source with no
 * visits in one bucket is a zero-height segment, and its neighbours close up
 * over it. On a quiet day google_ads and direct end up sharing an edge. Under
 * the all-pairs test the old set failed hard - teal against green was ΔE 10.7
 * to normal vision, below the 15 floor, and pink against green ΔE 3.0 under
 * deuteranopia.
 *
 * Every group keeps its hue family, so nothing changes meaning: paid stays
 * teal, organic stays orange, social stays blue, direct stays green, referral
 * stays violet, other-paid stays rose. Only the steps moved.
 *
 * Validated as an ordered set on white, all pairs: lightness band and chroma
 * floor pass, normal vision worst pair ΔE 16.4 (floor 15), every hue over 3:1
 * against the card. Worst CVD pair is rose against teal at ΔE 7.7 deutan, which
 * sits in the 6-8 band and is legal only with secondary encoding - which this
 * chart has three of: the 2px surface gap between every pair of segments, a
 * legend that is always present, and a tooltip that names every source in the
 * column under the cursor.
 *
 * ai_referral joined as a seventh slot without disturbing any of that. It was
 * chosen by searching every hex that passes the per-colour checks, holding the
 * six fixed, and keeping only candidates that cost nothing on either separation
 * metric: with the magenta added, the worst CVD pair is still rose-against-teal
 * at 7.7 and the worst normal pair is still blue-against-teal at 16.4. The new
 * hue is the limiting factor on no check.
 *
 * It is a magenta rather than a fresh hue family because there was no fresh
 * family to have. The yellow-to-green quadrant is the one wide gap left in the
 * wheel, and it is unusable here: a gold light enough to stay clear of orange
 * falls under 3:1 on white, and every olive and lime that clears contrast lands
 * within ΔE 15 of direct-green or of the teal, which is a hard fail that
 * secondary encoding is explicitly not allowed to excuse. Magenta sits between
 * referral-violet and other-paid-rose, and both of those are darker and more
 * muted; other-paid has never appeared in production data at all.
 */
export const SOURCE_SERIES: Record<string, string> = {
  google_ads: '#0D9488',
  organic_search: '#eb6834',
  social: '#2a78d6',
  direct: '#166534',
  referral: '#5B21B6',
  paid_other: '#BE185D',
  ai_referral: '#d025ca',
};

export type SeriesPoint = { day: string; values: Record<string, number> };

/** fillDays/fillHours, for the one-row-per-bucket-per-group shape. */
export function fillSeries(
  rows: Array<{ day: string; grp: string; visits: number }>,
  buckets: string[],
): SeriesPoint[] {
  const by = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const slot = by.get(r.day) || {};
    slot[r.grp] = (slot[r.grp] || 0) + r.visits;
    by.set(r.day, slot);
  }
  return buckets.map((day) => ({ day, values: by.get(day) || {} }));
}

/**
 * Visits per bucket, stacked by traffic source.
 *
 * A stack rather than one line per source, because the question the card above
 * cannot answer is "how much traffic came in, and what was it made of". A stack
 * answers both at once: the column height is the day's total, the segments are
 * the split. Lines gave the split but never the total - the reader had to add
 * five values by eye.
 *
 * What a stack gives up is the shape of an individual series: only the segment
 * sitting on the baseline has a straight edge to be read against. That is the
 * accepted trade, and it decides the stack order below.
 */
export function SourceBars({
  data,
  series,
  height = 210,
}: {
  data: SeriesPoint[];
  series: Array<{ key: string; label: string; color: string }>;
  height?: number;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const pad = { t: 12, r: 10, b: 26, l: 34 };
  const iw = Math.max(0, w - pad.l - pad.r);
  const ih = height - pad.t - pad.b;

  const at = (p: SeriesPoint, key: string) => p.values[key] || 0;
  const totalAt = (p: SeriesPoint) => series.reduce((a, s) => a + at(p, s.key), 0);
  const max = niceMax(Math.max(1, ...data.map(totalAt)));

  // Band per bucket, with the bar capped so a short range does not produce one
  // slab per day. The leftover inside the band is air, not bar.
  //
  // The air is a share of the band rather than a fixed number of pixels. 90
  // days on a phone is a 4px band, where a fixed 2px gutter was eating half of
  // every bar and left a row of hairlines; a share keeps the bar the thicker
  // part of its band at any density, and the 24px cap still stops a 7-day range
  // from drawing one slab per day.
  const band = data.length ? iw / data.length : iw;
  const bw = Math.max(2, Math.min(24, band - Math.min(8, Math.max(1, band * 0.28))));
  const bx = (i: number) => i * band + (band - bw) / 2;
  const y = (v: number) => ih - (v / max) * ih;

  const ticks = [0, max / 2, max];
  const every = Math.max(1, Math.ceil(data.length / (w < 420 ? 4 : 8)));

  if (series.length === 0) {
    return <p className="text-xs md:text-sm text-stone-400 py-2">אין עדיין תנועה בטווח הזה.</p>;
  }

  // The surface gap - white, never a stroke around the segment. One consistent
  // width within a chart, but a thin bar gets the thinner of the two: at 2px on
  // a 3px-wide bar the segments stopped reading as a stack and became dashes.
  const GAP = bw < 8 ? 1 : 2;
  const R = 4; // rounded data-end, square at the baseline

  /**
   * The segments of one column, bottom-up, in the order `series` arrives in.
   *
   * Sources with no visits in this bucket are dropped rather than drawn as a
   * zero-height sliver, so `topmost` is the last one that actually has height
   * and gets the rounded end. Everything below it is shaved by the gap.
   */
  const segmentsAt = (i: number) => {
    const out: Array<{ key: string; label: string; color: string; value: number; y: number; h: number; top: boolean }> = [];
    let base = 0;
    const present = series.filter((s) => at(data[i], s.key) > 0);
    present.forEach((s, j) => {
      const v = at(data[i], s.key);
      const bottom = y(base);
      const top = y(base + v);
      const isTop = j === present.length - 1;
      // The gap goes above every segment that has one above it. The topmost
      // keeps its full height so the column still measures the day's total.
      const shave = isTop ? 0 : GAP;
      out.push({ ...s, value: v, y: top, h: Math.max(1, bottom - top - shave), top: isTop });
      base += v;
    });
    return out;
  };

  // A rounded top on the data-end, square where it meets the baseline.
  const capPath = (x: number, top: number, h: number) => {
    const r = Math.min(R, bw / 2, h);
    const b = top + h;
    return `M${x},${b} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + bw - r},${top} Q${x + bw},${top} ${x + bw},${top + r} L${x + bw},${b} Z`;
  };

  // Tooltip rows: biggest first, and a source that sent nobody in that bucket
  // is left out rather than listed as a zero.
  const rowsAt = (i: number) =>
    series
      .map((s) => ({ ...s, value: at(data[i], s.key) }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);

  return (
    <div ref={ref} className="w-full">
      {/* Always present, never optional: with this many hues on one surface,
          the swatch is a pointer to the name, not a substitute for it. */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-[11px] md:text-xs" style={{ color: INK }}>
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      {/* The tooltip is positioned against the plot box, so it can never ride
          up over the legend, and in `left` rather than `insetInlineStart`:
          bx() is an SVG coordinate measured from the left edge, while the page
          is RTL, so an inline-start offset put the tooltip on the opposite
          side of the chart from the cursor. */}
      <div className="relative">
      {w > 0 && (
        <svg
          width={w}
          height={height}
          role="img"
          aria-label={`מבקרים לפי מקור הגעה לאורך זמן, עמודות נערמות: ${series.map((s) => s.label).join(', ')}`}
          onMouseLeave={() => setHover(null)}
        >
          <g transform={`translate(${pad.l},${pad.t})`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={0} x2={iw} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
                <text x={-8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill={MUTED}>
                  {Math.round(t)}
                </text>
              </g>
            ))}

            {data.map((p, i) =>
              i % every === 0 ? (
                <text key={p.day} x={bx(i) + bw / 2} y={ih + 17} textAnchor="middle" fontSize={10} fill={MUTED}>
                  {heDay(p.day)}
                </text>
              ) : null,
            )}

            {/* The hover highlight is a backdrop behind one band, never opacity
                on the others. Dimming the rest to 45% looked tidy and quietly
                undid the palette: at that strength the green reads as sage and
                the teal as pale mint, the two become hard to tell apart, and
                every comparison is a washed column against a full-strength one.
                A backdrop leaves all six hues exactly as validated. */}
            {hover !== null && (
              <rect x={hover * band} y={0} width={band} height={ih} fill="#f5f5f4" />
            )}

            {data.map((p, i) => (
              <g key={p.day}>
                {segmentsAt(i).map((sg) =>
                  sg.top ? (
                    <path key={sg.key} d={capPath(bx(i), sg.y, sg.h)} fill={sg.color} />
                  ) : (
                    <rect key={sg.key} x={bx(i)} y={sg.y} width={bw} height={sg.h} fill={sg.color} />
                  ),
                )}
              </g>
            ))}

            {/* Hit targets are the full band and the full plot height, so a
                column of two visits is as easy to hover as a column of forty.
                They sit last so they are above every mark. */}
            {data.map((p, i) => (
              <rect
                key={`hit-${p.day}`}
                x={i * band}
                y={0}
                width={band}
                height={ih}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            ))}
          </g>
        </svg>
      )}

      {hover !== null && data[hover] && (
        <div
          className="pointer-events-none absolute top-0 bg-white border border-stone-200 rounded-lg shadow-sm px-2.5 py-1.5 text-[11px] leading-relaxed"
          style={{
            left: Math.min(Math.max(0, bx(hover) + pad.l - 55), Math.max(0, w - 190)),
            color: INK,
          }}
        >
          <div className="font-semibold text-stone-800">
            {heDay(data[hover].day)}
            {totalAt(data[hover]) > 0 && (
              <span className="font-normal text-stone-500"> · {visitCount(totalAt(data[hover]))}</span>
            )}
          </div>
          {rowsAt(hover).length === 0 ? (
            <div className="text-stone-400">אין מבקרים</div>
          ) : (
            rowsAt(hover).map((r) => (
              <div key={r.key} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: r.color }} />
                {r.label}: <strong>{r.value}</strong>
              </div>
            ))
          )}
        </div>
      )}
      </div>
    </div>
  );
}
