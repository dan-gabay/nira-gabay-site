-- The whole story of one enquiry, for the expandable row in "הפניות עצמן"
-- (/manage/analytics). Called with the enquiry's session_id, which
-- manage_enquiry_log now returns alongside each row.
--
-- events  - every event of that visit, in order: the pages, the clicks, the
--           enquiry itself and whatever came after it.
-- earlier - up to three earlier visits that are PROBABLY the same visitor.
-- titles  - slug -> title for the articles among those pages.
--
-- WHY "PROBABLY". The event store deliberately keeps no visitor id (see
-- lib/siteEvents.ts): session_id is per visit and nothing links two visits.
-- What the browser does send is visit_number and days_since_first, which is
-- enough for a careful guess. An earlier visit is a candidate only if:
--   - its visit_number is lower than this visit's,
--   - it was on the same kind of device,
--   - it started no earlier than the visitor's first-visit date
--     (this visit's start minus days_since_first, Israel time),
--   - it ended before this visit started,
--   - it came the same way: the same keyword when this visit has one,
--     otherwise the same referrer host (or none, for direct).
-- For each visit_number the closest candidate before this visit wins. The UI
-- says "כנראה" and never presents it as certain.
--
-- Nothing here identifies a person: the same columns the dashboard already
-- counts, one visit at a time. manage_analytics is not touched.

create or replace function public.manage_enquiry_journey(p_session text)
returns json
language sql
security definer
set search_path to 'public'
as $$
  with ev as (
    select e.*
      from site_events e
     where e.session_id = p_session
       and e.bot_kind is null
  ),
  me as (
    select
      min(created_at) as started,
      max(device) as device,
      max(visit_number) as visit_number,
      max(days_since_first) as days_since_first,
      (array_agg(utm_term      order by created_at) filter (where utm_term      is not null))[1] as utm_term,
      (array_agg(referrer_host order by created_at) filter (where referrer_host is not null))[1] as referrer_host
    from ev
  ),
  cand as (
    select
      e.session_id,
      min(e.created_at) as started,
      max(e.created_at) as ended,
      max(e.visit_number) as visit_number,
      (array_agg(e.utm_term      order by e.created_at) filter (where e.utm_term      is not null))[1] as utm_term,
      (array_agg(e.referrer_host order by e.created_at) filter (where e.referrer_host is not null))[1] as referrer_host,
      bool_or(e.click_kind = 'google' or lower(coalesce(e.utm_medium,'')) in ('cpc','ppc','paid')) as paid
    from site_events e, me
    where me.visit_number > 1
      and e.session_id <> p_session
      and e.bot_kind is null
      and e.device is not distinct from me.device
      and e.created_at < me.started
      and e.created_at >= ((me.started at time zone 'Asia/Jerusalem')::date
                           - coalesce(me.days_since_first, 0)) at time zone 'Asia/Jerusalem'
    group by e.session_id
  ),
  matched as (
    select distinct on (c.visit_number) c.*
    from cand c, me
    where c.visit_number < me.visit_number
      and c.ended < me.started
      and case
            when me.utm_term is not null then c.utm_term = me.utm_term
            else c.referrer_host is not distinct from me.referrer_host
          end
    order by c.visit_number, c.ended desc
  )
  select json_build_object(
    'events', (select coalesce(json_agg(json_build_object(
        'ts', to_char(created_at at time zone 'Asia/Jerusalem', 'YYYY-MM-DD"T"HH24:MI:SS'),
        'event_name', event_name,
        'path', path,
        'source', source,
        'entity', entity,
        'is_conversion', is_conversion
      ) order by created_at), '[]'::json) from ev),
    'paid', (select bool_or(click_kind = 'google' or lower(coalesce(utm_medium,'')) in ('cpc','ppc','paid')) from ev),
    'utm_term', (select utm_term from me),
    'earlier', (select coalesce(json_agg(json_build_object(
        'visit_number', m.visit_number,
        'started', to_char(m.started at time zone 'Asia/Jerusalem', 'YYYY-MM-DD"T"HH24:MI'),
        'ended',   to_char(m.ended   at time zone 'Asia/Jerusalem', 'YYYY-MM-DD"T"HH24:MI'),
        'utm_term', m.utm_term,
        'referrer_host', m.referrer_host,
        'paid', coalesce(m.paid, false),
        'pages', (select coalesce(json_agg(e.path order by e.created_at), '[]'::json)
                    from site_events e
                   where e.session_id = m.session_id and e.event_name = 'page_view' and e.bot_kind is null)
      ) order by m.visit_number desc), '[]'::json)
      from (select * from matched order by visit_number desc limit 3) m),
    -- Article titles for every article path above, so the panel names them
    -- wherever it is opened, not only where the page happens to know them.
    'titles', (select coalesce(json_object_agg(a.slug, a.title), '{}'::json)
                 from articles a
                where '/articles/' || a.slug in (
                  select path from ev
                  union
                  select e.path from site_events e
                   where e.session_id in (select session_id from (select * from matched order by visit_number desc limit 3) x)
                     and e.event_name = 'page_view'))
  )
$$;

revoke all on function public.manage_enquiry_journey(text) from public, anon, authenticated;
