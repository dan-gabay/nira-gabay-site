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
  wholePct,
} from './analytics/ui';

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
// Two things it deliberately does not claim, because nothing stores them:
// scroll percentage (the 'scroll' event is not on the allowlist in
// lib/siteEvents.ts, so no row is ever written - it is a GA4-only signal) and
// time on page. A third, the network a share went to, is stored from
// 2026-09-22 and so is known for new shares and unknowable for the earlier
// ones; those are left without a channel rather than bucketed as "unknown".
// The note at the bottom of the card says all of it out loud rather than
// leaving Nira to assume the numbers mean more than they do.

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
  /** Only the shares whose channel we know; see the SQL. */
  share_channels: Array<{ channel: string; n: number }>;
  top_hops: Array<{ src: string; src_title: string; dst: string; dst_title: string; n: number }>;
  first_event: string | null;
};

const DEPTH_COLOR = Object.fromEntries(DEPTH_SERIES.map((s) => [s.key, s.color]));

const ROWS_SHOWN = 6;

// The share buttons on an article, as lib/analytics.ts names them. 'native' is
// the phone's own share sheet, which is where most of them go on a site this
// mobile - and the one case where the network is genuinely the visitor's
// choice after the fact, so it is named as the sheet and not as a network.
const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'ווטסאפ',
  facebook: 'פייסבוק',
  instagram: 'אינסטגרם',
  copy_link: 'העתקת קישור',
  native: 'תפריט השיתוף',
};

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
      <StackBar
        of={row.openings}
        max={max}
        label={`${row.title}: ${openingCount(row.openings)}, ${row.reads} נקראו, ${row.finishes} עד הסוף`}
        parts={[
          { key: 'finished', value: row.finishes, color: DEPTH_COLOR.finished },
          { key: 'read', value: readOnly, color: DEPTH_COLOR.read },
          { key: 'opened', value: opened, color: DEPTH_COLOR.opened },
        ]}
      />
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
      <Empty>
        אף מאמר לא נפתח בטווח הזה.
        {data.first_event && ` המדידה של המאמרים פועלת מ-${data.first_event}.`}
      </Empty>
    );
  }

  const readRate = t.openings >= MIN_FOR_RATE ? wholePct(t.reads, t.openings) : null;
  const doneRate = t.openings >= MIN_FOR_RATE ? wholePct(t.finishes, t.openings) : null;
  const actions = t.shares + t.likes + t.comments;
  // Empty until a share happens with the channel stored, which is why the
  // breakdown appears rather than standing as a row of zeroes.
  const channels = data.share_channels || [];
  const prevActions = p.shares + p.likes + p.comments;

  const rows = data.per_article;
  const shown = showAll ? rows : rows.slice(0, ROWS_SHOWN);
  const maxOpenings = rows.length > 0 ? rows[0].openings : 0;

  const nav = data.navigation;

  return (
    <div>
      <StatGrid>
        <Stat label="פתיחות מאמר" value={t.openings} sub={`${t.articles} מאמרים`} />
        <Stat label="נקראו" value={t.reads} rate={readRate} color={DEPTH_COLOR.read} />
        <Stat label="נקראו עד הסוף" value={t.finishes} rate={doneRate} color={DEPTH_COLOR.finished} />
        <Stat label="שיתופים, לייקים ותגובות" value={actions} color={ACTION_COLOR} />
      </StatGrid>

      {/* The previous window as one sentence rather than four arrow chips. At
          this volume most of those arrows would be a jump from nothing to
          nothing, which reads as a finding and is not one. */}
      <Note>
        בתקופה הקודמת באותו אורך: {p.openings} פתיחות, {p.reads} נקראו, {p.finishes} עד הסוף, {prevActions} פעולות.
      </Note>

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
        <div className="mt-1.5">
          <Legend
            items={[
              {
                key: 'reaction',
                round: true,
                color: ACTION_COLOR,
                label: `${data.granularity === 'hour' ? 'שעה' : 'יום'} שבו מישהו הגיב, עשה לייק או שיתף · ${shares(t.shares)}${
                  channels.length > 0
                    ? ` (${channels.map((c) => `${CHANNEL_LABELS[c.channel] || c.channel} ${c.n}`).join(', ')})`
                    : ''
                }, ${likes(t.likes)}, ${comments(t.comments)}`,
              },
            ]}
          />
        </div>
      )}

      {/* Did one article lead to another. This is the only question on the card
          that is about the site's shape rather than a single page, and it is the
          one the internal links were placed to move. */}
      <CardPart>
        <SubHead title="ממאמר למאמר" />
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
      </CardPart>

      {/* Which article holds a reader. The card above this one on the page ranks
          articles by views; this ranks the same articles by what happened after
          the view, which is the part a ranking by volume hides. */}
      <CardPart>
        <SubHead title="לפי מאמר" aside="פתיחות · נקרא · עד הסוף" />

        <ul className="space-y-2">
          {shown.map((row) => (
            <ArticleRow key={row.slug} row={row} max={maxOpenings} />
          ))}
        </ul>

        {rows.length > ROWS_SHOWN && (
          <ShowMore open={showAll} onToggle={() => setShowAll((v) => !v)} more={`הצג את כל ${rows.length} המאמרים`} />
        )}
      </CardPart>

      {/* Said out loud, because the two words on the chart are doing a lot of
          work and neither means what it sounds like on its own. */}
      <Note>
        &quot;נקרא&quot; = חצי מהעמוד נגלל, או 30 שניות בעמוד. &quot;עד הסוף&quot; = סוף גוף
        המאמר היה על המסך וגם עברו לפחות 40% מזמן הקריאה המשוער, בלשונית פעילה.
        אחוזי גלילה מדויקים וזמן קריאה אינם נשמרים ולכן אינם מופיעים כאן. לאיזו
        רשת בוצע שיתוף נשמר רק מ-22.9.2026, ולכן שיתופים קודמים מופיעים בלי רשת.
      </Note>
    </div>
  );
}
