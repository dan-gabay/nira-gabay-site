-- How readers actually behave inside an article, from the data we already
-- store and from nothing else.
--
-- The dashboard could already say how many people arrived and how many wrote.
-- Between those two it said almost nothing: top_articles ranked views, and a
-- view is the one article number that tells you least. 198 article views with
-- 11 finishes and 198 article views with 120 finishes look identical in it.
--
-- What this function adds is the middle of the funnel, per time bucket, per
-- article, and only where a real event backs it:
--
--   * page_view on an article page       - it was opened
--   * article_read                       - 50% of the page, or 30 seconds
--   * article_completed                  - the end of the article body was on
--                                          screen and 40% of the estimated
--                                          reading time was spent with the tab
--                                          visible (components/ArticleReadTracker)
--   * share                              - a share button was pressed
--   * article_likes / comments           - the rows themselves, see below
--
-- Deliberately absent, because we do not store it:
--
--   * scroll percentage. lib/analytics.ts fires a 'scroll' event at 25/50/75/
--     90/100, but 'scroll' is not on the allowlist in lib/siteEvents.ts, so no
--     row is ever written. It exists in GA4 and nowhere we can query. article_read
--     and article_completed are the depth signals we own, and they are the only
--     ones this function reports.
--   * time on page. Nothing writes a duration. article_completed implies at
--     least 40% of the reading time but the number itself is not stored.
--   * which network a share BEFORE 2026-09-22 went to. trackArticleShare put
--     the platform in `method` while /api/track kept only `source`, which
--     carried the article title - a value `entity` already holds as a slug.
--     lib/analytics.ts now stores `method` there for `share` and nothing else,
--     so shares from that date carry their channel and earlier ones cannot.
--   * whether a second article was reached by clicking an internal link. We
--     store the referrer host, never its path. A hop below means "the same
--     session opened another article afterwards", nothing more.

-- ─────────────────────────────────────────── the unit of measurement
--
-- One row per session per article: a reading. Not one per page_view.
--
-- It has to be this way for the stack to mean anything. A session that opens
-- the same article twice produces two page_views and at most one article_read,
-- so a column split into views-vs-reads would show a "read rate" that falls
-- when someone comes back to finish. Grouping first makes every segment of the
-- column the same kind of thing: a person and an article, sorted into how far
-- they got.
--
-- The reading is built from every article event, not only page_view. A beacon
-- can be dropped - it is fire-and-forget by design - and an article_read whose
-- page_view never arrived is still evidence that someone read it.
--
-- The bucket is the reading's FIRST event, so a session that starts at 23:50
-- counts once, on the day it began. Same convention as `sess` in
-- manage_analytics.

-- Both tables are read by time here and neither had an index on it. comments
-- is empty today and article_likes holds 15 rows, so this changes no plan now;
-- it is here because every other time column in this schema has one.
create index if not exists article_likes_created_idx
  on public.article_likes (created_date desc);
create index if not exists comments_created_idx
  on public.comments (created_date desc);

create or replace function public.manage_article_engagement(p_days integer default 30)
returns json
language sql
security definer
set search_path to 'public'
as $$
  with bounds as (
    select
      now() - make_interval(days => p_days)     as cur_from,
      now() - make_interval(days => p_days * 2) as prev_from,
      -- A single day plotted in daily buckets is one column, so 24 hours is
      -- bucketed hourly. Same switch, same formats, as manage_analytics.
      case when p_days <= 1 then 'hour' else 'day' end as unit,
      case when p_days <= 1 then 'YYYY-MM-DD"T"HH24' else 'YYYY-MM-DD' end as fmt
  ),
  -- bot_kind is null for a person (lib/botDetect.ts). Labelled hits are
  -- excluded from every figure, exactly as in manage_analytics - a crawler
  -- that renders the page must not become a reader.
  ev as (
    select e.session_id, e.entity, e.event_name, e.created_at
    from site_events e, bounds b
    where e.created_at >= b.prev_from
      and e.bot_kind is null
      and e.page_type = 'article'
      and e.entity is not null
      and e.session_id is not null
  ),
  reading as (
    select
      session_id,
      entity,
      min(created_at) as started_at,
      bool_or(event_name = 'article_read')      as reached_read,
      bool_or(event_name = 'article_completed') as finished
    from ev
    group by session_id, entity
  ),
  cur  as (select r.* from reading r, bounds b where r.started_at >= b.cur_from),
  prev as (select r.* from reading r, bounds b
           where r.started_at >= b.prev_from and r.started_at < b.cur_from),

  -- ── reactions
  --
  -- Three sources, one shape. Likes and comments are read from their own
  -- tables rather than from site_events, and that is not tidiness:
  --
  --   * a like writes an article_likes row AND fires article_like, but the
  --     table goes back to December 2025 and the event store starts on
  --     2026-08-22. The table is the record.
  --   * a comment writes a comments row and, from 2026-09-22, also fires
  --     'comment_submit' into the event store. The table stays the source here:
  --     it holds the text and the approval state, it goes back further than the
  --     event, and it is the one that survives a beacon being dropped.
  --   * a share has no table. site_events is the only record of it.
  --
  -- Counting likes from the table and not also from the event would double
  -- every like from the last month; the table is authoritative and the event
  -- is ignored here.
  --
  -- The joins to articles are LEFT joins: a like on an article that was later
  -- unpublished still happened, and must still be counted in the totals even
  -- though it can no longer be attributed to a row in the per-article table.
  reactions as (
    select ts, kind, slug, channel from (
        -- The allowlist is repeated from lib/analytics.ts on purpose. Before
        -- 2026-09-22 this column held the article title, and grouping by it
        -- unfiltered would print an article's name in the UI as if it were a
        -- social network. Anything unrecognised is a null channel: honestly
        -- unknown, still counted as a share.
        select e.created_at as ts, 'share'::text as kind, e.entity as slug,
               case
                 when e.source in ('whatsapp', 'facebook', 'instagram', 'copy_link', 'native')
                 then e.source
               end as channel
          from site_events e, bounds b
          where e.created_at >= b.prev_from
            and e.bot_kind is null
            and e.page_type = 'article'
            and e.event_name = 'share'
            and e.entity is not null
      union all
        select l.created_date, 'like', a.slug, null::text
          from article_likes l
          left join articles a on a.id = l.article_id
          cross join bounds b
          where l.created_date >= b.prev_from
      union all
        select c.created_date, 'comment', a.slug, null::text
          from comments c
          left join articles a on a.id = c.article_id
          cross join bounds b
          where c.created_date >= b.prev_from
    ) u
  ),
  react_cur  as (select r.* from reactions r, bounds b where r.ts >= b.cur_from),
  react_prev as (select r.* from reactions r, bounds b
                 where r.ts >= b.prev_from and r.ts < b.cur_from),

  -- ── article to article
  --
  -- Readings are already one per session per article, so ordering them by
  -- first touch and looking one step back gives the moves between articles
  -- within a visit. What it cannot say is why they moved; see the header.
  seq as (
    select session_id, entity, started_at,
           lag(entity) over (partition by session_id order by started_at) as prev_entity
    from cur
  ),
  hop as (
    select prev_entity as src, entity as dst
    from seq
    where prev_entity is not null and prev_entity <> entity
  )

  select json_build_object(
    'range_days',  p_days,
    'granularity', (select unit from bounds),

    'totals', (select json_build_object(
        'openings', count(*),
        'reads',    count(*) filter (where reached_read),
        'finishes', count(*) filter (where finished),
        'readers',  count(distinct session_id),
        'articles', count(distinct entity),
        'shares',   (select count(*) from react_cur where kind = 'share'),
        'likes',    (select count(*) from react_cur where kind = 'like'),
        'comments', (select count(*) from react_cur where kind = 'comment')
      ) from cur),

    -- The preceding window of equal length, because a read rate with nothing
    -- beside it cannot answer the only question worth asking of it.
    'previous', (select json_build_object(
        'openings', count(*),
        'reads',    count(*) filter (where reached_read),
        'finishes', count(*) filter (where finished),
        'readers',  count(distinct session_id),
        'shares',   (select count(*) from react_prev where kind = 'share'),
        'likes',    (select count(*) from react_prev where kind = 'like'),
        'comments', (select count(*) from react_prev where kind = 'comment')
      ) from prev),

    -- The stack. Three mutually exclusive segments, so the column height is
    -- the bucket's total readings and the split is how deep they went.
    -- `finished` swallows `read`: every finisher passed through it, and
    -- counting them in both would make the column taller than the truth.
    'daily', (select coalesce(json_agg(d order by d."day"), '[]'::json) from (
        select to_char(date_trunc(b.unit, started_at at time zone 'Asia/Jerusalem'), b.fmt) as "day",
               count(*) filter (where not reached_read and not finished) as opened,
               count(*) filter (where reached_read and not finished)     as "read",
               count(*) filter (where finished)                          as finished
        from cur, bounds b group by 1) d),

    -- Same bucket boundary as 'daily', so the two line up on one x-axis and a
    -- reaction can be drawn under the column it belongs to.
    'reactions_daily', (select coalesce(json_agg(r order by r."day"), '[]'::json) from (
        select to_char(date_trunc(b.unit, ts at time zone 'Asia/Jerusalem'), b.fmt) as "day",
               count(*) filter (where kind = 'share')   as shares,
               count(*) filter (where kind = 'like')    as likes,
               count(*) filter (where kind = 'comment') as comments
        from react_cur, bounds b group by 1) r),

    -- Which article holds a reader, not which one gets clicked. Ordered by
    -- openings so it stays readable when the range is short and most articles
    -- have one; the caller decides how many rows to show.
    'per_article', (select coalesce(json_agg(p order by p.openings desc, p.slug), '[]'::json) from (
        select c.entity as slug,
               coalesce(a.title, c.entity) as title,
               count(*)                                    as openings,
               count(*) filter (where c.reached_read)       as reads,
               count(*) filter (where c.finished)           as finishes,
               (select count(*) from react_cur x where x.slug = c.entity and x.kind = 'share')   as shares,
               (select count(*) from react_cur x where x.slug = c.entity and x.kind = 'like')    as likes,
               (select count(*) from react_cur x where x.slug = c.entity and x.kind = 'comment') as comments
        from cur c
        left join articles a on a.slug = c.entity
        group by c.entity, a.title) p),

    -- Which button was pressed, for the shares where we know. A share whose
    -- channel is null predates the measurement and is left out rather than
    -- reported as an "unknown" network, which would be a row about us and not
    -- about the reader.
    'share_channels', (select coalesce(json_agg(c order by c.n desc, c.channel), '[]'::json) from (
        select channel, count(*) as n
        from react_cur
        where kind = 'share' and channel is not null
        group by channel) c),

    'navigation', json_build_object(
        'article_sessions',       (select count(distinct session_id) from cur),
        'multi_article_sessions', (select count(*) from
                                    (select session_id from cur group by 1 having count(*) > 1) m),
        'hops',                   (select count(*) from hop)),

    'top_hops', (select coalesce(json_agg(h order by h.n desc, h.src), '[]'::json) from (
        select hop.src,
               coalesce(sa.title, hop.src) as src_title,
               hop.dst,
               coalesce(da.title, hop.dst) as dst_title,
               count(*) as n
        from hop
        left join articles sa on sa.slug = hop.src
        left join articles da on da.slug = hop.dst
        group by hop.src, sa.title, hop.dst, da.title
        order by count(*) desc, hop.src
        limit 6) h),

    -- The first article event we ever stored. The card needs it to say "no
    -- data yet in this range" instead of "nobody reads the articles".
    'first_event', (select to_char(min(created_at) at time zone 'Asia/Jerusalem', 'YYYY-MM-DD')
                    from site_events where page_type = 'article')
  )
$$;

comment on function public.manage_article_engagement(integer) is
  'Reader behaviour inside articles for the last p_days, beside the preceding window of equal length. The unit is a reading - one session and one article - not a page view. Bots are excluded (bot_kind is null means a person) and every bucket is Israel local time, both to agree with manage_analytics. Depth is article_read and article_completed only: scroll percentage and time on page are not stored anywhere we can query.';

-- Same posture as manage_analytics: the dashboard reads it through the service
-- role behind the /manage cookie, and nobody else can call it.
revoke all on function public.manage_article_engagement(integer) from public, anon, authenticated;
