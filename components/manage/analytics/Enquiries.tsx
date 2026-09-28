'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ACTION_COLOR, SOURCE_SERIES } from '@/components/manage/Charts';
import { GROUP_LABELS } from '@/components/manage/TrafficSources';
import { BarList, Card, Empty, ShowMore, SubHead, type BarRow } from './ui';
import { CHANNEL_LABELS, DEVICE_LABELS, buttonLabel, pageName } from './labels';
import { EnquiryJourneyLoader } from './EnquiryJourney';
import type { EnquiryRow } from './types';

// "מה הביא פניות?" At a dozen enquiries a month every one of them is worth
// reading individually, and a list of twelve rows says more than any chart of
// twelve points can: which keyword, which page, which button, first visit or
// fifth. The breakdowns above the list are the same rows counted three ways.
//
// There is deliberately no funnel. A visits → engaged → enquired funnel assumes
// people read their way to the enquiry, and here most of them do not: they land
// on a service page and tap WhatsApp without opening a second one. The two
// derived lines under the breakdowns say that in words instead.

const LOG_PREVIEW = 5;

function countBy<T>(rows: T[], key: (r: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) || 0) + 1);
  return m;
}

const toRows = (m: Map<string, number>, label: (k: string) => string): BarRow[] =>
  [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => ({ key: k, label: label(k), value: n }));

export function Enquiries({
  byButton,
  log,
  articleTitles,
}: {
  /** conversions_by_source from the main payload: exact for the range. */
  byButton: Array<{ name: string; source: string; n: number }>;
  /** Null while its own call is in flight or if it failed. */
  log: EnquiryRow[] | null;
  articleTitles: Map<string, string>;
}) {
  const [showAll, setShowAll] = useState(false);
  const total = byButton.reduce((a, r) => a + r.n, 0);

  if (total === 0) {
    return (
      <Card>
        <Empty>לא התקבלו פניות בטווח הזה.</Empty>
      </Card>
    );
  }

  // Channel and button both come from the main payload, so they agree with the
  // KPI to the unit. The page breakdown needs the log.
  const channels = new Map<string, number>();
  const buttons = new Map<string, number>();
  for (const r of byButton) {
    channels.set(r.name, (channels.get(r.name) || 0) + r.n);
    buttons.set(r.source, (buttons.get(r.source) || 0) + r.n);
  }

  const rows = log || [];
  const pages = countBy(rows, (r) => r.path || '');
  const known = rows.filter((r) => r.visit_number !== null);
  const firstVisit = known.filter((r) => r.visit_number === 1).length;
  const onePage = rows.filter((r) => r.views <= 1).length;

  const shown = showAll ? rows : rows.slice(0, LOG_PREVIEW);

  return (
    <div className="space-y-3 md:space-y-4">
      {/* One card, three cuts of the same enquiries. The channel is a line of
          figures rather than a third list: it is three rows long and one of
          them is always most of it. */}
      <Card title="פירוק הפניות">
        <ul className="flex flex-wrap gap-1.5 mb-4" aria-label="איך פנו">
          {toRows(channels, (k) => CHANNEL_LABELS[k] || k).map((c) => (
            <li
              key={c.key}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] md:text-[13px] text-stone-700"
              style={{ background: `${ACTION_COLOR}1a` }}
            >
              {c.label}
              <strong className="tabular-nums text-stone-900">{c.value}</strong>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div>
            <SubHead title="באיזה כפתור" />
            <BarList color={ACTION_COLOR} rows={toRows(buttons, buttonLabel)} limit={6} />
          </div>
          <div>
            <SubHead title="באיזה עמוד" />
            {log ? (
              <BarList color={ACTION_COLOR} rows={toRows(pages, (k) => pageName(k, articleTitles))} limit={6} />
            ) : (
              <Empty>טוען...</Empty>
            )}
          </div>
        </div>
      </Card>

      <Card title="הפניות עצמן" sub="החדשות קודם, שעון ישראל">
        {!log ? (
          <Empty>טוען...</Empty>
        ) : rows.length === 0 ? (
          <Empty>אין פירוט לפניות בטווח הזה.</Empty>
        ) : (
          <>
            {/* The two facts that decide where to work: whether people write
                on their first visit, and whether they read anything first. */}
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] md:text-[13px] text-stone-600 mb-3">
              {known.length > 0 && (
                <p>
                  <strong className="text-stone-800 tabular-nums">{firstVisit}</strong> מתוך{' '}
                  <span className="tabular-nums">{known.length}</span> פנו כבר בביקור הראשון
                </p>
              )}
              <p>
                <strong className="text-stone-800 tabular-nums">{onePage}</strong> מתוך{' '}
                <span className="tabular-nums">{rows.length}</span> פנו בלי לפתוח עמוד נוסף
              </p>
            </div>

            <ol className="divide-y divide-stone-100">
              {shown.map((r, i) => (
                <LogRow key={`${r.at}-${i}`} row={r} articleTitles={articleTitles} />
              ))}
            </ol>

            {rows.length > LOG_PREVIEW && (
              <ShowMore
                open={showAll}
                onToggle={() => setShowAll((v) => !v)}
                more={`הצג את כל ${rows.length} הפניות`}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
}

function LogRow({ row: r, articleTitles }: { row: EnquiryRow; articleTitles: Map<string, string> }) {
  const [open, setOpen] = useState(false);
  const [date, time] = r.at.split('T');
  const [, m, d] = date.split('-').map(Number);
  const landedElsewhere = r.landing && r.path && r.landing !== r.path;
  const visit =
    r.visit_number === null ? null : r.visit_number === 1 ? 'ביקור ראשון' : `ביקור ${r.visit_number}`;

  // Rows from before the log carried the visit id cannot open.
  const expandable = !!r.session_id;

  return (
    <li>
      <button
        type="button"
        onClick={() => expandable && setOpen((v) => !v)}
        aria-expanded={expandable ? open : undefined}
        disabled={!expandable}
        className={`w-full text-start py-2.5 min-h-[44px] flex gap-3 rounded-lg ${
          expandable ? 'hover:bg-stone-50' : 'cursor-default'
        }`}
      >
        <div className="flex-shrink-0 w-11 text-center pt-0.5">
          <p className="text-[13px] font-semibold text-stone-800 tabular-nums leading-tight">
            {d}.{m}
          </p>
          <p className="text-[11px] text-stone-400 tabular-nums">{time}</p>
        </div>
        <div className="min-w-0 flex-1 text-[12px] md:text-[13px] leading-relaxed">
          <p className="text-stone-800">
            <strong className="font-semibold">{CHANNEL_LABELS[r.event_name] || r.event_name}</strong>
            <span className="text-stone-500"> · {buttonLabel(r.source)}</span>
          </p>
          <p className="text-stone-600 flex items-baseline gap-1.5 min-w-0">
            <span
              className="w-2 h-2 rounded-sm flex-shrink-0 translate-y-[-1px]"
              style={{ background: SOURCE_SERIES[r.grp] || '#a8a29e' }}
              aria-hidden="true"
            />
            <span className="min-w-0">
              {GROUP_LABELS[r.grp] || r.grp}
              {r.detail && <span className="text-stone-500"> · &quot;{r.detail}&quot;</span>}
            </span>
          </p>
          <p className="text-stone-400">
            {landedElsewhere
              ? `כניסה: ${pageName(r.landing, articleTitles)} · פנייה: ${pageName(r.path, articleTitles)}`
              : pageName(r.path, articleTitles)}
            {' · '}
            {r.views === 1 ? 'עמוד אחד' : `${r.views} עמודים`}
            {visit && <> · {visit}</>}
            {r.device && DEVICE_LABELS[r.device] && <> · {DEVICE_LABELS[r.device]}</>}
          </p>
        </div>
        {expandable && (
          <ChevronDown
            className={`w-4 h-4 mt-1 flex-shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        )}
      </button>
      {open && r.session_id && (
        <div className="ps-14 pe-1">
          <EnquiryJourneyLoader session={r.session_id} articleTitles={articleTitles} />
        </div>
      )}
    </li>
  );
}
