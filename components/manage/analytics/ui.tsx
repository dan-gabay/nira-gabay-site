'use client';

import type { ReactNode } from 'react';
import { ArrowUp, ArrowDown, ChevronDown, Minus } from 'lucide-react';

// The building blocks every section of /manage/analytics is made of, so the page
// has one visual language rather than one per card: one section header, one
// card, one KPI, one stat tile, one ranked bar list, one segmented row, one
// legend, one "show more", one empty state. A new figure on the page
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

/**
 * A second part of the same card, under a hairline. A card that answers two
 * related questions keeps them together rather than becoming two cards, and
 * every such split on the page is this one rule and this one gap.
 */
export function CardPart({ children }: { children: ReactNode }) {
  return <div className="mt-4 pt-4 border-t border-stone-100">{children}</div>;
}

/** The heading of a list or a figure inside a card. */
export function SubHead({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 mb-2">
      <h4 className="text-[12px] md:text-[13px] font-semibold text-stone-700">{title}</h4>
      {aside && <span className="text-[11px] text-stone-400 tabular-nums text-end">{aside}</span>}
    </div>
  );
}

/** Swatch and name, for any figure with more than one colour in it. */
export function Legend({ items }: { items: Array<{ key: string; label: string; color: string; round?: boolean }> }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-[11px] md:text-xs text-stone-600">
      {items.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span
            className={`w-2.5 h-2.5 flex-shrink-0 ${s.round ? 'rounded-full' : 'rounded-sm'}`}
            style={{ background: s.color }}
            aria-hidden="true"
          />
          {s.label}
        </span>
      ))}
    </div>
  );
}

/**
 * The compact figure inside a card: a count, an optional share of something,
 * and one grey line. The KPI is the same thing at page scale; this is its size
 * inside a card, so a section's own numbers never compete with the four at the
 * top.
 */
export function Stat({
  label,
  value,
  rate,
  sub,
  delta,
  color,
}: {
  label: string;
  value: number | string;
  /** A whole percent after the value, when the sample carries one. */
  rate?: number | null;
  sub?: string;
  delta?: Delta;
  /** A swatch before the label, when the figure is one series of a chart below. */
  color?: string;
}) {
  return (
    <div className="bg-stone-50 rounded-xl px-3 py-2.5 min-w-0">
      <p className="text-[11px] md:text-[12px] text-stone-500 truncate flex items-center gap-1.5">
        {color && <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: color }} aria-hidden="true" />}
        {label}
      </p>
      <p className="mt-0.5 flex items-baseline gap-x-2 flex-wrap">
        <span className="text-lg md:text-xl font-bold text-stone-800 tabular-nums leading-tight">
          {typeof value === 'number' ? value.toLocaleString('he-IL') : value}
        </span>
        {rate !== null && rate !== undefined && (
          <span className="text-[11px] text-stone-400 tabular-nums">{rate}%</span>
        )}
        {delta && <DeltaBadge delta={delta} />}
      </p>
      {sub && <p className="text-[11px] text-stone-400 truncate mt-0.5">{sub}</p>}
    </div>
  );
}

/** Two tiles a row on a phone, four on a desktop. */
export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{children}</div>;
}

/**
 * One row's magnitude and its composition in a single 6px bar: the track is
 * scaled to the biggest row, so lengths compare down the list, and split into
 * parts, so the colour says what the length was made of. The numbers are
 * always in text beside it; the bar is the picture of them, not the record.
 */
export function StackBar({
  parts,
  of,
  max,
  label,
}: {
  parts: Array<{ key: string; value: number; color: string }>;
  /** The row's total. Parts may sum to less; the rest is left as track. */
  of: number;
  max: number;
  label: string;
}) {
  const width = max > 0 ? (of / max) * 100 : 0;
  const seg = (v: number) => (of > 0 ? (v / of) * 100 : 0);
  return (
    <div className="mt-1 h-1.5 rounded-full bg-stone-100 overflow-hidden" role="img" aria-label={label}>
      {/* gap-px, not a border: the same sliver of card between fills that the
          stacked columns use, so a two-visit segment never merges into the
          one beside it. */}
      <div className="flex h-full rounded-full overflow-hidden gap-px" style={{ width: `${width}%` }}>
        {parts.map((p) =>
          p.value > 0 ? <span key={p.key} style={{ width: `${seg(p.value)}%`, background: p.color }} /> : null,
        )}
      </div>
    </div>
  );
}

/** The one way a list on this page grows past its preview. */
export function ShowMore({
  open,
  onToggle,
  more,
}: {
  open: boolean;
  onToggle: () => void;
  /** What the closed button offers, e.g. "הצג את כל 14 המאמרים". */
  more: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="mt-2 w-full min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-xl text-[12px] md:text-[13px] font-medium text-stone-600 hover:bg-stone-50"
    >
      {open ? 'הצג פחות' : more}
      <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
    </button>
  );
}

/** A card that opens on request, for depth nobody needs on every visit. */
export function Disclosure({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <details className="group bg-white rounded-2xl border border-stone-200 min-w-0">
      <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none flex items-center justify-between gap-3 p-4 md:p-5 min-h-[44px]">
        <span className="min-w-0">
          <span className="block text-[13px] md:text-sm font-semibold text-stone-800">{title}</span>
          {sub && <span className="block text-[11px] text-stone-400 mt-0.5">{sub}</span>}
        </span>
        <ChevronDown
          className="w-5 h-5 flex-shrink-0 text-stone-400 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="px-4 pb-4 md:px-5 md:pb-5 border-t border-stone-100 pt-4">{children}</div>
    </details>
  );
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
 * One measure over a handful of rows: the name and the number on one line, and
 * under them the same 6px bar every ranked row on the page uses (articles,
 * search landings, visit depth), scaled to the biggest row. One grammar for
 * "how much, compared with the others", wherever the list is.
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
    <ol className="space-y-2.5">
      {shown.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline gap-2 text-[12px] md:text-[13px]">
            {r.swatch && (
              <span className="w-2 h-2 rounded-sm flex-shrink-0 self-center" style={{ background: r.swatch }} aria-hidden="true" />
            )}
            <span className="flex-1 min-w-0 truncate text-stone-700" title={r.label}>
              {r.label}
              {r.sub && <span className="text-stone-400"> · {r.sub}</span>}
            </span>
            {r.meta && <span className="flex-shrink-0 text-[11px] text-stone-500 tabular-nums">{r.meta}</span>}
            <strong className="text-stone-800 font-semibold tabular-nums flex-shrink-0 min-w-[1.5rem] text-end">
              {r.value}
            </strong>
          </div>
          <StackBar
            of={r.value}
            max={max}
            label={`${r.label}: ${r.value}`}
            parts={[{ key: 'v', value: r.value, color: r.swatch || color }]}
          />
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

/**
 * Under this many a percentage is one visitor wearing a costume. Counts still
 * show below it; only the rate is withheld. One floor for the whole page.
 */
export const MIN_FOR_RATE = 10;

export const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);
/** A share as a whole percent, for the grey figure beside a count. */
export const wholePct = (part: number, whole: number) => Math.round(pct(part, whole));
export const one = (n: number) => (Math.round(n * 10) / 10).toString();
/** A share as a whole percent, except under 10 where the decimal is the story. */
export const rateText = (part: number, whole: number) => {
  const r = pct(part, whole);
  return `${r >= 10 || r === 0 ? Math.round(r) : one(r)}%`;
};

/** Seconds as "45 שנ׳" or "2:05 דק׳". */
export function duration(seconds: number): string {
  if (seconds < 60) return `${seconds} שנ׳`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')} דק׳`;
}
