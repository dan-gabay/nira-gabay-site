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
 * Fills gaps, so a quiet hour reads as zero instead of the line jumping over
 * it. Same job as fillDays, on the hourly buckets a 24-hour range returns.
 */
export function fillHours(rows: DayPoint[], hours = 24): DayPoint[] {
  const by = new Map(rows.map((r) => [r.day, r]));
  const out: DayPoint[] = [];
  const now = new Date();
  for (let i = hours - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600_000);
    const key =
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-` +
      `${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}`;
    out.push(by.get(key) || { day: key, views: 0, visits: 0, conversions: 0 });
  }
  return out;
}

/** Fills gaps, so a quiet Tuesday reads as zero instead of vanishing. */
export function fillDays(rows: DayPoint[], days: number): DayPoint[] {
  const by = new Map(rows.map((r) => [r.day, r]));
  const out: DayPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push(by.get(key) || { day: key, views: 0, visits: 0, conversions: 0 });
  }
  return out;
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
            insetInlineStart: Math.min(Math.max(0, x(hover) + pad.l - 45), Math.max(0, w - 110)),
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
