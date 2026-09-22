'use client';

import { useState } from 'react';
import {
  DepthBars,
  DEPTH_SERIES,
  ACTION_COLOR,
  alignToBuckets,
  type DepthPoint,
  type ReactionPoint,
} from './Charts';
import { openings as openingCount, shares, likes, comments } from '@/lib/heCount';

// What happens after an article loads.
//
// The dashboard could already say how many people arrived and how many wrote to
// Nira. Between those two it said almost nothing: "המאמרים הנקראים ביותר" ranks
// by views, and a view is the one article number that tells you least - 198
// views with 11 finishes and 198 views with 120 finishes are the same card.
//
// So this one is about depth, and it is built only from events that exist:
//
//   נפתח בלבד     a page_view on the article and nothing further
//   נקרא          article_read - half the page scrolled, or 30 seconds
//   נקרא עד הסוף  article_completed - the end of the body was on screen and 40%
//                 of the estimated reading time was spent with the tab visible
//
// Three things it deliberately does not claim, because nothing stores them:
// scroll percentage (the 'scroll' event is not on the allowlist in
// lib/siteEvents.ts, so no row is ever written), time on page, and which
// network a share went to (the platform lives in a GA-only parameter). The note
// at the bottom of the card says so out loud rather than leaving Nira to assume
// the numbers mean more than they do.

/** One reading: a session and an article. Not a page view - see the SQL. */
export type ArticleEngagement = {
  range_days: number;
  granularity: 'hour' | 'day';
  totals: {
    openings: number;
    reads: number;
    finishes: number;
    readers: number;
    articles: number;
    shares: number;
    likes: number;
    comments: number;
  };
  previous: {
    openings: number;
    reads: number;
    finishes: number;
    readers: number;
    shares: number;
    likes: number;
    comments: number;
  };
  daily: DepthPoint[];
  reactions_daily: ReactionPoint[];
  per_article: Array<{
    slug: string;
    title: string;
    openings: number;
    reads: number;
    finishes: number;
    shares: number;
    likes: number;
    comments: number;
  }>;
  navigation: {
    article_sessions: number;
    multi_article_sessions: number;
    hops: number;
  };
  top_hops: Array<{ src: string; src_title: string; dst: string; dst_title: string; n: number }>;
  first_event: string | null;
};

// Borrowed from Audience.tsx and for the same reason: a rate over eight
// readings is noise dressed as a finding, and this dashboard is read as if
// every number on it means something. Under the floor the counts still show;
// only the percentage is withheld.
const MIN_FOR_RATE = 10;

const share = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

const DEPTH_COLOR = Object.fromEntries(DEPTH_SERIES.map((s) => [s.key, s.color]));

const ROWS_SHOWN = 6;

function Tile({ label, value, rate }: { label: string; value: number; rate: number | null }) {
  return (
    <div className="bg-stone-50 rounded-xl p-2.5">
      <p className="text-[11px] text-stone-400 truncate">{label}</p>
      <p className="text-base font-bold text-stone-800 tabular-nums">
        {value}
        {rate !== null && (
          <span className="text-[11px] font-normal text-stone-400"> · {rate}%</span>
        )}
      </p>
    </div>
  );
}

/**
 * One article's readings: magnitude across rows and composition within one, in
 * a single 6px row.
 *
 * The track is scaled to the busiest article in the range, so the bars are
 * comparable down the column, and split by the same depth ramp as the chart
 * above, so a short dark bar and a long pale one are immediately two different
 * problems. The numbers repeat as text beside the title - the ramp's lightest
 * step is under 3:1 against the card, and text is the relief that permits it.
 */
function ArticleRow({
  row,
  max,
}: {
  row: ArticleEngagement['per_article'][number];
  max: number;
}) {
  const reactions = row.shares + row.likes + row.comments;
  const opened = row.openings - row.reads;
  // A finisher passed through "read" on the way, so the middle segment is the
  // ones who got that far and no further. Same arithmetic as the SQL.
  const readOnly = row.reads - row.finishes;
  const width = max > 0 ? (row.openings / max) * 100 : 0;
  const seg = (v: number) => (row.openings > 0 ? (v / row.openings) * 100 : 0);

  const reactionTitle = [
    row.shares > 0 ? shares(row.shares) : null,
    row.likes > 0 ? likes(row.likes) : null,
    row.comments > 0 ? comments(row.comments) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li>
      <div className="flex items-baseline gap-2 text-[12px] md:text-[13px]">
        <span className="flex-1 min-w-0 truncate text-stone-700" title={row.title}>
          {row.title}
        </span>
        {reactions > 0 && (
          <span
            className="w-2 h-2 rounded-full flex-shrink-0 self-center"
            style={{ background: ACTION_COLOR }}
            title={reactionTitle}
            aria-label={reactionTitle}
          />
        )}
        <span className="flex-shrink-0 tabular-nums text-stone-400">
          <strong className="text-stone-800 font-semibold">{row.openings}</strong>
          {' · '}
          {row.reads}
          {' · '}
          {row.finishes}
        </span>
      </div>
      <div
        className="mt-1 h-1.5 rounded-full bg-stone-100 overflow-hidden"
        role="img"
        aria-label={`${row.title}: ${openingCount(row.openings)}, ${row.reads} נקראו, ${row.finishes} עד הסוף`}
      >
        {/* gap-px, not a border: the same 1px of card showing between fills that
            the stacked columns above use, and the one thing that keeps a two-
            reading sliver from merging into the segment beside it. */}
        <div
          className="flex h-full rounded-full overflow-hidden gap-px"
          style={{ width: `${width}%` }}
        >
          {row.finishes > 0 && (
            <span style={{ width: `${seg(row.finishes)}%`, background: DEPTH_COLOR.finished }} />
          )}
          {readOnly > 0 && (
            <span style={{ width: `${seg(readOnly)}%`, background: DEPTH_COLOR.read }} />
          )}
          {opened > 0 && (
            <span style={{ width: `${seg(opened)}%`, background: DEPTH_COLOR.opened }} />
          )}
        </div>
      </div>
    </li>
  );
}

export default function ArticleEngagementCard({
  data,
  buckets,
}: {
  data: ArticleEngagement;
  /** Every bucket in the range, from the page, so a quiet day is a gap and not
   *  a missing column - and so the markers line up with the columns above. */
  buckets: string[];
}) {
  const [showAll, setShowAll] = useState(false);
  const t = data.totals;
  const p = data.previous;

  if (t.openings === 0) {
    return (
      <p className="text-xs md:text-sm text-stone-400 py-2">
        אף מאמר לא נפתח בטווח הזה.
        {data.first_event && ` המדידה של המאמרים פועלת מ-${data.first_event}.`}
      </p>
    );
  }

  const readRate = t.openings >= MIN_FOR_RATE ? share(t.reads, t.openings) : null;
  const doneRate = t.openings >= MIN_FOR_RATE ? share(t.finishes, t.openings) : null;
  const actions = t.shares + t.likes + t.comments;
  const prevActions = p.shares + p.likes + p.comments;

  const rows = data.per_article;
  const shown = showAll ? rows : rows.slice(0, ROWS_SHOWN);
  const maxOpenings = rows.length > 0 ? rows[0].openings : 0;

  const nav = data.navigation;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Tile label="פתיחות מאמר" value={t.openings} rate={null} />
        <Tile label="נקראו" value={t.reads} rate={readRate} />
        <Tile label="נקראו עד הסוף" value={t.finishes} rate={doneRate} />
        <Tile label="שיתופים, לייקים ותגובות" value={actions} rate={null} />
      </div>

      {/* The previous window as one sentence rather than four arrow chips. At
          this volume most of those arrows would be a jump from nothing to
          nothing, which reads as a finding and is not one. */}
      <p className="mt-2 text-[11px] text-stone-400 leading-relaxed">
          בתקופה הקודמת באותו אורך: {p.openings} פתיחות, {p.reads} נקראו,{' '}
          {p.finishes} עד הסוף, {prevActions} פעולות.
      </p>

      <div className="mt-4">
        <DepthBars
          data={alignToBuckets(data.daily, buckets, () => ({ opened: 0, read: 0, finished: 0 }))}
          reactions={alignToBuckets(data.reactions_daily, buckets, () => ({
            shares: 0,
            likes: 0,
            comments: 0,
          }))}
        />
      </div>

      {/* The marker row has no legend inside the chart, because one shape and
          one colour need a sentence and not a swatch. This is it, and it
          carries the breakdown the tile above can only total.

          Only when something happened: with an empty row the chart already
          says so in words, and a legend for a mark that is nowhere on the
          screen is one line of furniture. */}
      {actions > 0 && (
        <p className="mt-1.5 text-[11px] text-stone-500 leading-relaxed flex items-center gap-1.5 flex-wrap">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: ACTION_COLOR }}
            aria-hidden="true"
          />
          <span>
            {data.granularity === 'hour' ? 'שעה' : 'יום'} שבו מישהו הגיב, עשה לייק או שיתף
            {' · '}
            {shares(t.shares)}, {likes(t.likes)}, {comments(t.comments)}
          </span>
        </p>
      )}

      {/* Did one article lead to another. This is the only question on the card
          that is about the site's shape rather than a single page, and it is the
          one the internal links were placed to move. */}
      <div className="mt-3.5 pt-3 border-t border-stone-100">
        <p className="text-[12px] md:text-[13px] text-stone-600 leading-relaxed">
          {nav.multi_article_sessions === 0 ? (
            <>אף אחד לא עבר ממאמר אחד לשני באותו ביקור.</>
          ) : (
            <>
              <strong className="text-stone-800 tabular-nums">{nav.multi_article_sessions}</strong>{' '}
              מתוך <span className="tabular-nums">{nav.article_sessions}</span> הקוראים המשיכו
              למאמר נוסף באותו ביקור
              {nav.hops > nav.multi_article_sessions && (
                <> (<span className="tabular-nums">{nav.hops}</span> מעברים)</>
              )}
              .
            </>
          )}
        </p>

        {data.top_hops.length > 0 && (
          <ul className="mt-2 space-y-1 text-[11px] md:text-xs text-stone-500">
            {data.top_hops.slice(0, 3).map((h) => (
              <li key={`${h.src}-${h.dst}`} className="truncate">
                <span className="text-stone-700">{h.src_title}</span>
                {' ← '}
                <span className="text-stone-700">{h.dst_title}</span>
                {h.n > 1 && <span className="tabular-nums"> · {h.n}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Which article holds a reader. The card above this one on the page ranks
          articles by views; this ranks the same articles by what happened after
          the view, which is the part a ranking by volume hides. */}
      <div className="mt-3.5 pt-3 border-t border-stone-100">
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <h3 className="text-[12px] md:text-[13px] font-semibold text-stone-700">לפי מאמר</h3>
          <span className="text-[10px] md:text-[11px] text-stone-400 tabular-nums">
            פתיחות · נקרא · עד הסוף
          </span>
        </div>

        <ul className="space-y-2">
          {shown.map((row) => (
            <ArticleRow key={row.slug} row={row} max={maxOpenings} />
          ))}
        </ul>

        {rows.length > ROWS_SHOWN && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="mt-2.5 text-[11px] md:text-xs text-stone-500 hover:text-stone-800 transition-colors"
          >
            {showAll ? 'הצג פחות' : `כל ${rows.length} המאמרים`}
          </button>
        )}
      </div>

      {/* Said out loud, because the two words on the chart are doing a lot of
          work and neither means what it sounds like on its own. */}
      <p className="mt-3.5 pt-3 border-t border-stone-100 text-[10px] text-stone-400 leading-relaxed">
        &quot;נקרא&quot; = חצי מהעמוד נגלל, או 30 שניות בעמוד. &quot;עד הסוף&quot; = סוף גוף
        המאמר היה על המסך וגם עברו לפחות 40% מזמן הקריאה המשוער, בלשונית פעילה.
        אחוזי גלילה מדויקים וזמן קריאה אינם נשמרים, ולכן אינם מופיעים כאן, וגם לא
        לאיזו רשת בוצע שיתוף.
      </p>
    </div>
  );
}
