-- Two questions /manage/analytics could not answer, in one read-only call:
--
--   1. AI tools and the site. bot_hits (db/2026-09-15-bot-hits-server-side.sql)
--      already records every automated request by kind. The dashboard showed
--      one sentence about it; this returns the shape over the range, split into
--      the two kinds that mean different things:
--        ai_crawler - a training or index crawler, on its own schedule
--        ai_answer  - an assistant fetching a page because someone just asked it
--      plus classic search crawlers for scale, and which pages each one read.
--
--   2. Visit depth. How many pages a visit had, how long it lasted, and how
--      many of each depth ended in an enquiry. Duration is first event to last
--      event in the session: there is no exit event, so the time on the last
--      page is never counted and a one-page visit reads as 0. The dashboard
--      says so and does not show a duration for one-page visits.
--
-- manage_analytics is not touched. Nothing here identifies a person: bot_hits
-- has no IP, no user agent, no session; site_events is read as aggregates.

create or replace function public.manage_site_behavior(p_days integer default 30)
returns json
language sql
security definer
set search_path to 'public'
as $$
  with b as (
    select now() - make_interval(days => p_days)     as cur_from,
           now() - make_interval(days => p_days * 2) as prev_from
  ),
  hits as (
    select h.*
      from bot_hits h, b
     where h.created_at >= b.prev_from
       and h.bot_kind in ('ai_answer', 'ai_crawler', 'search')
  ),
  cur_hits as (select h.* from hits h, b where h.created_at >= b.cur_from),
  sess as (
    select
      e.session_id,
      count(*) filter (where e.event_name = 'page_view')                           as views,
      extract(epoch from max(e.created_at) - min(e.created_at))::int               as secs,
      bool_or(e.is_conversion)                                                     as conv,
      bool_or(e.event_name = 'page_view' and e.page_type = 'article')              as saw_article
    from site_events e, b
    where e.created_at >= b.cur_from
      and e.bot_kind is null
      and e.session_id is not null
    group by e.session_id
    having count(*) filter (where e.event_name = 'page_view') > 0
  ),
  depth as (
    select case when views = 1 then 1 when views = 2 then 2 when views <= 4 then 3 else 5 end as ord, s.*
    from sess s
  )
  select json_build_object(
    'granularity', (case when p_days <= 1 then 'hour' else 'day' end),
    'ai_daily', (select coalesce(json_agg(d order by d.day), '[]'::json) from (
        select to_char(
                 date_trunc(case when p_days <= 1 then 'hour' else 'day' end,
                            created_at at time zone 'Asia/Jerusalem'),
                 case when p_days <= 1 then 'YYYY-MM-DD"T"HH24' else 'YYYY-MM-DD' end
               ) as day,
               count(*) filter (where bot_kind = 'ai_crawler') as crawler,
               count(*) filter (where bot_kind = 'ai_answer')  as answer,
               count(*) filter (where bot_kind = 'search')     as search
        from cur_hits group by 1) d),
    'ai_totals', (select json_build_object(
        'crawler',       count(*) filter (where bot_kind = 'ai_crawler'),
        'answer',        count(*) filter (where bot_kind = 'ai_answer'),
        'search',        count(*) filter (where bot_kind = 'search'),
        'crawler_paths', count(distinct path) filter (where bot_kind = 'ai_crawler'),
        'answer_paths',  count(distinct path) filter (where bot_kind = 'ai_answer'))
      from cur_hits),
    'ai_previous', (select json_build_object(
        'crawler', count(*) filter (where bot_kind = 'ai_crawler'),
        'answer',  count(*) filter (where bot_kind = 'ai_answer'),
        'search',  count(*) filter (where bot_kind = 'search'))
      from hits h, b where h.created_at < b.cur_from),
    'ai_pages', (select coalesce(json_agg(p order by p.answer desc, p.crawler desc), '[]'::json) from (
        select h.path,
               (select a.title from articles a where '/articles/' || a.slug = h.path limit 1) as title,
               count(*) filter (where h.bot_kind = 'ai_answer')  as answer,
               count(*) filter (where h.bot_kind = 'ai_crawler') as crawler
        from cur_hits h
        where h.bot_kind in ('ai_answer', 'ai_crawler') and h.path is not null
        group by h.path
        order by count(*) filter (where h.bot_kind = 'ai_answer') desc,
                 count(*) filter (where h.bot_kind = 'ai_crawler') desc
        limit 12) p),
    'ai_first_hit', (select to_char(min(created_at) at time zone 'Asia/Jerusalem', 'YYYY-MM-DD') from bot_hits),
    'depth', (select coalesce(json_agg(x order by x.ord), '[]'::json) from (
        select ord,
               count(*)                                                    as visits,
               round(percentile_cont(0.5) within group (order by secs))::int as median_secs,
               count(*) filter (where conv)                                as converted,
               count(*) filter (where saw_article)                         as with_article
        from depth group by ord) x),
    'multi_page_median_secs', (select round(percentile_cont(0.5) within group (order by secs))::int
                                 from sess where views >= 2)
  )
$$;

revoke all on function public.manage_site_behavior(integer) from public, anon, authenticated;
