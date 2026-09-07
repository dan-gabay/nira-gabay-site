-- Every time bucket in manage_analytics is Israel local time, not UTC.
--
-- An enquiry that came in at 14:48 Israel time was shown on the dashboard as
-- 11:00. It is stored correctly - site_events.created_at is timestamptz, and
-- 2026-09-07 11:48+00 really is 14:48 in Jerusalem - but the aggregation
-- bucketed it with a bare date_trunc, which works in UTC, and the chart then
-- printed that hour as if it were the local one.
--
-- It was never only about hours. An event at 23:04 UTC is 02:04 the next day in
-- Israel, so the daily charts were counting late-evening activity on the wrong
-- day, every day, invisibly.
--
-- by_hour and by_weekday already converted (their card says "שעון ישראל"),
-- which is why they were right and everything beside them was wrong. Now all of
-- them agree, and the dashboard has one clock: the one Nira and Dan are on.
--
-- The range filter is deliberately left alone. `now() - make_interval(...)`
-- compares absolute instants, and "the last 30 days" means the same thing in
-- every timezone. Only the bucketing was ever ambiguous.

create or replace function public.manage_analytics(p_days integer default 30)
returns json
language sql
security definer
set search_path to 'public'
as $$
  with bounds as (
    select
      now() - make_interval(days => p_days)     as cur_from,
      now() - make_interval(days => p_days * 2) as prev_from
  ),
  cur  as (select e.* from site_events e, bounds b where e.created_at >= b.cur_from),
  prev as (select e.* from site_events e, bounds b
           where e.created_at >= b.prev_from and e.created_at < b.cur_from),
  sess as (
    select
      session_id,
      -- The session's first event. Its whole attribution is decided by the
      -- first non-null value below, so the visit belongs to the day it started.
      min(created_at) as started_at,
      (array_agg(click_kind    order by created_at) filter (where click_kind    is not null))[1] as click_kind,
      (array_agg(utm_source    order by created_at) filter (where utm_source    is not null))[1] as utm_source,
      (array_agg(utm_medium    order by created_at) filter (where utm_medium    is not null))[1] as utm_medium,
      (array_agg(utm_campaign  order by created_at) filter (where utm_campaign  is not null))[1] as utm_campaign,
      (array_agg(utm_content   order by created_at) filter (where utm_content   is not null))[1] as utm_content,
      (array_agg(utm_term      order by created_at) filter (where utm_term      is not null))[1] as utm_term,
      (array_agg(referrer_host order by created_at) filter (where referrer_host is not null))[1] as referrer_host,
      bool_or(is_conversion) as converted
    from cur
    where session_id is not null
    group by session_id
  ),
  channelled as (
    select s.*,
      case
        when s.click_kind = 'google'                                  then 'Google Ads'
        when s.click_kind = 'meta'                                    then 'Meta'
        when lower(coalesce(s.utm_medium,'')) in ('cpc','ppc','paid') then 'ממומן (' || coalesce(s.utm_source,'לא ידוע') || ')'
        when s.utm_source is not null                                 then s.utm_source
        when s.referrer_host ~* '(facebook|instagram|fb\.me|t\.co|linkedin)' then 'רשתות חברתיות'
        when s.referrer_host ~* '(google|bing|duckduckgo|yahoo|ecosia)'      then 'חיפוש אורגני'
        when s.referrer_host is not null                              then 'הפניה מאתר אחר'
        else 'ישיר'
      end as channel
    from sess s
  ),
  bucketed as (
    select c.*,
      case
        when c.click_kind = 'google' then 'google_ads'
        when lower(coalesce(c.utm_medium,'')) in ('cpc','ppc','paid')
          then case when lower(coalesce(c.utm_source,'')) = 'google' then 'google_ads' else 'paid_other' end
        when c.referrer_host ~* '(facebook|instagram|fb\.me|t\.co|linkedin|tiktok|whatsapp)' then 'social'
        when c.referrer_host ~* '(google|bing|duckduckgo|yahoo|ecosia)' then 'organic_search'
        when c.referrer_host is null or c.referrer_host ~* 'niragabay\.com' then 'direct'
        else 'referral'
      end as grp
    from channelled c
  ),
  sess_views as (
    select session_id, count(*) filter (where event_name = 'page_view') as views
    from cur where session_id is not null group by session_id
  ),
  landing as (
    select distinct on (session_id)
      session_id, path, coalesce(page_type,'other') as page_type
    from cur
    where event_name = 'page_view' and path is not null
    order by session_id, created_at
  )
  select json_build_object(
    'range_days', p_days,
    'totals', (select json_build_object(
        'views',       count(*) filter (where event_name = 'page_view'),
        'visits',      count(distinct session_id),
        'conversions', count(*) filter (where is_conversion),
        'signups',     count(*) filter (where event_name = 'sign_up'),
        'events',      count(*)) from cur),
    'previous', (select json_build_object(
        'views',       count(*) filter (where event_name = 'page_view'),
        'visits',      count(distinct session_id),
        'conversions', count(*) filter (where is_conversion),
        'signups',     count(*) filter (where event_name = 'sign_up')) from prev),
    'granularity', (case when p_days <= 1 then 'hour' else 'day' end),
    'daily', (select coalesce(json_agg(d order by d.day), '[]'::json) from (
        select to_char(
                 date_trunc(case when p_days <= 1 then 'hour' else 'day' end,
                            created_at at time zone 'Asia/Jerusalem'),
                 case when p_days <= 1 then 'YYYY-MM-DD"T"HH24' else 'YYYY-MM-DD' end
               ) as day,
               count(*) filter (where event_name = 'page_view') as views,
               count(distinct session_id)                       as visits,
               count(*) filter (where is_conversion)            as conversions
        from cur group by 1) d),
    -- Visits per bucket per source group. Same bucket boundary as 'daily'
    -- above, so the two charts line up on the x-axis.
    'traffic_daily', (select coalesce(json_agg(t order by t.day, t.grp), '[]'::json) from (
        select to_char(
                 date_trunc(case when p_days <= 1 then 'hour' else 'day' end,
                            started_at at time zone 'Asia/Jerusalem'),
                 case when p_days <= 1 then 'YYYY-MM-DD"T"HH24' else 'YYYY-MM-DD' end
               ) as day,
               grp,
               count(*)                          as visits,
               count(*) filter (where converted) as conversions
        from bucketed group by 1, 2) t),
    'by_event', (select coalesce(json_agg(e order by e.n desc), '[]'::json) from (
        select event_name as name, count(*) as n from cur group by 1) e),
    'by_page_type', (select coalesce(json_agg(p order by p.views desc), '[]'::json) from (
        select coalesce(page_type,'other') as page_type,
               count(*) filter (where event_name = 'page_view') as views,
               count(*) filter (where is_conversion)            as conversions
        from cur group by 1) p),
    'top_pages', (select coalesce(json_agg(t order by t.views desc), '[]'::json) from (
        select path, coalesce(page_type,'other') as page_type, count(*) as views
        from cur where event_name = 'page_view' and path is not null
        group by 1,2 order by 3 desc limit 15) t),
    'top_articles', (select coalesce(json_agg(a order by a.views desc), '[]'::json) from (
        select e.entity as slug,
               coalesce(ar.title, e.entity) as title,
               count(*)                     as views,
               count(distinct e.session_id) as readers
        from cur e
        left join articles ar on ar.slug = e.entity
        where e.event_name = 'page_view' and e.page_type = 'article' and e.entity is not null
        group by 1,2 order by 3 desc limit 10) a),
    'conversions_by_source', (select coalesce(json_agg(c order by c.n desc), '[]'::json) from (
        select event_name as name, coalesce(source,'לא ידוע') as source, count(*) as n
        from cur where is_conversion group by 1,2 order by 3 desc limit 15) c),
    'referrers', (select coalesce(json_agg(r order by r.n desc), '[]'::json) from (
        select coalesce(referrer_host,'ישיר') as host, count(distinct session_id) as n
        from cur where event_name = 'page_view' group by 1 order by 2 desc limit 10) r),
    'campaigns', (select coalesce(json_agg(u order by u.visits desc), '[]'::json) from (
        select channel, utm_campaign, utm_content, utm_term,
               count(*)                          as visits,
               count(*) filter (where converted) as conversions
        from channelled group by 1,2,3,4 order by 5 desc limit 12) u),
    'devices', (select coalesce(json_agg(d order by d.n desc), '[]'::json) from (
        select coalesce(device,'unknown') as device, count(distinct session_id) as n
        from cur where event_name = 'page_view' group by 1) d),
    'traffic', (select coalesce(json_agg(t order by t.visits desc), '[]'::json) from (
        select grp,
               case when grp in ('google_ads','paid_other') then 'paid'
                    when grp = 'direct'                     then 'direct'
                    else 'organic' end as kind,
               case
                 when grp = 'google_ads' then coalesce(utm_term, utm_campaign, 'ללא מילת מפתח')
                 when grp = 'paid_other' then coalesce(utm_campaign, utm_source, 'ללא תיוג')
                 when grp = 'direct'     then null
                 else coalesce(referrer_host, 'לא ידוע')
               end as detail,
               count(*)                          as visits,
               count(*) filter (where converted) as conversions
        from bucketed group by 1,2,3) t),
    'landing_pages', (select coalesce(json_agg(l order by l.visits desc), '[]'::json) from (
        select lp.path, lp.page_type,
               count(*)                             as visits,
               count(*) filter (where s.converted)  as conversions
        from landing lp
        join sess s on s.session_id = lp.session_id
        group by 1,2 order by 3 desc limit 12) l),
    'service_funnel', (select coalesce(json_agg(s order by s.visits desc), '[]'::json) from (
        select entity as slug,
               count(*) filter (where event_name = 'page_view')             as views,
               count(distinct session_id) filter (where event_name = 'page_view') as visits,
               count(*) filter (where is_conversion)                        as conversions
        from cur where page_type = 'service' and entity is not null
        group by 1 order by 3 desc) s),
    'by_hour', (select coalesce(json_agg(h order by h.hour), '[]'::json) from (
        select extract(hour from created_at at time zone 'Asia/Jerusalem')::int as hour,
               count(distinct session_id)            as visits,
               count(*) filter (where is_conversion) as conversions
        from cur group by 1) h),
    'by_weekday', (select coalesce(json_agg(w order by w.dow), '[]'::json) from (
        select extract(dow from created_at at time zone 'Asia/Jerusalem')::int as dow,
               count(distinct session_id)            as visits,
               count(*) filter (where is_conversion) as conversions
        from cur group by 1) w),
    'engagement', (select json_build_object(
        'visits',          (select count(*) from sess_views),
        'one_page_visits', (select count(*) from sess_views where views <= 1),
        'deep_visits',     (select count(*) from sess_views where views >= 3),
        'article_reads',      (select count(*) from cur where event_name = 'article_read'),
        'article_completed',  (select count(*) from cur where event_name = 'article_completed'))),
    'first_event', (select to_char(min(created_at) at time zone 'Asia/Jerusalem', 'YYYY-MM-DD') from site_events)
  );
$$;
