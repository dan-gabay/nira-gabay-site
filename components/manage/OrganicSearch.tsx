'use client';

import { useState } from 'react';
import { DEPTH_SERIES } from './Charts';
import { SERVICES } from '@/lib/services';
import { PAGE_TYPE_LABELS } from '@/lib/siteEvents';
import { visits as visitCount, enquiries } from '@/lib/heCount';
import {
  CardPart,
  Empty,
  Legend,
  MIN_FOR_RATE,
  Note,
  ShowMore,
  StackBar,
  Stat,
  StatGrid,
  SubHead,
  duration,
  wholePct,
} from './analytics/ui';

// Visits from a search engine's organic results: where they landed and what
// they did next. Data from manage_organic_search, see
// db/2026-09-26-organic-search.sql, which also explains what is missing: the
// search terms themselves, which Google does not pass to the site at all.

type Page = { path: string; page_type: string; entity: string | null; title: string | null };

export type OrganicSearch = {
  range_days: number;
  totals: {
    visits: number;
    continued: number;
    reached_article: number;
    conversions: number;
    mobile: number;
    median_seconds: number;
  };
  previous_visits: number;
  previous_complete: boolean;
  engines: Array<{ engine: string; n: number }>;
  landings: Array<
    Page & {
      visits: number;
      continued: number;
      read: number;
      read_stayed: number;
      conversions: number;
      median_seconds: number;
    }
  >;
  next_pages: Array<Page & { n: number }>;
  first_event: string | null;
};

const ROWS_SHOWN = 6;

const ENGINE_LABELS: Record<string, string> = {
  google: 'גוגל',
  bing: 'בינג',
  duckduckgo: 'DuckDuckGo',
  yahoo: 'יאהו',
  ecosia: 'Ecosia',
};

// The article card's ordinal teal ramp, reused so "went further" is the same
// dark end of the same scale everywhere on the page.
const RAMP = Object.fromEntries(DEPTH_SERIES.map((s) => [s.key, s.color]));
const SEGMENTS = [
  { key: 'continued', color: RAMP.finished, label: 'המשיכו לעמוד נוסף' },
  { key: 'read_stayed', color: RAMP.read, label: 'קראו את המאמר ויצאו' },
  { key: 'left', color: RAMP.opened, label: 'יצאו מהעמוד הראשון' },
] as const;

const SERVICE_TITLES = new Map(SERVICES.map((s) => [s.slug, s.title]));

function pageName(p: Page): string {
  if (p.page_type === 'article' && p.title) return p.title;
  if (p.page_type === 'service' && p.entity) return SERVICE_TITLES.get(p.entity) || p.path;
  if (p.page_type === 'topic' && p.entity) return `נושא: ${p.entity}`;
  if (p.page_type === 'other') return p.path;
  return PAGE_TYPE_LABELS[p.page_type] || p.path;
}

function LandingRow({ row, max }: { row: OrganicSearch['landings'][number]; max: number }) {
  const name = pageName(row);
  const left = row.visits - row.continued - row.read_stayed;
  const parts = { continued: row.continued, read_stayed: row.read_stayed, left };

  const details = [
    `${row.continued} המשיכו`,
    row.page_type === 'article' ? `${row.read} קראו` : null,
    row.conversions > 0 ? enquiries(row.conversions) : null,
    row.median_seconds > 0 ? `חציון ${duration(row.median_seconds)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li>
      <div className="flex items-baseline gap-2 text-[12px] md:text-[13px]">
        <span className="flex-1 min-w-0 truncate text-stone-700" title={`${name} - ${row.path}`}>
          {name}
        </span>
        <span className="flex-shrink-0 tabular-nums text-stone-400">
          <strong className="text-stone-800 font-semibold">{row.visits}</strong>
          <span className="hidden sm:inline"> · {details}</span>
        </span>
      </div>
      <p className="sm:hidden text-[11px] text-stone-400 tabular-nums">{details}</p>
      <StackBar
        of={row.visits}
        max={max}
        label={`${name}: ${visitCount(row.visits)}, ${details}`}
        parts={SEGMENTS.map((sg) => ({ key: sg.key, value: parts[sg.key], color: sg.color }))}
      />
    </li>
  );
}

export default function OrganicSearchCard({ data }: { data: OrganicSearch }) {
  const [showAll, setShowAll] = useState(false);
  const t = data.totals;

  if (t.visits === 0) {
    return (
      <Empty>לא הגיעו ביקורים מחיפוש אורגני בטווח הזה.</Empty>
    );
  }

  const rated = t.visits >= MIN_FOR_RATE;
  const engines = data.engines
    .map((e) => `${ENGINE_LABELS[e.engine] || e.engine} ${e.n}`)
    .join(' · ');

  const rows = data.landings;
  const shown = showAll ? rows : rows.slice(0, ROWS_SHOWN);
  const max = rows.length > 0 ? rows[0].visits : 0;
  const anyRead = rows.some((r) => r.read_stayed > 0);

  return (
    <div>
      <StatGrid>
        <Stat label="כניסות מחיפוש" value={t.visits} sub={engines} />
        <Stat label="המשיכו לעמוד נוסף" value={t.continued} rate={rated ? wholePct(t.continued, t.visits) : null} />
        <Stat label="הגיעו למאמר" value={t.reached_article} rate={rated ? wholePct(t.reached_article, t.visits) : null} />
        <Stat label="פניות" value={t.conversions} />
      </StatGrid>

      <Note>
        זמן חציוני באתר {duration(t.median_seconds)} · {wholePct(t.mobile, t.visits)}% מהטלפון ·{' '}
        {data.previous_complete
          ? `בתקופה הקודמת באותו אורך: ${visitCount(data.previous_visits)}.`
          : `אין עדיין תקופה קודמת מלאה להשוואה (המדידה פועלת מ-${data.first_event}).`}
      </Note>

      <CardPart>
        <SubHead title="לאיזה עמוד הגיעו מהחיפוש" />
        <Legend items={SEGMENTS.filter((sg) => sg.key !== 'read_stayed' || anyRead).map((sg) => ({ ...sg }))} />
        <ul className="space-y-2.5">
          {shown.map((row) => (
            <LandingRow key={row.path} row={row} max={max} />
          ))}
        </ul>
        {rows.length > ROWS_SHOWN && (
          <ShowMore open={showAll} onToggle={() => setShowAll((v) => !v)} more={`הצג את כל ${rows.length} העמודים`} />
        )}
      </CardPart>

      {data.next_pages.length > 0 && (
        <CardPart>
          <SubHead title="לאן המשיכו אחרי עמוד הכניסה" />
          <p className="text-[12px] md:text-[13px] text-stone-600 leading-relaxed">
            {data.next_pages.map((p) => `${pageName(p)} (${p.n})`).join(' · ')}
          </p>
        </CardPart>
      )}

      <Note>
        מה חיפשו בגוגל לא מופיע כאן: גוגל לא מעבירה את מילות החיפוש לאתר, ולכן הן
        לא נשמרות אצלנו בשום צורה. הן זמינות רק ב-Search Console, כסיכום לפי ביטוי
        ועמוד. זמן באתר נמדד מהפעולה הראשונה לאחרונה, ולכן ביקור של עמוד אחד בלי
        פעולה נוספת נרשם כ-0.
      </Note>
    </div>
  );
}
