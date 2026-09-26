'use client';

import { useState } from 'react';
import { enquiries as enquiryCount } from '@/lib/heCount';
import { BarList, Card, MIN_FOR_RATE, Segmented, pct, rateText, type BarRow } from './ui';
import { pageName, pageTypeName, serviceName } from './labels';
import type { Payload } from './types';

// "אילו עמודים עובדים?" Three lists that used to be four cards (service funnel,
// landing pages, most-viewed pages, by page type) behind one switch, because
// they are one question asked at three zoom levels and nobody needs all three
// open at once. Articles are not here: they have their own section.

type Mode = 'services' | 'landing' | 'types';

function meta(conv: number, visits: number, siteRate: number) {
  if (conv === 0) return <span className="text-stone-400">ללא פניות</span>;
  const r = pct(conv, visits);
  const above = visits >= MIN_FOR_RATE && siteRate > 0 && r >= siteRate * 1.25;
  const below = visits >= MIN_FOR_RATE && siteRate > 0 && r <= siteRate * 0.75;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-medium text-amber-800">{enquiryCount(conv)}</span>
      {visits >= MIN_FOR_RATE && <span>· {rateText(conv, visits)}</span>}
      {above && <span className="text-emerald-700 text-[9px]" aria-label="מעל הממוצע">▲</span>}
      {below && <span className="text-rose-700 text-[9px]" aria-label="מתחת לממוצע">▼</span>}
    </span>
  );
}

export function PagesTable({ data, articleTitles }: { data: Payload; articleTitles: Map<string, string> }) {
  const [mode, setMode] = useState<Mode>('services');
  const siteRate = pct(data.totals.conversions, data.totals.visits);

  let rows: BarRow[] = [];
  let note = '';
  let empty = '';
  if (mode === 'services') {
    rows = (data.service_funnel || [])
      .slice()
      .sort((a, b) => b.visits - a.visits)
      .map((s) => ({ key: s.slug, label: serviceName(s.slug), value: s.visits, meta: meta(s.conversions, s.visits, siteRate) }));
    note = 'ביקורים שעברו בעמוד השירות, וכמה מהם פנו. העמודים שהמודעות נוחתות עליהם.';
    empty = 'אין עדיין ביקורים בעמודי השירות בטווח הזה.';
  } else if (mode === 'landing') {
    rows = (data.landing_pages || []).map((l) => ({
      key: l.path,
      label: pageName(l.path, articleTitles),
      sub: l.page_type === 'service' ? undefined : pageTypeName(l.page_type),
      value: l.visits,
      meta: meta(l.conversions, l.visits, siteRate),
    }));
    note = 'העמוד שבו התחיל הביקור, והפניות מאותם ביקורים.';
    empty = 'אין עדיין נתונים.';
  } else {
    rows = (data.by_page_type || []).map((p) => ({
      key: p.page_type,
      label: pageTypeName(p.page_type),
      value: p.views,
      meta: p.conversions > 0 ? <span className="font-medium text-amber-800">{enquiryCount(p.conversions)}</span> : undefined,
    }));
    note = 'צפיות לפי סוג עמוד, והפניות שנלחצו בעמוד מאותו סוג.';
    empty = 'אין עדיין נתונים.';
  }

  return (
    <Card>
      <div className="mb-3">
        <Segmented<Mode>
          label="תצוגת עמודים"
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'services', label: 'עמודי שירות' },
            { value: 'landing', label: 'דפי כניסה' },
            { value: 'types', label: 'סוגי עמודים' },
          ]}
        />
      </div>
      <p className="text-[11px] text-stone-400 mb-2 px-0.5">
        {note}
        {mode !== 'types' && (
          <>
            {' '}
            <span className="text-emerald-700">▲</span>/<span className="text-rose-700">▼</span> = מעל/מתחת לממוצע האתר (
            {rateText(data.totals.conversions, data.totals.visits)}).
          </>
        )}
      </p>
      <BarList rows={rows} empty={empty} limit={mode === 'landing' ? 10 : undefined} />
    </Card>
  );
}
