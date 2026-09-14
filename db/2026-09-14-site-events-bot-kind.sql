-- Label automated clients in site_events. Label, not block.
--
-- WHY. In the 30 days to 2026-09-14, 82 of 479 visits were desktop sessions
-- with no referrer, landing straight on a deep article URL, one page each,
-- never the same page twice, spread evenly around the clock including 02:00
-- and 05:20, and rising: 6, 9, 16, 14 on the four days to 13/09.
--
-- 39 of those 82 fired `article_read`, which looks like engagement and is not:
-- that event is a 30-second timer with no scroll requirement
-- (components/ArticleReadTracker.tsx line ~89). The event that cannot be faked
-- without scrolling is `article_completed`, which needs the end of the article
-- body to intersect the viewport plus visible-tab time. Across those 82
-- sessions it fired zero times, while groups a third the size produced two
-- each. Something loads the page and waits.
--
-- Excluding them moves the conversion rate from 1.88% to 2.27% and costs no
-- enquiries at all: all 9 came from the other 397 visits.
--
-- WHAT THIS IS NOT. Nothing here refuses a request. /api/track is the last
-- step of a request whose content has already been served, so a crawler that
-- is flagged here still got the page, still reads the site, still indexes it.
-- Being in the AI indexes is the goal; being counted as a visitor is not.
--
-- PRIVACY. The stored value is one coarse word - ai, search, seo, preview,
-- automation, monitor, other - and never the user agent it came from. The
-- route already reads the user agent to reduce it to mobile/desktop and throws
-- it away; this adds a second reduction to the same string and throws it away
-- the same way. No IP, no user agent, no identifier: unchanged.
--
-- NO BACKFILL IS POSSIBLE. The user agent was never stored, so the 882 rows
-- that predate this keep bot_kind null and continue to count as people. The 82
-- sessions above stay in the historical figures. Only new hits are labelled.

alter table public.site_events
  add column if not exists bot_kind text;

comment on column public.site_events.bot_kind is
  'What kind of automated client sent this hit: ai, search, seo, preview, automation, monitor, other. NULL means a person. Derived in app/api/track/route.ts from the user agent, which is then discarded - see lib/botDetect.ts. Bots are labelled, never blocked.';

create index if not exists site_events_bot_kind_idx
  on public.site_events (bot_kind) where bot_kind is not null;

-- manage_analytics was rewritten in place, the same way as 2026-09-11: three
-- regions change in a 13KB body, each replacement asserts that it matched.
-- `select pg_get_functiondef('public.manage_analytics'::regproc)` is the
-- source of truth for the result. The two edits were:
--
--   1. `cur` and `prev` gain `and e.bot_kind is null`, so every figure the
--      dashboard shows - totals, traffic groups, landing pages, articles,
--      conversions, the clock - counts people only.
--   2. a new 'bots' key on the returned object:
--
--        select e.bot_kind as kind, count(*) as hits,
--               count(distinct e.session_id) as sessions
--        from site_events e, bounds b
--        where e.created_at >= b.cur_from and e.bot_kind is not null
--        group by 1
--
--      Sessions as well as hits, because one crawler fetching forty pages is
--      one client and not forty visitors. The analytics page prints the
--      session figure under the title, so the exclusion is visible rather than
--      silent.
