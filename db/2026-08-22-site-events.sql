-- First-party analytics store. Applied to production on 2026-08-22; kept here
-- so the schema is reviewable in the repo rather than only in the dashboard.
--
-- Why not GA4: ad blockers and tracking prevention stop Google Analytics and
-- the Meta pixel for a meaningful share of visitors, and the events worth the
-- most - someone reached out - are exactly the ones they stop. A POST to our
-- own origin is not blocked. It is also the only source that can answer "how
-- did this change over time", because articles.views_count is a running
-- counter with no timestamps.
--
-- Privacy: no IP, no user agent string, no email. session_id is a random
-- per-visit value held in sessionStorage; it separates one visit from another
-- and is not linkable to a person. On a therapist's site that is not optional.

create table if not exists public.site_events (
  id            bigserial primary key,
  created_at    timestamptz not null default now(),
  event_name    text not null,
  path          text,
  page_type     text,
  entity        text,
  source        text,
  session_id    text,
  device        text,
  referrer_host text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  is_conversion boolean not null default false
);

create index if not exists site_events_created_idx      on public.site_events (created_at desc);
create index if not exists site_events_name_created_idx on public.site_events (event_name, created_at desc);
create index if not exists site_events_conv_idx         on public.site_events (created_at desc) where is_conversion;
create index if not exists site_events_entity_idx       on public.site_events (entity, created_at desc) where entity is not null;

-- Deliberately no policies: reachable only through the service role, i.e. only
-- from our own server routes.
alter table public.site_events enable row level security;

-- Aggregation for /manage/analytics. Grouping in Postgres rather than Node:
-- pulling every row out to count it works at a few hundred events a month and
-- then quietly stops working.
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
           where e.created_at >= b.prev_from and e.created_at < b.cur_from)
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
    'daily', (select coalesce(json_agg(d order by d.day), '[]'::json) from (
        select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
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
    'conversions_by_source', (select coalesce(json_agg(c order by c.n desc), '[]'::json) from (
        select event_name as name, coalesce(source,'לא ידוע') as source, count(*) as n
        from cur where is_conversion group by 1,2 order by 3 desc limit 15) c),
    'referrers', (select coalesce(json_agg(r order by r.n desc), '[]'::json) from (
        select coalesce(referrer_host,'ישיר') as host, count(distinct session_id) as n
        from cur where event_name = 'page_view' group by 1 order by 2 desc limit 10) r),
    'campaigns', (select coalesce(json_agg(u order by u.visits desc), '[]'::json) from (
        select coalesce(utm_source,'(אורגני / ישיר)') as source, utm_campaign,
               count(distinct session_id)            as visits,
               count(*) filter (where is_conversion) as conversions
        from cur group by 1,2 order by 3 desc limit 10) u),
    'devices', (select coalesce(json_agg(d order by d.n desc), '[]'::json) from (
        select coalesce(device,'unknown') as device, count(distinct session_id) as n
        from cur where event_name = 'page_view' group by 1) d),
    'first_event', (select to_char(min(created_at), 'YYYY-MM-DD') from site_events)
  );
$fn$;

revoke all on function public.manage_analytics(int) from public, anon, authenticated;
