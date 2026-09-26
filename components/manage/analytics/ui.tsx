'use client';

import type { ReactNode } from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

// The building blocks every section of /manage/analytics is made of, so the page
// has one visual language rather than one per card: one section header, one
// card, one KPI, one ranked bar list, one empty state. A new figure on the page
// should be expressible in these; if it is not, that is a design question to
// answer here, not a one-off to style inline.

/** A titled block of the page, and a target for the jump nav. */
export function Section({
  id,
  title,
  question,
  aside,
  children,
}: {
  id: string;
  title: string;
  /** The management question the section answers, in one line. */
  question: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    // scroll-mt clears the admin header plus the sticky range bar, so a jump
    // lands on the heading and not under it.
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-40 md:scroll-mt-44 space-y-3 md:space-y-4">
      <div className="flex items-end justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <h2 id={`${id}-h`} className="text-base md:text-lg font-bold text-stone-800 leading-tight">
            {title}
          </h2>
          <p className="text-[12px] md:text-[13px] text-stone-500 mt-0.5">{question}</p>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Card({
  title,
  sub,
  children,
  className = '',
}: {
  title?: string;
  sub?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-stone-200 p-4 md:p-5 min-w-0 ${className}`}>
      {title && (
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h3 className="text-[13px] md:text-sm font-semibold text-stone-800">{title}</h3>
          {sub && <span className="text-[11px] text-stone-400 text-end">{sub}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-xs md:text-sm text-stone-400 py-2">{children}</p>;
}

/** A small caveat under a figure. Grey, short, never a paragraph. */
export function Note({ children }: { children: ReactNode }) {
  return <p className="text-[11px] text-stone-400 leading-relaxed mt-3">{children}</p>;
}

// ─────────────────────────────────────────── KPI

export type Delta =
  | { kind: 'count'; now: number; prev: number }
  | { kind: 'rate'; now: number; prev: number } // compared in points
  | { kind: 'ratio'; now: number; prev: number } // e.g. pages per visit
  | null;

/**
 * The change against the previous window of the same length.
 *
 * Null means "there is no honest comparison", and the caller decides that - most
 * often because the previous window starts before measurement did, which made a
 * month read "+701%" against eight days of data.
 */
export function DeltaBadge({ delta }: { delta: Delta }) {
  if (!delta) return null;
  const { now, prev } = delta;
  const diff = now - prev;
  if (Math.abs(diff) < 1e-9) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-stone-400">
        <Minus className="w-3 h-3" aria-hidden="true" />
        ללא שינוי
      </span>
    );
  }
  const up = diff > 0;
  let text: string;
  if (delta.kind === 'rate') {
    const d = Math.round(diff * 10) / 10;
    text = `${d > 0 ? '+' : ''}${d} נק'`;
  } else if (delta.kind === 'ratio' || prev === 0) {
    const d = Math.round(diff * 10) / 10;
    text = `${d > 0 ? '+' : ''}${d}`;
  } else {
    const p = Math.round((diff / prev) * 100);
    text = `${p > 0 ? '+' : ''}${p}%`;
  }
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums ${
        up ? 'text-emerald-700' : 'text-rose-700'
      }`}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      <span dir="ltr">{text}</span>
    </span>
  );
}

export function Kpi({
  label,
  value,
  delta,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  delta: Delta;
  sub?: string;
  /** A 3px bar at the start edge, for the one KPI the page is about. */
  accent?: string;
}) {
  return (
    <div className="relative bg-white rounded-2xl border border-stone-200 p-3.5 md:p-4 overflow-hidden min-w-0">
      {accent && (
        <span aria-hidden="true" className="absolute inset-y-0 start-0 w-[3px]" style={{ background: accent }} />
      )}
      <p className="text-[12px] md:text-[13px] text-stone-500 truncate">{label}</p>
      <p className="mt-1 flex items-baseline gap-2 flex-wrap">
        <span className="text-[26px] md:text-[32px] font-bold text-stone-800 leading-none tabular-nums">
          {value}
        </span>
        <DeltaBadge delta={delta} />
      </p>
      {sub && <p className="text-[11px] text-stone-400 mt-1.5 truncate">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────── ranked bars

export type BarRow = {
  key: string;
  label: string;
  /** Grey, after the label: what kind of thing this row is. */
  sub?: string;
  value: number;
  /** Small text before the value, e.g. "2 פניות · 3%". */
  meta?: ReactNode;
  /** A swatch before the label, when the row is a category with a fixed colour. */
  swatch?: string;
};

/**
 * One measure over a handful of rows, as a bar behind each row. The bar is a
 * tint of the measure's colour, so the text over it keeps full ink contrast and
 * the list still reads as a list.
 */
export function BarList({
  rows,
  color = '#0D9488',
  empty = 'אין עדיין נתונים בטווח הזה.',
  limit,
}: {
  rows: BarRow[];
  color?: string;
  empty?: string;
  limit?: number;
}) {
  if (rows.length === 0) return <Empty>{empty}</Empty>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  const shown = limit ? rows.slice(0, limit) : rows;
  return (
    <ol className="space-y-1">
      {shown.map((r) => (
        <li key={r.key} className="relative">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 start-0 rounded-md"
            style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: `${color}1f` }}
          />
          <span className="relative flex items-center gap-2 px-2 py-1.5 min-h-[34px] text-[13px] md:text-sm">
            {r.swatch && (
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: r.swatch }} aria-hidden="true" />
            )}
            <span className="flex-1 min-w-0 truncate text-stone-700" title={r.label}>
              {r.label}
              {r.sub && <span className="text-stone-400"> · {r.sub}</span>}
            </span>
            {r.meta && <span className="flex-shrink-0 text-[11px] text-stone-500 tabular-nums">{r.meta}</span>}
            <span className="font-semibold text-stone-800 tabular-nums flex-shrink-0 min-w-[1.5rem] text-end">
              {r.value}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** A two-to-four way segmented control. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  size = 'md',
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid bg-stone-200/70 rounded-xl p-1 gap-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={o.value === value}
          className={`rounded-lg font-medium whitespace-nowrap transition-colors ${
            size === 'sm' ? 'min-h-[32px] px-2 text-[12px]' : 'min-h-[36px] px-2 text-[13px]'
          } ${o.value === value ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);
export const one = (n: number) => (Math.round(n * 10) / 10).toString();
/** A share as a whole percent, except under 10 where the decimal is the story. */
export const rateText = (part: number, whole: number) => {
  const r = pct(part, whole);
  return `${r >= 10 || r === 0 ? Math.round(r) : one(r)}%`;
};
