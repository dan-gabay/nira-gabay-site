'use client';

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';

import {
  enquiries,
  visits as visitCount,
  openings as openingCount,
  shares as shareCount,
  likes as likeCount,
  comments as commentCount,
} from '@/lib/heCount';

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
      {/* gap-px between parts: the same sliver of surface the stacked columns
          and the row bars use, so neighbouring parts never merge. */}
      <div className="flex h-2.5 gap-px rounded-full overflow-hidden bg-stone-100" role="img"
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
 * Visits per slot as columns, with the slots that produced an enquiry marked in
 * the row under the baseline - the same columns, marks and tooltip as every
 * chart over time on the page. Used for hour-of-day and day-of-week, where the x axis is
 * a fixed cycle rather than a timeline - the same shape would be misleading as
 * a line, because there is no continuity between 23:00 and 00:00.
 *
 * The bars carry one measure and keep one colour. Recolouring a bar because it
 * converted made four of seven weekdays amber, which reads as a second
 * category rather than as a mark on the first.
 */
export function SlotBars({ slots, height = 150 }: { slots: Slot[]; height?: number }) {
  const points: SeriesPoint[] = slots.map((sl) => ({ day: sl.label, values: { visits: sl.visits } }));
  return (
    <StackedBars
      data={points}
      series={[{ key: 'visits', label: 'ביקורים', color: SERIES.primary }]}
      height={height}
      aria="ביקורים ופניות לפי משבצת זמן"
      emptyText="אין עדיין תנועה בטווח הזה."
      emptyBucketText="אין ביקורים"
      formatTotal={visitCount}
      xLabel={(k) => k}
      marks={{
        color: ACTION_COLOR,
        label: 'התקבלה פנייה',
        counts: slots.map((sl) => sl.conversions),
        empty: 'לא התקבלו פניות בטווח הזה',
        describe: (i) => enquiries(slots[i].conversions),
      }}
    />
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
 * fillDays/fillHours for the one-row-per-bucket shape, where the row is a whole
 * record rather than a single number.
 *
 * Two charts need the same buckets as each other, not only as the range: the
 * reading-depth columns and the reaction markers underneath them are drawn from
 * separate queries and must line up index for index, or a reaction lands under
 * the wrong day.
 */
export function alignToBuckets<T extends { day: string }>(
  rows: T[],
  buckets: string[],
  empty: () => Omit<T, 'day'>,
): T[] {
  const by = new Map(rows.map((r) => [r.day, r]));
  return buckets.map((day) => by.get(day) ?? ({ day, ...empty() } as T));
}

/**
 * The stacked-column engine, shared by the two charts that are the same picture
 * of different data: visits split by where they came from, and article readings
 * split by how far the reader got.
 *
 * A stack rather than one line per series, because the question a totals card
 * cannot answer is "how much came in, and what was it made of". A stack answers
 * both at once: the column height is the bucket's total, the segments are the
 * split. Lines gave the split but never the total - the reader had to add five
 * values by eye.
 *
 * What a stack gives up is the shape of an individual series: only the segment
 * sitting on the baseline has a straight edge to be read against. That is the
 * accepted trade, and it is what decides the stack order at each call site.
 *
 * Every geometry number below was tuned against the traffic chart. The wrappers
 * under it change the words and, for reading depth, add one row of marks below
 * the baseline; nothing else.
 */
/**
 * A row of marks under the baseline, on the same bands as the columns: the
 * dashboard's one way of saying "in this bucket, somebody did something" about
 * an act that is not part of the column's height - an enquiry under visits, a
 * reaction under readings, an assistant's answer under crawls. One shape, one
 * size rule and one track everywhere, so a dot means the same thing in every
 * chart on the page and only its colour says which act.
 */
export type MarkRow = {
  /** Mark colour; also the legend swatch. */
  color: string;
  /** Legend text for one mark. */
  label: string;
  /** Count per bucket, index-aligned with the chart's data. */
  counts: number[];
  /** Said in the row's place when nothing happened in the whole range. */
  empty: string;
  /** The tooltip line for a bucket with a mark in it. */
  describe: (i: number) => string;
};

const MARK_ROW = 16;

/** Mark radius: 8px across is the floor for a mark that has to be found; a
 *  bucket with more than one gets a size step, the count is in the tooltip. */
const markR = (n: number) => (n > 1 ? 5.5 : 4);

export function StackedBars({
  data,
  series,
  height = 200,
  aria,
  emptyText,
  emptyBucketText,
  formatTotal,
  tooltipOrder = 'value',
  marks,
  tooltipExtra,
  xLabel = heDay,
}: {
  data: SeriesPoint[];
  series: Array<{ key: string; label: string; color: string }>;
  height?: number;
  aria: string;
  emptyText: string;
  emptyBucketText: string;
  formatTotal: (n: number) => string;
  /**
   * How the tooltip orders its lines. 'value' for an unordered set, where the
   * useful reading is which one was biggest; 'series' where the series are
   * themselves an ordered scale and re-sorting them by size would scramble the
   * order the chart is about.
   */
  tooltipOrder?: 'value' | 'series';
  /** The row of marks under the baseline, if the chart has one. */
  marks?: MarkRow;
  /** Extra lines in the tooltip for the hovered bucket, under the segments. */
  tooltipExtra?: (i: number) => ReactNode;
  /** The x label for a bucket key. Dates by default; a slot chart passes its own. */
  xLabel?: (key: string) => string;
}) {
  const footerHeight = marks ? MARK_ROW : 0;
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const pad = { t: 12, r: 10, b: 26 + footerHeight, l: 34 };
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
  // A short fixed cycle (the week) labels every bucket; a timeline thins out.
  const every = data.length <= 12 ? 1 : Math.max(1, Math.ceil(data.length / (w < 420 ? 4 : 8)));

  if (series.length === 0) {
    return <p className="text-xs md:text-sm text-stone-400 py-2">{emptyText}</p>;
  }

  // The surface gap - white, never a stroke around the segment. One consistent
  // width within a chart, but a thin bar gets the thinner of the two: at 2px on
  // a 3px-wide bar the segments stopped reading as a stack and became dashes.
  const GAP = bw < 8 ? 1 : 2;
  const R = 4; // rounded data-end, square at the baseline

  /**
   * The segments of one column, bottom-up, in the order `series` arrives in.
   *
   * Series with no value in this bucket are dropped rather than drawn as a
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
      // keeps its full height so the column still measures the bucket's total.
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

  // A series with nothing in that bucket is left out rather than listed as a
  // zero. Order is the caller's, because the right one depends on whether the
  // series mean anything as a sequence - see `tooltipOrder`.
  const rowsAt = (i: number) => {
    const rows = series
      .map((s) => ({ ...s, value: at(data[i], s.key) }))
      .filter((r) => r.value > 0);
    return tooltipOrder === 'value' ? rows.sort((a, b) => b.value - a.value) : rows;
  };

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
        {marks && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: marks.color }} />
            {marks.label}
          </span>
        )}
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
          aria-label={aria}
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
                <text
                  key={p.day}
                  x={bx(i) + bw / 2}
                  y={ih + 17 + footerHeight}
                  textAnchor="middle"
                  fontSize={10}
                  fill={MUTED}
                >
                  {xLabel(p.day)}
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
              <rect x={hover * band} y={0} width={band} height={ih + footerHeight} fill="#f5f5f4" />
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

            {/* A second row of marks under the baseline, on the same bands, for
                the chart that has something to say about a bucket beyond its
                height. Drawn after the columns and before the hit targets. */}
            {marks && (() => {
              const cy = ih + 2 + MARK_ROW / 2;
              const any = marks.counts.some((n) => n > 0);
              return (
                <g>
                  {/* A track when there is anything on it; the sentence in its
                      place when there is not, because "nothing happened" is an
                      answer and a row that appears only sometimes makes the
                      chart change height instead. */}
                  {any ? (
                    <line x1={0} x2={iw} y1={cy} y2={cy} stroke={GRID} strokeWidth={1} />
                  ) : (
                    <text x={iw / 2} y={cy} dy="0.32em" textAnchor="middle" fontSize={9} fill={MUTED}>
                      {marks.empty}
                    </text>
                  )}
                  {/* A surface ring, because at 90 days the band is thinner
                      than the mark and neighbouring marks touch. */}
                  {data.map((p, i) =>
                    (marks.counts[i] || 0) > 0 ? (
                      <circle
                        key={p.day}
                        cx={bx(i) + bw / 2}
                        cy={cy}
                        r={markR(marks.counts[i])}
                        fill={marks.color}
                        stroke="#fff"
                        strokeWidth={1.5}
                      />
                    ) : null,
                  )}
                </g>
              );
            })()}

            {/* Hit targets are the full band and the full plot height, so a
                column of two visits is as easy to hover as a column of forty.
                They sit last so they are above every mark. */}
            {data.map((p, i) => (
              <rect
                key={`hit-${p.day}`}
                x={i * band}
                y={0}
                width={band}
                height={ih + footerHeight}
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
            {xLabel(data[hover].day)}
            {totalAt(data[hover]) > 0 && (
              <span className="font-normal text-stone-500"> · {formatTotal(totalAt(data[hover]))}</span>
            )}
          </div>
          {rowsAt(hover).length === 0 ? (
            <div className="text-stone-400">{emptyBucketText}</div>
          ) : series.length === 1 ? null : (
            rowsAt(hover).map((r) => (
              <div key={r.key} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: r.color }} />
                {r.label}: <strong>{r.value}</strong>
              </div>
            ))
          )}
          {tooltipExtra?.(hover)}
          {marks && (marks.counts[hover] || 0) > 0 && (
            <div className="flex items-center gap-1.5 whitespace-nowrap mt-1 pt-1 border-t border-stone-100">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: marks.color }} />
              <strong>{marks.describe(hover)}</strong>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

/** Visits per bucket, stacked by traffic source. */
export function SourceBars({
  data,
  series,
  height = 210,
}: {
  data: SeriesPoint[];
  series: Array<{ key: string; label: string; color: string }>;
  height?: number;
}) {
  return (
    <StackedBars
      data={data}
      series={series}
      height={height}
      aria={`מבקרים לפי מקור הגעה לאורך זמן, עמודות נערמות: ${series.map((s) => s.label).join(', ')}`}
      emptyText="אין עדיין תנועה בטווח הזה."
      emptyBucketText="אין מבקרים"
      formatTotal={visitCount}
    />
  );
}

// ─────────────────────────────────────────── reading depth over time

/** One bucket of readings, split into how far each one got. */
export type DepthPoint = { day: string; opened: number; read: number; finished: number };

/** One bucket of deliberate actions. Aligned to the same buckets as DepthPoint. */
export type ReactionPoint = { day: string; shares: number; likes: number; comments: number };

/**
 * Reading depth is an ORDERED variable, so one hue in three steps rather than
 * three colours competing for meaning: darker is deeper, and the order reads
 * without the legend. Teal because it is this dashboard's measure hue already -
 * the visits line and the returning-visitor ramp are both teal - and depth is
 * that measure told properly, not a new one.
 *
 * The steps are Tailwind teal 400/600/800 and not 500/600/700. The adjacent
 * pair 500-600 separates by ΔE 10.5 to normal vision, under the 15 floor, and
 * on a 3px bar at 90 days those two segments stopped reading as two. 400/600/800
 * is ΔE 16.7 normal and 16.3 under deuteranopia on its worst pair of all three,
 * measured against every pair and not only the adjacent ones.
 *
 * The lightest step is 1.8:1 against the card, under the 3:1 bar, which is
 * allowed only with relief. There are three: the legend is always present, the
 * tooltip names every segment under the cursor, and the per-article table below
 * the chart carries the same numbers as text.
 *
 * Order is the stack order, baseline first. `finished` sits on the baseline
 * because it is the only position with a straight edge to read a trend against,
 * and a trend in finishes is the entire point of the card; floated in the
 * middle of the stack it would be a few pixels adrift on a moving base.
 */
export const DEPTH_SERIES = [
  { key: 'finished', label: 'נקרא עד הסוף', color: '#115e59' },
  { key: 'read', label: 'נקרא', color: '#0d9488' },
  { key: 'opened', label: 'נפתח בלבד', color: '#2dd4bf' },
];

/** The amber the dashboard already uses for "a person did something". */
export const ACTION_COLOR = '#B45309';

/**
 * Readings per bucket, stacked by depth, with one mark under the baseline for
 * every bucket in which somebody shared, liked or commented.
 *
 * The marks are a row rather than a fourth segment because they are not part of
 * the column: a share is an act during a reading, not a deeper kind of one, and
 * stacking it would have added it to a height that means readings. They are one
 * colour and one shape for all three kinds - the tiles above the chart say how
 * many of each, and the tooltip says which ones happened on that day. What the
 * row is for is the question the tiles cannot answer, which is *when*.
 */
export function DepthBars({
  data,
  reactions,
  height = 200,
  granularity = 'day',
}: {
  data: DepthPoint[];
  reactions: ReactionPoint[];
  height?: number;
  granularity?: 'hour' | 'day';
}) {
  const points: SeriesPoint[] = data.map((d) => ({
    day: d.day,
    values: { opened: d.opened, read: d.read, finished: d.finished },
  }));
  const reactionAt = (i: number) => {
    const r = reactions[i];
    return r ? r.shares + r.likes + r.comments : 0;
  };

  return (
    <StackedBars
      data={points}
      series={DEPTH_SERIES}
      height={height}
      aria={`פתיחות מאמר לאורך זמן, עמודות נערמות לפי עומק קריאה: ${DEPTH_SERIES.map((s) => s.label).join(', ')}`}
      emptyText="אין עדיין קריאות בטווח הזה."
      emptyBucketText="אין פתיחות"
      formatTotal={openingCount}
      // Depth is a scale, not a set of categories: listing the biggest first put
      // "נפתח בלבד" above "נקרא" on a busy day and read as a ranking of three
      // unrelated things. The stack order is the meaning, so the tooltip keeps it.
      tooltipOrder="series"
      marks={{
        color: ACTION_COLOR,
        label: `${granularity === 'hour' ? 'שעה' : 'יום'} עם תגובה, לייק או שיתוף`,
        counts: data.map((_, i) => reactionAt(i)),
        empty: 'אף אחד לא הגיב, שיתף או עשה לייק בטווח הזה',
        describe: (i) => {
          const r = reactions[i];
          return [
            r.shares > 0 ? shareCount(r.shares) : null,
            r.likes > 0 ? likeCount(r.likes) : null,
            r.comments > 0 ? commentCount(r.comments) : null,
          ]
            .filter(Boolean)
            .join(' · ');
        },
      }}
    />
  );
}

// ─────────────────────────────────────────── AI tools reading the site

/**
 * AI crawlers and, for scale, classic search crawlers, as the two segments of
 * one column; below the baseline, a mark for every bucket in which an AI
 * assistant opened a page while answering somebody.
 *
 * Magenta because it is already what AI means on this page: it is the
 * ai_referral slot of SOURCE_SERIES, validated there against the six source
 * hues. Search is neutral stone, because it is here as the yardstick and not
 * as a subject; a second hue would ask to be read as a second story. The
 * validator flags the stone for its chroma, which is the point of it; against
 * the magenta it clears CVD (ΔE 13.4 deutan), normal vision and 3:1 contrast.
 *
 * The answer fetches are marks and not a third segment for the same reason the
 * reactions are under the reading chart: they are a different act. A crawler
 * reads on its own schedule; an answer fetch means a person just asked an
 * assistant something and the site was part of the answer. Thirteen of those
 * stacked on a column of 1,500 crawls would be invisible, and they are the
 * part worth seeing.
 */
export const AI_SERIES = [
  { key: 'crawler', label: 'סריקה של כלי AI', color: '#d025ca' },
  { key: 'search', label: 'סריקה של מנוע חיפוש', color: '#78716c' },
];
/** Darker step of the same magenta: the mark has to hold against the track. */
export const AI_ANSWER_COLOR = '#86198f';

export type AiPoint = { day: string; crawler: number; answer: number; search: number };

export function AiFetchBars({
  data,
  height = 200,
  granularity = 'day',
}: {
  data: AiPoint[];
  height?: number;
  granularity?: 'hour' | 'day';
}) {
  const points: SeriesPoint[] = data.map((d) => ({ day: d.day, values: { crawler: d.crawler, search: d.search } }));
  return (
    <StackedBars
      data={points}
      series={AI_SERIES}
      height={height}
      aria="פניות של כלי AI ומנועי חיפוש לאתר לאורך זמן, עמודות נערמות, ומתחתיהן סימון לימים שבהם כלי AI פתח עמוד תוך כדי תשובה"
      emptyText="אין עדיין נתונים בטווח הזה."
      emptyBucketText="אין סריקות"
      formatTotal={(n) => (n === 1 ? 'סריקה אחת' : `${n.toLocaleString('he-IL')} סריקות`)}
      tooltipOrder="series"
      marks={{
        color: AI_ANSWER_COLOR,
        label: `${granularity === 'hour' ? 'שעה' : 'יום'} שבו כלי AI פתח עמוד תוך כדי תשובה`,
        counts: data.map((d) => d.answer),
        empty: 'אף כלי AI לא פתח עמוד תוך כדי תשובה בטווח הזה',
        describe: (i) => (data[i].answer === 1 ? 'פתיחה אחת תוך כדי תשובה' : `${data[i].answer} פתיחות תוך כדי תשובה`),
      }}
    />
  );
}

// ─────────────────────────────────────────── visits with enquiry marks

/** Views, as a second line beside visits. Indigo because amber is already the
 *  page's word for an enquiry; validated against the teal and the amber. */
const VIEWS_COLOR = '#6366f1';

/**
 * The overview's one chart: visits and page views as two lines, and a row of
 * marks under the baseline for every bucket in which somebody enquired.
 *
 * A line rather than columns: this is the page's one "how is it going over
 * time" picture, the two measures move together and the eye follows a line
 * more easily than two sets of columns. Everything around the plot is the same
 * as the column charts - legend above, the mark row, the tooltip - so it still
 * reads as one family. Enquiries are two orders of magnitude below visits, so
 * on a shared axis they would be a flat line on the floor; the mark row says
 * when, and the tooltip how many, without a second axis.
 *
 * Buckets before `measuredFrom` are not drawn as zero: they are not a quiet
 * stretch, nothing was measuring yet. The line starts where measurement did and
 * the stretch before it is shaded and named.
 */
export function VisitsTimeline({
  data,
  height = 210,
  granularity = 'day',
  measuredFrom,
}: {
  data: DayPoint[];
  height?: number;
  granularity?: 'hour' | 'day';
  /** YYYY-MM-DD of the first recorded event, if known. */
  measuredFrom?: string | null;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const pad = { t: 12, r: 10, b: 26 + MARK_ROW, l: 34 };
  const iw = Math.max(0, w - pad.l - pad.r);
  const ih = height - pad.t - pad.b;
  const n = data.length;

  // First bucket inside measurement. Hour keys compare on their date part.
  const firstIdx = measuredFrom
    ? Math.max(0, data.findIndex((d) => d.day.slice(0, 10) >= measuredFrom))
    : 0;
  const start = measuredFrom && data.every((d) => d.day.slice(0, 10) < measuredFrom) ? n : firstIdx;
  const measured = (i: number) => i >= start;

  const max = niceMax(Math.max(1, ...data.map((d) => Math.max(d.views, d.visits))));
  const x = (i: number) => (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => ih - (v / max) * ih;
  const ticks = [0, max / 2, max];
  const every = n <= 12 ? 1 : Math.max(1, Math.ceil(n / (w < 420 ? 4 : 8)));

  // Said inside the measured box rather than returned early: an early return
  // leaves the ref unattached on first render, and the width is never measured
  // once data arrives.
  if (n === 0 || data.every((d) => d.visits === 0 && d.views === 0)) {
    return (
      <div ref={ref} className="w-full">
        <p className="text-xs md:text-sm text-stone-400 py-2">אין עדיין תנועה בטווח הזה.</p>
      </div>
    );
  }

  const pts = data.map((d, i) => ({ ...d, i })).filter((d) => measured(d.i));
  const seg = (list: typeof pts, key: 'visits' | 'views') =>
    list.map((d, j) => `${j ? 'L' : 'M'}${x(d.i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ');
  const path = (key: 'visits' | 'views') => seg(pts, key);
  // The last bucket is the current one and is still filling, so its segment
  // is dashed: otherwise every evening the line appears to crash to zero.
  const done = pts.length > 2 ? pts.slice(0, -1) : pts;
  const tail = pts.length > 2 ? pts.slice(-2) : [];
  const isNow = (i: number) => i === n - 1;
  const area =
    pts.length > 1
      ? `${path('visits')} L${x(pts[pts.length - 1].i).toFixed(1)},${ih} L${x(pts[0].i).toFixed(1)},${ih} Z`
      : '';

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - box.left - pad.l;
    const i = n <= 1 ? 0 : Math.round((px / iw) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };

  const cy = ih + 2 + MARK_ROW / 2;
  const anyMark = data.some((d) => d.conversions > 0);
  const unit = granularity === 'hour' ? 'שעה' : 'יום';
  // Wide enough to name the unmeasured stretch rather than just shade it.
  const preW = start > 0 ? (start >= n ? iw : x(start) - (n > 1 ? iw / (n - 1) / 2 : 0)) : 0;

  const series = [
    { key: 'views' as const, label: 'צפיות בעמודים', color: VIEWS_COLOR },
    { key: 'visits' as const, label: 'ביקורים', color: SERIES.primary },
  ];

  return (
    <div ref={ref} className="w-full">
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-[11px] md:text-xs" style={{ color: INK }}>
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="w-3 h-[3px] rounded-full flex-shrink-0" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ACTION_COLOR }} />
          {unit} שבו התקבלה פנייה
        </span>
      </div>

      <div className="relative">
        {w > 0 && (
          <svg
            width={w}
            height={height}
            role="img"
            aria-label="ביקורים וצפיות לאורך זמן, עם סימון של הימים שבהם התקבלה פנייה"
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
            style={{ touchAction: 'pan-y' }}
          >
            <g transform={`translate(${pad.l},${pad.t})`}>
              {preW > 0 && (
                <g>
                  <rect x={0} y={0} width={preW} height={ih} fill="#f5f5f4" />
                  {preW > 70 && (
                    <text x={preW / 2} y={ih / 2} dy="0.32em" textAnchor="middle" fontSize={10} fill={MUTED}>
                      לפני תחילת המדידה
                    </text>
                  )}
                </g>
              )}

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
                  <text
                    key={d.day}
                    x={x(i)}
                    y={ih + 17 + MARK_ROW}
                    textAnchor={n > 1 && i === 0 ? 'start' : 'middle'}
                    fontSize={10}
                    fill={MUTED}
                  >
                    {heDay(d.day)}
                  </text>
                ) : null,
              )}

              {area && <path d={area} fill={SERIES.primary} opacity={0.08} />}
              {pts.length > 1 ? (
                series.map((s) => (
                  <g key={s.key}>
                    <path
                      d={seg(done, s.key)}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {tail.length > 0 && (
                      <path d={seg(tail, s.key)} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray="3 4" />
                    )}
                  </g>
                ))
              ) : (
                pts.map((d) =>
                  series.map((s) => <circle key={s.key} cx={x(d.i)} cy={y(d[s.key])} r={3.5} fill={s.color} />),
                )
              )}

              {/* The enquiry row, the same track and marks as the column charts. */}
              {anyMark ? (
                <line x1={0} x2={iw} y1={cy} y2={cy} stroke={GRID} strokeWidth={1} />
              ) : (
                <text x={iw / 2} y={cy} dy="0.32em" textAnchor="middle" fontSize={9} fill={MUTED}>
                  לא התקבלו פניות בטווח הזה
                </text>
              )}
              {data.map((d, i) =>
                d.conversions > 0 ? (
                  <circle
                    key={`m-${d.day}`}
                    cx={x(i)}
                    cy={cy}
                    r={markR(d.conversions)}
                    fill={ACTION_COLOR}
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                ) : null,
              )}

              {/* Crosshair and the two values on it. */}
              {hover !== null && (
                <g pointerEvents="none">
                  <line
                    x1={x(hover)}
                    x2={x(hover)}
                    y1={0}
                    y2={ih + MARK_ROW}
                    stroke={MUTED}
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                  {measured(hover) &&
                    series.map((s) => (
                      <circle
                        key={s.key}
                        cx={x(hover)}
                        cy={y(data[hover][s.key])}
                        r={4.5}
                        fill={s.color}
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
              left: Math.min(Math.max(0, x(hover) + pad.l - 55), Math.max(0, w - 170)),
              color: INK,
            }}
          >
            <div className="font-semibold text-stone-800">
              {heDay(data[hover].day)}
              {isNow(hover) && <span className="font-normal text-stone-500"> · עד עכשיו</span>}
            </div>
            {!measured(hover) ? (
              <div className="text-stone-400">לפני תחילת המדידה</div>
            ) : (
              series.map((s) => (
                <div key={s.key} className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-2.5 h-[3px] rounded-full flex-shrink-0" style={{ background: s.color }} />
                  {s.label}: <strong>{data[hover][s.key]}</strong>
                </div>
              ))
            )}
            {data[hover].conversions > 0 && (
              <div className="flex items-center gap-1.5 whitespace-nowrap mt-1 pt-1 border-t border-stone-100">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ACTION_COLOR }} />
                <strong>{enquiries(data[hover].conversions)}</strong>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
