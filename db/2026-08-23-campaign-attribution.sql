-- Campaign attribution for /manage/analytics.
--
-- Google Ads auto-tagging sends gclid, not utm, so every paid visit grouped
-- under "(אורגני / ישיר)" - the card could never show a paid click, which is
-- the one thing it exists for. click_kind records which platform's click id was
-- on the landing URL. Not the id: that identifies a single click, and this
-- table holds no identifiers by design.
--
-- And utm was read off the current URL on every event, but it only exists on
-- the landing URL, so a visit was credited to a campaign while the WhatsApp
-- click two pages later was not. Sessions are rolled up by their earliest
-- tagged event, which also repairs rows already in the table.
--
-- NOTE: the function below is the original from 2026-08-22 with only the
-- campaigns block changed and two CTEs added. An earlier version of this file
-- rewrote it from memory and dropped totals.visits, totals.signups and
-- daily.visits, which emptied the visits card, the signups card and the
-- traffic chart. Change this function by editing it, never by retyping it.

alter table public.site_events add column if not exists utm_term    text;
alter table public.site_events add column if not exists utm_content text;
alter table public.site_events add column if not exists click_kind  text;

create index if not exists site_events_session_idx
  on public.site_events (session_id, created_at);

create or replace function public.manage_analytics(p_days int default 30)
returns json
language sql
security definer
set search_path = public
as $fn$
  with bounds as (
    select
      now() - make_interval(days => p_days)     as cur_from,
      now() - make_interval(days => p_days * 2) as prev_from
  ),
  cur  as (select e.* from site_events e, bounds b where e.created_at >= b.cur_from),
  prev as (select e.* from site_events e, bounds b
           where e.created_at >= b.prev_from and e.created_at < b.cur_from),
  -- One row per session: the campaign it arrived on, and whether it converted.
  -- Attribution is the earliest tagged event, so a session that starts on an ad
  -- keeps the credit for everything it goes on to do.
  sess as (
    select
      session_id,
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
    -- One day asked for means 24 hours, and a 24-hour window plotted in daily
    -- buckets is one bar. Bucket by hour instead; the client picks its axis
    -- from 'granularity' rather than guessing from the key format.
    'granularity', (case when p_days <= 1 then 'hour' else 'day' end),
    'daily', (select coalesce(json_agg(d order by d.day), '[]'::json) from (
        select to_char(
                 date_trunc(case when p_days <= 1 then 'hour' else 'day' end, created_at),
                 case when p_days <= 1 then 'YYYY-MM-DD"T"HH24' else 'YYYY-MM-DD' end
               ) as day,
               count(*) filter (where event_name = 'page_view') as views,
               count(distinct session_id)                       as visits,
               count(*) filter (where is_conversion)            as conversions
        from cur group by 1) d),
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
    -- Which articles were actually read in this window. top_pages mixes every
    -- page type together and shows a slug; this joins the title back on.
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
    'first_event', (select to_char(min(created_at), 'YYYY-MM-DD') from site_events)
  );
$fn$;

revoke all on function public.manage_analytics(int) from public, anon, authenticated;
