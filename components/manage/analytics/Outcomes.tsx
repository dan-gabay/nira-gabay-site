'use client';

import Link from 'next/link';
import { GROUP_LABELS } from '@/components/manage/TrafficSources';
import { Card, CardPart, Empty, Note, Stat, StatGrid, SubHead } from './ui';
import { pageName } from './labels';
import { heDate } from './Overview';
import type { LeadOutcomes, OutcomeRow, Totals } from './types';

// "מה יצא מזה?" The one figure the site is judged by is new clients, and every
// other number on the page is measured on the site: a tap on WhatsApp is not
// an enquiry (some who tap never write, and an ad's call button reaches Nira
// without the site at all). So the chain runs from visits, through taps, to
// the enquiries Nira logged and what she marked them as.
//
// The breakdowns count every enquiry logged so far, not the range: at a few
// enquiries a month a week holds one or two, and a share of two is not a
// finding. They name each row in people, never in percent.

const SOURCE_NAMES: Record<string, string> = {
  ...GROUP_LABELS,
  '': 'לא ידוע',
};

const sourceName = (k: string) => SOURCE_NAMES[k] ?? k;

export function Outcomes({
  totals,
  data,
  failed,
  rangeLabel,
}: {
  totals: Totals;
  /** Null while its call is in flight. */
  data: LeadOutcomes | null;
  failed: boolean;
  rangeLabel: string;
}) {
  if (failed) {
    return (
      <Card>
        <Empty>לא הצלחתי לטעון את רשימת הפניות.</Empty>
      </Card>
    );
  }
  if (!data) {
    return (
      <Card>
        <Empty>טוען...</Empty>
      </Card>
    );
  }

  const r = data.range;
  return (
    <Card>
      <SubHead title="מהביקור עד המטופל" aside={rangeLabel} />
      <StatGrid>
        <Stat label="ביקורים" value={totals.visits} />
        <Stat label="לחיצות ליצירת קשר" value={totals.conversions} sub="ווטסאפ, טלפון, מייל וטופס" />
        <Stat label="פניות שנרשמו" value={r.enquiries} sub="הודעות ושיחות שהגיעו בפועל" />
        <Stat label="התחילו טיפול" value={r.clients} sub={r.enquiries > 0 ? `מתוך ${r.enquiries} פניות` : undefined} />
      </StatGrid>
      <StatusLine c={r} />

      {data.all.enquiries > 0 && (
        <CardPart>
          <SubHead
            title="מאיפה הגיעו המטופלים"
            aside={data.first ? `כל הפניות מאז ${heDate(data.first)}` : undefined}
          />
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-5">
            <OutcomeTable title="לפי מקור" rows={data.by_source} name={sourceName} />
            <OutcomeTable title="לפי עמוד הכניסה" rows={data.by_page} name={(k) => pageName(k || null)} />
          </div>
          <Note>
            {data.all.enquiries} פניות בסך הכול, {data.all.clients} מהן התחילו טיפול. במספרים כאלה כל שורה היא אנשים
            בודדים: זה מראה איפה לחפש, לא מגמה.
          </Note>
        </CardPart>
      )}
    </Card>
  );
}

/** What is still unknown about the range's enquiries, and where to fill it in. */
function StatusLine({ c }: { c: LeadOutcomes['range'] }) {
  if (c.enquiries === 0) {
    return <Note>לא נרשמו פניות בטווח הזה. לחיצה שלא הפכה להודעה לא נרשמת כפנייה.</Note>;
  }
  const parts = [
    c.irrelevant > 0 && `${c.irrelevant} לא רלוונטיות`,
    c.spoke > 0 && `${c.spoke} בשיחה, עוד בלי החלטה`,
  ].filter(Boolean);
  return (
    <p className="text-[12px] text-stone-500 mt-3">
      {parts.join(' · ')}
      {parts.length > 0 && c.open > 0 && ' · '}
      {c.open > 0 && (
        <>
          {c.open} עוד בלי תשובה.{' '}
          <Link href="/manage/update" className="underline underline-offset-2 hover:text-stone-800">
            לעדכן מה קרה
          </Link>
        </>
      )}
    </p>
  );
}

function OutcomeTable({ title, rows, name }: { title: string; rows: OutcomeRow[]; name: (k: string) => string }) {
  return (
    <div className="min-w-0">
      <h4 className="text-[12px] md:text-[13px] font-semibold text-stone-700 mb-1.5">{title}</h4>
      <table className="w-full table-fixed text-[12px] md:text-[13px]">
        <thead>
          <tr className="text-[11px] text-stone-400">
            <th className="text-start font-normal pb-1.5">
              <span className="sr-only">{title}</span>
            </th>
            <th className="w-12 text-end font-normal pb-1.5 px-1 whitespace-nowrap">פניות</th>
            <th className="w-[4.5rem] text-end font-normal pb-1.5 px-1 whitespace-nowrap">לא רלוונטי</th>
            <th className="w-16 text-end font-normal pb-1.5 ps-1 whitespace-nowrap">מטופלים</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="py-1.5 pe-2 text-stone-700 truncate" title={name(r.key)}>
                {name(r.key)}
              </td>
              <td className="py-1.5 px-1 text-end tabular-nums text-stone-700">{r.enquiries}</td>
              <td className="py-1.5 px-1 text-end tabular-nums text-stone-400">{r.irrelevant || '-'}</td>
              <td
                className={`py-1.5 ps-1 text-end tabular-nums ${r.clients > 0 ? 'font-bold text-emerald-700' : 'text-stone-400'}`}
              >
                {r.clients || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
