'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SplitBar, SERIES } from './Charts';
import { enquiries } from '@/lib/heCount';

// "מאיפה הגיעו" used to be twelve rows, ten of them Google Ads with a different
// keyword on each. Every row was true and the card said nothing, because the
// split that decides anything - paid against free - was spread across rows that
// all looked alike.
//
// So: the paid/organic/direct proportion on top, five groups under it, and the
// keyword-level detail behind a tap. The number that matters on each group row
// is not visits, it is how many of those visits turned into an enquiry.

export type TrafficRow = {
  grp: string;
  kind: 'paid' | 'organic' | 'direct' | string;
  detail: string | null;
  visits: number;
  conversions: number;
};

const GROUP_LABELS: Record<string, string> = {
  google_ads: 'גוגל - מודעות בתשלום',
  paid_other: 'ממומן - פלטפורמה אחרת',
  organic_search: 'חיפוש אורגני בגוגל',
  social: 'פייסבוק ואינסטגרם',
  direct: 'ישיר - הקלדה או שמירה',
  referral: 'אתרים אחרים',
};

// What the detail column is, per group. Without this the expanded list is a
// column of strings with no header telling you what you are looking at.
const DETAIL_LABELS: Record<string, string> = {
  google_ads: 'לפי מילת החיפוש שהביאה את הקליק',
  paid_other: 'לפי קמפיין',
  organic_search: 'לפי מנוע החיפוש',
  social: 'לפי הרשת',
  referral: 'לפי האתר המפנה',
};

const KIND_LABELS: Record<string, string> = {
  paid: 'ממומן',
  organic: 'אורגני',
  direct: 'ישיר',
};

// Paid keeps the teal it has everywhere else on this page; organic and direct
// take neutral weights of the same hue family so the bar reads as one measure
// split three ways rather than three competing categories.
const KIND_COLORS: Record<string, string> = {
  paid: SERIES.primary,
  organic: SERIES.secondary,
  direct: '#a8a29e',
};

const rate = (conv: number, visits: number) => {
  if (visits === 0 || conv === 0) return '0%';
  return `${((conv / visits) * 100).toFixed(conv / visits >= 0.1 ? 0 : 1)}%`;
};

export default function TrafficSources({ rows }: { rows: TrafficRow[] }) {
  const [open, setOpen] = useState<string | null>(null);

  if (rows.length === 0) {
    return <p className="text-xs md:text-sm text-stone-400 py-2">אין עדיין תנועה בטווח הזה.</p>;
  }

  const groups = new Map<string, { grp: string; kind: string; visits: number; conversions: number; rows: TrafficRow[] }>();
  for (const r of rows) {
    const g = groups.get(r.grp) || { grp: r.grp, kind: r.kind, visits: 0, conversions: 0, rows: [] };
    g.visits += r.visits;
    g.conversions += r.conversions;
    if (r.detail) g.rows.push(r);
    groups.set(r.grp, g);
  }
  const list = [...groups.values()].sort((a, b) => b.visits - a.visits);

  const byKind = (kind: string) =>
    list.filter((g) => g.kind === kind).reduce((a, g) => a + g.visits, 0);

  const maxVisits = Math.max(...list.map((g) => g.visits), 1);

  return (
    <div>
      <SplitBar
        parts={(['paid', 'organic', 'direct'] as const).map((k) => ({
          key: k,
          label: KIND_LABELS[k],
          value: byKind(k),
          color: KIND_COLORS[k],
        }))}
      />

      <ul className="mt-3 divide-y divide-stone-100">
        {list.map((g) => {
          const expandable = g.rows.length > 0;
          const isOpen = open === g.grp;
          return (
            <li key={g.grp}>
              <button
                type="button"
                onClick={() => expandable && setOpen(isOpen ? null : g.grp)}
                aria-expanded={expandable ? isOpen : undefined}
                disabled={!expandable}
                className={`relative w-full text-start flex items-center gap-2 px-2 py-2.5 min-h-[44px] rounded-lg ${
                  expandable ? 'hover:bg-stone-50' : 'cursor-default'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-y-1 start-0 rounded-md"
                  style={{ width: `${(g.visits / maxVisits) * 100}%`, background: '#0D948814' }}
                />
                {expandable ? (
                  <ChevronDown
                    className={`relative w-4 h-4 flex-shrink-0 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                ) : (
                  <span className="w-4 flex-shrink-0" />
                )}
                <span className="relative flex-1 min-w-0 truncate text-[13px] md:text-sm text-stone-700">
                  {GROUP_LABELS[g.grp] || g.grp}
                </span>
                <span className="relative flex-shrink-0 text-[11px] text-stone-500 tabular-nums">
                  {g.conversions === 0 ? 'ללא פניות' : `${enquiries(g.conversions)} · ${rate(g.conversions, g.visits)}`}
                </span>
                <span className="relative font-semibold text-stone-800 tabular-nums flex-shrink-0 text-sm">
                  {g.visits}
                </span>
              </button>

              {isOpen && (
                <div className="pb-2 ps-6 pe-2">
                  <p className="text-[11px] text-stone-400 mb-1">
                    {DETAIL_LABELS[g.grp] || ''} · {g.rows.length}
                  </p>
                  <ol className="space-y-1">
                    {[...g.rows]
                      .sort((a, b) => b.visits - a.visits)
                      .map((r) => (
                        <li
                          key={`${r.grp}-${r.detail}`}
                          className="flex items-center gap-2 text-[12px] md:text-[13px] text-stone-600"
                        >
                          <span className="flex-1 min-w-0 truncate" title={r.detail || ''}>
                            {r.detail}
                          </span>
                          {r.conversions > 0 && (
                            <span className="flex-shrink-0 text-[11px] text-emerald-700 tabular-nums">
                              {enquiries(r.conversions)}
                            </span>
                          )}
                          <span className="flex-shrink-0 tabular-nums text-stone-700">{r.visits}</span>
                        </li>
                      ))}
                  </ol>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
