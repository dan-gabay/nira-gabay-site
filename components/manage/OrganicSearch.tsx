'use client';

import { useState } from 'react';
import { DEPTH_SERIES } from './Charts';
import { SERVICES } from '@/lib/services';
import { PAGE_TYPE_LABELS } from '@/lib/siteEvents';
import { visits as visitCount, enquiries } from '@/lib/heCount';

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

// Below this a percentage is one visitor wearing a costume. Same threshold as
// the article card.
const MIN_FOR_RATE = 10;
const ROWS_SHOWN = 6;

const share = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

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

function duration(seconds: number): string {
  if (seconds < 60) return `${seconds} שנ׳`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')} דק׳`;
}

function Tile({ label, value, rate, sub }: { label: string; value: number; rate?: number | null; sub?: string }) {
  return (
    <div className="bg-stone-50 rounded-xl p-2.5">
      <p className="text-[11px] text-stone-400 truncate">{label}</p>
      <p className="text-base font-bold text-stone-800 tabular-nums">
        {value}
        {rate !== null && rate !== undefined && (
          <span className="text-[11px] font-normal text-stone-400"> · {rate}%</span>
        )}
      </p>
      {sub && <p className="text-[10px] text-stone-400 truncate">{sub}</p>}
    </div>
  );
}

function LandingRow({ row, max }: { row: OrganicSearch['landings'][number]; max: number }) {
  const name = pageName(row);
  const left = row.visits - row.continued - row.read_stayed;
  const parts = { continued: row.continued, read_stayed: row.read_stayed, left };
  const width = max > 0 ? (row.visits / max) * 100 : 0;
  const seg = (v: number) => (row.visits > 0 ? (v / row.visits) * 100 : 0);

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
      <div
        className="mt-1 h-1.5 rounded-full bg-stone-100 overflow-hidden"
        role="img"
        aria-label={`${name}: ${visitCount(row.visits)}, ${details}`}
      >
        <div className="flex h-full rounded-full overflow-hidden gap-px" style={{ width: `${width}%` }}>
          {SEGMENTS.map((s) =>
            parts[s.key] > 0 ? (
              <span key={s.key} style={{ width: `${seg(parts[s.key])}%`, background: s.color }} />
            ) : null,
          )}
        </div>
      </div>
    </li>
  );
}

export default function OrganicSearchCard({ data }: { data: OrganicSearch }) {
  const [showAll, setShowAll] = useState(false);
  const t = data.totals;

  if (t.visits === 0) {
    return (
      <p className="text-xs md:text-sm text-stone-400 py-2">
        לא הגיעו ביקורים מחיפוש אורגני בטווח הזה.
      </p>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Tile label="כניסות מחיפוש" value={t.visits} sub={engines} />
        <Tile label="המשיכו לעמוד נוסף" value={t.continued} rate={rated ? share(t.continued, t.visits) : null} />
        <Tile label="הגיעו למאמר" value={t.reached_article} rate={rated ? share(t.reached_article, t.visits) : null} />
        <Tile label="פניות" value={t.conversions} />
      </div>

      <p className="mt-2 text-[11px] text-stone-400 leading-relaxed">
        זמן חציוני באתר {duration(t.median_seconds)} · {share(t.mobile, t.visits)}% מהטלפון ·{' '}
        {data.previous_complete
          ? `בתקופה הקודמת באותו אורך: ${visitCount(data.previous_visits)}.`
          : `אין עדיין תקופה קודמת מלאה להשוואה (המדידה פועלת מ-${data.first_event}).`}
      </p>

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <p className="text-[12px] font-medium text-stone-600">לאיזה עמוד הגיעו מהחיפוש</p>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2 text-[11px] text-stone-500">
          {SEGMENTS.filter((s) => s.key !== 'read_stayed' || anyRead).map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ background: s.color }} aria-hidden="true" />
              {s.label}
            </span>
          ))}
        </div>
        <ul className="space-y-2.5">
          {shown.map((row) => (
            <LandingRow key={row.path} row={row} max={max} />
          ))}
        </ul>
        {rows.length > ROWS_SHOWN && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="mt-2 text-[12px] text-stone-500 underline underline-offset-2 min-h-[32px]"
          >
            {showAll ? 'פחות' : `כל ${rows.length} העמודים`}
          </button>
        )}
      </div>

      {data.next_pages.length > 0 && (
        <p className="mt-3 text-[12px] text-stone-600 leading-relaxed">
          <span className="text-stone-400">לאן המשיכו אחרי עמוד הכניסה: </span>
          {data.next_pages.map((p) => `${pageName(p)} (${p.n})`).join(' · ')}
        </p>
      )}

      <p className="mt-3 text-[11px] text-stone-400 leading-relaxed">
        מה חיפשו בגוגל לא מופיע כאן: גוגל לא מעבירה את מילות החיפוש לאתר, ולכן הן
        לא נשמרות אצלנו בשום צורה. הן זמינות רק ב-Search Console, כסיכום לפי ביטוי
        ועמוד. זמן באתר נמדד מהפעולה הראשונה לאחרונה, ולכן ביקור של עמוד אחד בלי
        פעולה נוספת נרשם כ-0.
      </p>
    </div>
  );
}
