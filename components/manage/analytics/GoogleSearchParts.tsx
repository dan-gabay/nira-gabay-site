'use client';

import { useState } from 'react';
import { StackedBars } from '../Charts';
import { SERVICES } from '@/lib/services';
import { TOPICS } from '@/lib/topics';
import type { GoogleSearch } from '@/lib/google/types';
import { CardPart, Empty, Note, ShowMore, Stat, StatGrid, SubHead, StackBar } from './ui';

// The Search Console half of the organic card: what Google showed the site
// for, live from /api/manage/google/search. The visits half above it is ours;
// this is Google's, and the two never add up (an impression is not a visit).

const IMPRESSIONS_COLOR = '#0D9488';
const CLICK_COLOR = '#B45309';
const PAGES_SHOWN = 6;
const FAR_SHOWN = 8;

const SERVICE_TITLES = new Map(SERVICES.map((s) => [s.slug, s.title]));
const TOPIC_TAGS = new Map(TOPICS.map((t) => [t.slug, t.tag]));

export function googlePageName(path: string, articleTitles?: Map<string, string>): string {
  if (path === '/') return 'דף הבית';
  const [, kind, slug, sub] = path.split('?')[0].split('/');
  if (kind === 'services' && slug) return SERVICE_TITLES.get(slug) || path;
  if (kind === 'articles' && slug === 'topic' && sub)
    return TOPIC_TAGS.has(sub) ? `נושא: ${TOPIC_TAGS.get(sub)}` : path;
  if (kind === 'articles' && slug && slug !== 'topic') return articleTitles?.get(slug) || path;
  return path;
}

type Loaded = Extract<GoogleSearch, { configured: true }>;

function Trend({ data }: { data: Loaded }) {
  const points = data.daily.map((d) => ({ day: d.day, values: { impressions: d.impressions } }));
  return (
    <>
      <StatGrid>
        <Stat
          label="הופעות בגוגל"
          value={data.totals.impressions}
          delta={{ kind: 'count', now: data.totals.impressions, prev: data.previous.impressions }}
          color={IMPRESSIONS_COLOR}
        />
        <Stat
          label="לחיצות מגוגל"
          value={data.totals.clicks}
          delta={{ kind: 'count', now: data.totals.clicks, prev: data.previous.clicks }}
          color={CLICK_COLOR}
        />
      </StatGrid>
      <div className="mt-3">
        <StackedBars
          data={points}
          series={[{ key: 'impressions', label: 'הופעות', color: IMPRESSIONS_COLOR }]}
          height={170}
          aria="הופעות האתר בתוצאות החיפוש של גוגל לפי יום, ולחיצות כנקודות מתחת"
          emptyText="אין עדיין נתונים מגוגל בטווח הזה."
          emptyBucketText="אין הופעות"
          formatTotal={(n) => `${n.toLocaleString('he-IL')} הופעות`}
          marks={{
            color: CLICK_COLOR,
            label: 'לחיצה',
            counts: data.daily.map((d) => d.clicks),
            empty: 'אין לחיצות בטווח הזה',
            describe: (i) => `${data.daily[i].clicks} לחיצות`,
          }}
        />
      </div>
    </>
  );
}

function PageQueries({ data, articleTitles }: { data: Loaded; articleTitles?: Map<string, string> }) {
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const rows = data.pages;
  if (rows.length === 0) return <Empty>גוגל לא הציגה את האתר בטווח הזה.</Empty>;
  const shown = showAll ? rows : rows.slice(0, PAGES_SHOWN);
  const max = rows[0].impressions;
  return (
    <>
      <ul className="space-y-2.5">
        {shown.map((p) => {
          const name = googlePageName(p.path, articleTitles);
          const isOpen = open === p.path;
          return (
            <li key={p.path}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : p.path)}
                aria-expanded={isOpen}
                className="w-full text-start"
              >
                <div className="flex items-baseline gap-2 text-[12px] md:text-[13px]">
                  <span className="flex-1 min-w-0 truncate text-stone-700" title={`${name} - ${p.path}`}>
                    {name}
                  </span>
                  <span className="flex-shrink-0 tabular-nums text-stone-400">
                    <strong className="text-stone-800 font-semibold">{p.impressions}</strong> הופעות · {p.clicks} לחיצות
                    · מקום {p.position}
                  </span>
                </div>
                <StackBar
                  of={p.impressions}
                  max={max}
                  label={`${name}: ${p.impressions} הופעות`}
                  parts={[{ key: 'v', value: p.impressions, color: IMPRESSIONS_COLOR }]}
                />
              </button>
              {isOpen && (
                <div className="mt-2 rounded-xl bg-stone-50 px-3 py-2">
                  {p.queries.length === 0 ? (
                    <p className="text-[11px] text-stone-400">
                      גוגל לא מפרטת את החיפושים לעמוד הזה (חיפושים נדירים מוסתרים).
                    </p>
                  ) : (
                    <table className="w-full text-[11px] md:text-[12px] tabular-nums">
                      <thead className="text-stone-400">
                        <tr>
                          <th className="text-start font-normal pb-1">חיפוש</th>
                          <th className="text-end font-normal pb-1">הופעות</th>
                          <th className="text-end font-normal pb-1">לחיצות</th>
                          <th className="text-end font-normal pb-1">מקום</th>
                        </tr>
                      </thead>
                      <tbody className="text-stone-700">
                        {p.queries.map((q) => (
                          <tr key={q.query}>
                            <td className="py-0.5 pe-2">{q.query}</td>
                            <td className="text-end">{q.impressions}</td>
                            <td className="text-end">{q.clicks}</td>
                            <td className="text-end">{q.position}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {rows.length > PAGES_SHOWN && (
        <ShowMore open={showAll} onToggle={() => setShowAll((v) => !v)} more={`הצג את כל ${rows.length} העמודים`} />
      )}
    </>
  );
}

function FarBehind({ data, articleTitles }: { data: Loaded; articleTitles?: Map<string, string> }) {
  const [showAll, setShowAll] = useState(false);
  const rows = data.far;
  if (rows.length === 0) return <Empty>אין כרגע חיפושים עם הופעות שבהם האתר רחוק מהעמוד הראשון.</Empty>;
  const shown = showAll ? rows : rows.slice(0, FAR_SHOWN);
  return (
    <>
      <ul className="space-y-2">
        {shown.map((r) => (
          <li key={r.query} className="text-[12px] md:text-[13px]">
            <div className="flex items-baseline gap-2">
              <span className="flex-1 min-w-0 truncate text-stone-800 font-medium">{r.query}</span>
              <span className="flex-shrink-0 tabular-nums text-stone-400">
                <strong className="text-stone-800 font-semibold">{r.impressions}</strong> הופעות · מקום {r.position}
              </span>
            </div>
            <p className="text-[11px] text-stone-400 truncate">
              {r.competing.length > 1
                ? `${r.competing.length} עמודים מתחרים: ${r.competing
                    .map((c) => `${googlePageName(c.path, articleTitles)} (${c.position})`)
                    .join(' · ')}`
                : r.path
                  ? `העמוד שגוגל בחרה: ${googlePageName(r.path, articleTitles)}`
                  : 'גוגל לא מפרטת איזה עמוד'}
            </p>
          </li>
        ))}
      </ul>
      {rows.length > FAR_SHOWN && (
        <ShowMore open={showAll} onToggle={() => setShowAll((v) => !v)} more={`הצג את כל ${rows.length} החיפושים`} />
      )}
    </>
  );
}

export default function GoogleSearchParts({
  data,
  failed,
  articleTitles,
}: {
  data: GoogleSearch | null;
  failed: boolean;
  articleTitles?: Map<string, string>;
}) {
  if (failed) {
    return (
      <CardPart>
        <SubHead title="מה גוגל הראתה" />
        <Empty>לא הצלחנו לטעון נתונים מגוגל כרגע.</Empty>
      </CardPart>
    );
  }
  if (!data) {
    return (
      <CardPart>
        <SubHead title="מה גוגל הראתה" />
        <Empty>טוען נתונים מגוגל...</Empty>
      </CardPart>
    );
  }
  if (!data.configured) {
    return (
      <CardPart>
        <SubHead title="מה גוגל הראתה" />
        <Empty>אין חיבור לגוגל (חסרים משתני סביבה).</Empty>
      </CardPart>
    );
  }
  const span = data.widened ? `${data.days} הימים האחרונים (הנתונים של גוגל מתעדכנים באיחור)` : `${data.days} ימים`;
  return (
    <>
      <CardPart>
        <SubHead title="מה גוגל הראתה" aside={span} />
        <Trend data={data} />
      </CardPart>
      <CardPart>
        <SubHead title="על מה חיפשו, לפי עמוד" aside="לחיצה על עמוד פותחת את החיפושים" />
        <PageQueries data={data} articleTitles={articleTitles} />
      </CardPart>
      <CardPart>
        <SubHead title="גוגל כבר מכירה, אבל רחוק" aside="מקום 15 ומטה" />
        <FarBehind data={data} articleTitles={articleTitles} />
        <Note>
          חיפושים שגוגל כבר מציגה בהם את האתר, אבל רחוק מהעמוד הראשון. חיזוק העמוד שגוגל בחרה הוא הדרך הקצרה לעלות בהם.
          כשכמה עמודים מתחרים על אותו חיפוש, גוגל לא יודעת איזה מהם להציג.
        </Note>
      </CardPart>
      <Note>
        מקור: Search Console. הופעה היא פעם שהאתר הוצג בתוצאות, לא ביקור. הנתונים מגיעים באיחור של יומיים-שלושה,
        וחיפושים נדירים מוסתרים על ידי גוגל.
      </Note>
    </>
  );
}
