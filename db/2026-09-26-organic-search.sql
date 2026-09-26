-- Visits that arrived from a search engine's organic results: where they
-- landed, and what they did next. Powers the "חיפוש אורגני" card in
-- /manage/analytics.
--
-- What it cannot say, and why: which query was typed. Google strips the search
-- terms from the referrer (it sends https://www.google.com/ and nothing else),
-- so no row in site_events carries them and no amount of SQL can recover them.
-- Queries exist only in Search Console, aggregated per query and page, and are
-- a separate integration (scripts/gsc-query.ts).
--
-- A visit is a session_id within one window, classified by its FIRST event in
-- that window, exactly as `sess` in manage_analytics does it. The window
-- matters: sessionStorage survives a restored tab, and one Bing session_id has
-- events on 23.8 and again on 25.9. Classifying it by its first event ever put
-- the September visit in the previous period and the card one short of the
-- dashboard. Organic search is that function's rule, in the
-- same order, reduced to the branches that decide it:
--
--   click_kind = 'google'                 -> paid, not here. click_kind 'meta'
--                                            is fbclid on any Facebook link and
--                                            is NOT paid, so only 'google' counts
--   utm_medium in (cpc, ppc, paid)        -> paid, not here
--   gemini.google.com / bard.google.com   -> ai_referral, not here (they end in
--                                            google.com and the rule below
--                                            would otherwise swallow them)
--   (^|.)google.<tld>|bing.com|duckduckgo.com|yahoo.com|ecosia.org$
--                                         -> organic search
--
-- Checked on 2026-09-26 against the dashboard's own organic_search rows for
-- every range the page offers: 24h 1, 7d 9, 30d 39, 90d 51 - identical.
--
-- Per visit:
--   continued    - opened a second distinct page
--   read_landing - an article_read / article_completed on the landing page
--                  itself, so only an article landing can have one
--   seconds      - first event to last event. A one-page visit with no other
--                  event is 0 by construction: nothing measured the time it
--                  spent. The median is reported, not the mean - one tab left
--                  open for an hour moved the mean of the homepage to 13 min.

create or replace function public.manage_organic_search(p_days integer default 30)
returns json
language sql
security definer
set search_path to 'public'
as $$
  with bounds as (
    select now() - make_interval(days => p_days)     as cur_from,
           now() - make_interval(days => p_days * 2) as prev_from
  ),
  ev as (
    select e.*, e.created_at >= b.cur_from as is_current
      from site_events e, bounds b
     where e.created_at >= b.prev_from
       and e.bot_kind is null
       and e.session_id is not null
  ),
  first_ev as (
    select distinct on (session_id, is_current)
           session_id, is_current, created_at, path, page_type, entity,
           referrer_host, click_kind, utm_medium, device
      from ev
     order by session_id, is_current, created_at
  ),
  organic as (
    select f.*,
           case
             when f.referrer_host ~* '(^|\.)google\.[a-z.]+$' then 'google'
             when f.referrer_host ~* '(^|\.)bing\.com$'       then 'bing'
             when f.referrer_host ~* '(^|\.)duckduckgo\.com$' then 'duckduckgo'
             when f.referrer_host ~* '(^|\.)yahoo\.com$'      then 'yahoo'
             else 'ecosia'
           end as engine
      from first_ev f
     where f.click_kind is distinct from 'google'
       and coalesce(lower(f.utm_medium), '') not in ('cpc', 'ppc', 'paid')
       and f.referrer_host !~* '(^|\.)(gemini|bard)\.google\.com$'
       and f.referrer_host ~* '(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org)$'
  ),
  visits as (
    select o.session_id, o.is_current, o.engine, o.device,
           o.path as landing, o.page_type as landing_type, o.entity as landing_entity,
           count(distinct e.path) filter (where e.event_name = 'page_view') > 1 as continued,
           bool_or(e.page_type = 'article') as reached_article,
           bool_or(e.event_name in ('article_read', 'article_completed')
                   and e.path = o.path) as read_landing,
           bool_or(e.is_conversion) as converted,
           extract(epoch from max(e.created_at) - min(e.created_at))::int as seconds
      from organic o
      join ev e using (session_id, is_current)
     group by 1, 2, 3, 4, 5, 6, 7
  ),
  cur as (select * from visits where is_current),
  -- The second distinct page each visit opened, in order. "Where did they go
  -- after landing" - one per visit, so a visit that reads five pages counts
  -- once, for the first place it chose to go.
  next_page as (
    select distinct on (e.session_id) e.session_id, e.path, e.page_type, e.entity
      from ev e
      join cur c on c.session_id = e.session_id and e.is_current
     where e.event_name = 'page_view' and e.path is distinct from c.landing
     order by e.session_id, e.created_at
  )
  select json_build_object(
    'range_days', p_days,
    'totals', (
      select json_build_object(
        'visits', count(*),
        'continued', count(*) filter (where continued),
        'reached_article', count(*) filter (where reached_article),
        'conversions', count(*) filter (where converted),
        'mobile', count(*) filter (where device = 'mobile'),
        'median_seconds', coalesce(percentile_disc(0.5) within group (order by seconds), 0)
      ) from cur
    ),
    'previous_visits', (select count(*) from visits where not is_current),
    'engines', coalesce((
      select json_agg(x order by x.n desc) from (
        select engine, count(*) as n from cur group by engine
      ) x
    ), '[]'::json),
    'landings', coalesce((
      select json_agg(x order by x.visits desc, x.path) from (
        select c.landing as path, c.landing_type as page_type, c.landing_entity as entity,
               a.title,
               count(*) as visits,
               count(*) filter (where c.continued) as continued,
               count(*) filter (where c.read_landing) as read,
               -- exclusive of `continued`, so the card can stack the two
               count(*) filter (where c.read_landing and not c.continued) as read_stayed,
               count(*) filter (where c.converted) as conversions,
               percentile_disc(0.5) within group (order by c.seconds) as median_seconds
          from cur c
          left join articles a on c.landing_type = 'article' and a.slug = c.landing_entity
         group by 1, 2, 3, 4
      ) x
    ), '[]'::json),
    'next_pages', coalesce((
      select json_agg(x order by x.n desc, x.path) from (
        select n.path, n.page_type, n.entity, a.title, count(*) as n
          from next_page n
          left join articles a on n.page_type = 'article' and a.slug = n.entity
         group by 1, 2, 3, 4
         order by 5 desc, 1
         limit 5
      ) x
    ), '[]'::json),
    'first_event', (
      select to_char(min(created_at) at time zone 'Asia/Jerusalem', 'DD.MM.YYYY')
        from site_events
    ),
    'previous_complete', (select min(created_at) from site_events)
                         <= (select prev_from from bounds)
  );
$$;

revoke all on function public.manage_organic_search(integer) from public, anon, authenticated;
