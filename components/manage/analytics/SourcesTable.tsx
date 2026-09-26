'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SOURCE_SERIES } from '@/components/manage/Charts';
import { GROUP_LABELS, type TrafficRow } from '@/components/manage/TrafficSources';
import { enquiries as enquiryCount } from '@/lib/heCount';
import { Empty, MIN_FOR_RATE, Note, one, pct, rateText } from './ui';
import type { SourceRow } from './types';

// "איזו תנועה שווה?" as one table. It used to be two cards about the same seven
// groups - one ranked by volume, one by pages per visit - and the reader had to
// hold both in their head to see that the biggest source is also the shallowest.
// One row per source now carries all of it: how much, how many wrote, whether
// that is better or worse than the site as a whole, and whether they read.
//
// The benchmark is the site's own average, not an industry figure. There is no
// honest outside number for "a therapist's site in Jerusalem", and the question
// the row answers is relative anyway: where is the next shekel better spent.

const DETAIL_LABELS: Record<string, string> = {
  google_ads: 'לפי מילת החיפוש',
  paid_other: 'לפי קמפיין',
  organic_search: 'לפי מנוע החיפוש',
  social: 'לפי הרשת',
  ai_referral: 'לפי הכלי שהמליץ',
  referral: 'לפי האתר המפנה',
};

type Verdict = { glyph: '▲' | '▼' | '='; text: string; tone: 'up' | 'down' | 'flat' } | null;

function verdict(conv: number, visits: number, siteRate: number): Verdict {
  if (visits < MIN_FOR_RATE || siteRate === 0) return null;
  const r = pct(conv, visits);
  // A band around the average rather than a strict comparison: at this volume
  // 1.9% against 2.0% is one enquiry of noise, not a finding.
  if (r >= siteRate * 1.25) return { glyph: '▲', text: 'מעל הממוצע', tone: 'up' };
  if (r <= siteRate * 0.75) return { glyph: '▼', text: 'מתחת לממוצע', tone: 'down' };
  return { glyph: '=', text: 'בממוצע', tone: 'flat' };
}

function VerdictTag({ v }: { v: Verdict }) {
  if (!v) return null;
  const color = v.tone === 'up' ? 'text-emerald-700' : v.tone === 'down' ? 'text-rose-700' : 'text-stone-500';
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap ${color}`}>
      <span aria-hidden="true" className="text-[9px]">{v.glyph}</span>
      {v.text}
    </span>
  );
}

export function SourcesTable({
  rows,
  details,
  siteVisits,
  siteConversions,
}: {
  rows: SourceRow[];
  details: TrafficRow[];
  siteVisits: number;
  siteConversions: number;
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (rows.length === 0) return <Empty>אין עדיין תנועה בטווח הזה.</Empty>;

  const siteRate = pct(siteConversions, siteVisits);
  const total = rows.reduce((a, r) => a + r.visits, 0) || 1;
  const ranked = [...rows].sort((a, b) => b.visits - a.visits);
  const maxShare = Math.max(...ranked.map((r) => r.visits / total));

  const detailsFor = (grp: string) =>
    details.filter((t) => t.grp === grp && t.detail).sort((a, b) => b.visits - a.visits);

  return (
    <div>
      {/* Header, desktop only. On a phone the stats line names itself. */}
      <div className="hidden md:grid grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_4.5rem_8.5rem_5rem_5rem] gap-3 px-2 pb-2 text-[11px] text-stone-400 border-b border-stone-100">
        <span>מקור</span>
        <span>ביקורים</span>
        <span className="text-end">פניות</span>
        <span className="text-end">שיעור פנייה</span>
        <span className="text-end">עמודים לביקור</span>
        <span className="text-end">עמוד אחד</span>
      </div>

      <ul className="divide-y divide-stone-100">
        {ranked.map((r) => {
          const sub = detailsFor(r.grp);
          const expandable = sub.length > 0;
          const isOpen = open === r.grp;
          const enough = r.visits >= MIN_FOR_RATE;
          const share = r.visits / total;
          const v = verdict(r.conversions, r.visits, siteRate);
          const perVisit = r.visits > 0 ? r.views / r.visits : 0;
          const color = SOURCE_SERIES[r.grp] || '#a8a29e';
          const name = GROUP_LABELS[r.grp] || r.grp;

          const chevron = expandable ? (
            <ChevronDown
              className={`w-4 h-4 flex-shrink-0 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          ) : (
            <span className="w-4 flex-shrink-0" />
          );

          const shareBar = (
            <span className="flex-1 h-1.5 rounded-full bg-stone-100 overflow-hidden min-w-[2rem]">
              <span
                className="block h-full rounded-full"
                style={{ width: `${(share / maxShare) * 100}%`, background: color }}
              />
            </span>
          );

          return (
            <li key={r.grp}>
              <button
                type="button"
                onClick={() => expandable && setOpen(isOpen ? null : r.grp)}
                aria-expanded={expandable ? isOpen : undefined}
                disabled={!expandable}
                className={`w-full text-start px-2 py-2.5 min-h-[44px] rounded-lg ${
                  expandable ? 'hover:bg-stone-50' : 'cursor-default'
                }`}
              >
                {/* Phone: two lines. */}
                <span className="md:hidden block">
                  <span className="flex items-center gap-2">
                    {chevron}
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} aria-hidden="true" />
                    <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-stone-800">{name}</span>
                    <span className="text-[13px] font-semibold text-stone-800 tabular-nums">{r.visits}</span>
                    <span className="text-[11px] text-stone-400 tabular-nums w-8 text-end">{Math.round(share * 100)}%</span>
                  </span>
                  <span className="flex items-center gap-2 ps-6 mt-1 text-[11px] text-stone-500">
                    <span>
                      {r.conversions === 0 ? 'ללא פניות' : enquiryCount(r.conversions)}
                      {enough && r.conversions > 0 && <> · {rateText(r.conversions, r.visits)}</>}
                    </span>
                    <VerdictTag v={v} />
                  </span>
                  {enough && (
                    <span className="block ps-6 text-[11px] text-stone-400">
                      {one(perVisit)} עמודים לביקור · {Math.round(pct(r.one_page_visits, r.visits))}% יצאו אחרי עמוד אחד
                    </span>
                  )}
                </span>

                {/* Desktop: the table row. */}
                <span className="hidden md:grid grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_4.5rem_8.5rem_5rem_5rem] gap-3 items-center text-[13px]">
                  <span className="flex items-center gap-2 min-w-0">
                    {chevron}
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} aria-hidden="true" />
                    <span className="truncate text-stone-800">{name}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-stone-800 tabular-nums w-9">{r.visits}</span>
                    {shareBar}
                    <span className="text-[11px] text-stone-400 tabular-nums w-8 text-end">{Math.round(share * 100)}%</span>
                  </span>
                  <span className="text-end tabular-nums text-stone-800 font-semibold">{r.conversions || '-'}</span>
                  <span className="text-end tabular-nums text-stone-700 flex items-center justify-end gap-2">
                    {enough ? (
                      <>
                        <span className="text-[11px]"><VerdictTag v={v} /></span>
                        {rateText(r.conversions, r.visits)}
                      </>
                    ) : (
                      <span className="text-stone-300" title="מעט מדי ביקורים">-</span>
                    )}
                  </span>
                  <span className="text-end tabular-nums text-stone-700">{enough ? one(perVisit) : <span className="text-stone-300">-</span>}</span>
                  <span className="text-end tabular-nums text-stone-700">
                    {enough ? `${Math.round(pct(r.one_page_visits, r.visits))}%` : <span className="text-stone-300">-</span>}
                  </span>
                </span>
              </button>

              {isOpen && (
                <div className="pb-3 ps-8 pe-2 md:ps-10">
                  <p className="text-[11px] text-stone-400 mb-1.5">{DETAIL_LABELS[r.grp] || 'פירוט'}</p>
                  <ol className="space-y-1">
                    {sub.map((t) => (
                      <li key={`${t.grp}-${t.detail}`} className="flex items-center gap-2 text-[12px] md:text-[13px] text-stone-600">
                        <span className="flex-1 min-w-0 truncate" title={t.detail || ''}>{t.detail}</span>
                        {t.conversions > 0 && (
                          <span className="flex-shrink-0 text-[11px] font-medium text-amber-800 tabular-nums">
                            {enquiryCount(t.conversions)}
                          </span>
                        )}
                        <span className="flex-shrink-0 tabular-nums text-stone-800 w-8 text-end">{t.visits}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Note>
        הממוצע של האתר בטווח הזה: {rateText(siteConversions, siteVisits)} מהביקורים הסתיימו בפנייה. שיעורים מוצגים רק
        למקור עם {MIN_FOR_RATE} ביקורים ומעלה. לחיצה על מקור פותחת את הפירוט שלו.
      </Note>
    </div>
  );
}
