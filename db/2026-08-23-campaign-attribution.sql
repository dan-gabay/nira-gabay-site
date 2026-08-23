-- Campaign attribution for /manage/analytics.
--
-- Two things were wrong with the "קמפיינים" card.
--
-- 1. Google Ads auto-tagging sends gclid, not utm. Every paid visit therefore
--    grouped under "(אורגני / ישיר)" - the card could never show a paid click,
--    which is the one thing it exists to show. click_kind records which
--    platform's click id was on the landing URL. Not the id: that is a
--    per-click identifier, and this table stores none by design.
--
-- 2. utm was read off the current URL on every event, and it only exists on
--    the landing URL. So a visit was credited to a campaign but the WhatsApp
--    click two pages later was not, and the conversions column read zero
--    however well an ad performed. The client now carries the session's
--    campaign on every event; this rolls a session up by the first tagged
--    event in it, so older rows and any future gap still resolve sensibly.

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
with
cur as (
  select * from site_events
  where created_at >= now() - make_interval(days => p_days)
),
prev as (
  select * from site_events
  where created_at >= now() - make_interval(days => p_days * 2)
    and created_at <  now() - make_interval(days => p_days)
),
-- One row per session: the campaign it arrived on, and whether it converted.
-- Attribution comes from the earliest tagged event, so a session that starts
-- on an ad keeps that credit for everything it goes on to do.
sess as (
  select
    session_id,
    (array_agg(click_kind   order by created_at) filter (where click_kind   is not null))[1] as click_kind,
    (array_agg(utm_source   order by created_at) filter (where utm_source   is not null))[1] as utm_source,
    (array_agg(utm_medium   order by created_at) filter (where utm_medium   is not null))[1] as utm_medium,
    (array_agg(utm_campaign order by created_at) filter (where utm_campaign is not null))[1] as utm_campaign,
    (array_agg(utm_content  order by created_at) filter (where utm_content  is not null))[1] as utm_content,
    (array_agg(utm_term     order by created_at) filter (where utm_term     is not null))[1] as utm_term,
    (array_agg(referrer_host order by created_at) filter (where referrer_host is not null))[1] as referrer_host,
    bool_or(is_conversion) as converted
  from cur
  where session_id is not null
  group by session_id
),
channelled as (
  select
    s.*,
    case
      when s.click_kind = 'google'                                     then 'Google Ads'
      when s.click_kind = 'meta'                                       then 'Meta'
      when lower(coalesce(s.utm_medium,'')) in ('cpc','ppc','paid')    then 'ממומן (' || coalesce(s.utm_source,'לא ידוע') || ')'
      when s.utm_source is not null                                    then s.utm_source
      when s.referrer_host ~* '(facebook|instagram|fb\.me|t\.co|linkedin)' then 'רשתות חברתיות'
      when s.referrer_host ~* '(google|bing|duckduckgo|yahoo|ecosia)'  then 'חיפוש אורגני'
      when s.referrer_host is not null                                 then 'הפניה מאתר אחר'
      else 'ישיר'
    end as channel
  from sess s
)
select json_build_object(
    'range_days', p_days,
    'totals', (select json_build_object(
        'views',       count(*) filter (where event_name = 'page_view'),
        'sessions',    count(distinct session_id),
        'conversions', count(*) filter (where is_conversion)) from cur),
    'previous', (select json_build_object(
        'views',       count(*) filter (where event_name = 'page_view'),
        'sessions',    count(distinct session_id),
        'conversions', count(*) filter (where is_conversion)) from prev),
    'daily', (select coalesce(json_agg(d order by d.day), '[]'::json) from (
        select to_char(created_at::date,'YYYY-MM-DD') as day,
               count(*) filter (where event_name = 'page_view') as views,
               count(*) filter (where is_conversion)            as conversions
        from cur group by 1) d),
    'by_event', (select coalesce(json_agg(e order by e.n desc), '[]'::json) from (
        select event_name as name, count(*) as n
        from cur group by 1 order by 2 desc limit 12) e),
    'by_page_type', (select coalesce(json_agg(p order by p.views desc), '[]'::json) from (
        select coalesce(page_type,'אחר') as page_type,
               count(*) filter (where event_name = 'page_view') as views,
               count(*) filter (where is_conversion)            as conversions
        from cur group by 1) p),
    'top_pages', (select coalesce(json_agg(t order by t.views desc), '[]'::json) from (
        select path, coalesce(page_type,'אחר') as page_type, count(*) as views
        from cur where event_name = 'page_view' and path is not null
        group by 1,2 order by 3 desc limit 12) t),
    'conversions_by_source', (select coalesce(json_agg(c order by c.n desc), '[]'::json) from (
        select event_name as name, coalesce(source,'לא ידוע') as source, count(*) as n
        from cur where is_conversion group by 1,2 order by 3 desc limit 15) c),
    'referrers', (select coalesce(json_agg(r order by r.n desc), '[]'::json) from (
        select coalesce(referrer_host,'ישיר') as host, count(distinct session_id) as n
        from cur where event_name = 'page_view' group by 1 order by 2 desc limit 10) r),
    'campaigns', (select coalesce(json_agg(u order by u.visits desc), '[]'::json) from (
        select channel, utm_campaign, utm_content, utm_term,
               count(*)                        as visits,
               count(*) filter (where converted) as conversions
        from channelled group by 1,2,3,4 order by 5 desc limit 12) u),
    'devices', (select coalesce(json_agg(d order by d.n desc), '[]'::json) from (
        select coalesce(device,'unknown') as device, count(distinct session_id) as n
        from cur where event_name = 'page_view' group by 1) d),
    'first_event', (select to_char(min(created_at), 'YYYY-MM-DD') from site_events)
  );
$fn$;

revoke all on function public.manage_analytics(int) from public, anon, authenticated;
