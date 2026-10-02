-- Paid enquiries per Google Ads keyword, and what became of them. Powers the
-- "גוגל" section of /manage/analytics, where /api/manage/google/ads joins it
-- to the cost GA4 reports per keyword (cost lives only in Google, the outcome
-- only here, so neither side can answer "what did a client cost" alone).
--
-- Paid is the dashboard's own rule: utm_medium cpc/ppc/paid, or a gclid.
-- The keyword is utm_term, which the ad's tracking template fills with
-- {keyword}; a paid enquiry without one is counted in the totals under null.
--
-- Outcomes follow the enquiry status set by hand in /manage/enquiries:
--   spoke    - reached a conversation: spoke, started_therapy, ongoing
--   clients  - started_therapy, ongoing
--   irrelevant, open (new / no status yet)
--
-- p_since is a date in Israel time, so the API can line it up exactly with the
-- GA4 cost window. first_lead is the earliest paid enquiry ever, which the
-- section uses to say that nothing before it can be compared: the enquiry
-- tracking (utm columns) only exists from 18.9.2026.
create or replace function public.manage_paid_keyword_outcomes(p_since date)
returns json
language sql
security definer
set search_path to 'public'
as $$
  with paid as (
    select
      nullif(trim(utm_term), '') as term,
      status,
      (created_date at time zone 'Asia/Jerusalem')::date as day
    from contact_messages
    where coalesce(is_sample, false) = false
      and (lower(coalesce(utm_medium, '')) in ('cpc', 'ppc', 'paid') or gclid is not null)
  ),
  win as (
    select * from paid where day >= p_since
  ),
  per_term as (
    select
      term,
      count(*) as leads,
      count(*) filter (where status in ('spoke', 'started_therapy', 'ongoing')) as spoke,
      count(*) filter (where status in ('started_therapy', 'ongoing')) as clients,
      count(*) filter (where status = 'irrelevant') as irrelevant,
      count(*) filter (where status is null or status = 'new') as open,
      min(day) as first
    from win
    group by term
  )
  select json_build_object(
    'since', p_since,
    'first_lead', (select min(day) from paid),
    'totals', (
      select json_build_object(
        'leads', coalesce(sum(leads), 0),
        'spoke', coalesce(sum(spoke), 0),
        'clients', coalesce(sum(clients), 0),
        'irrelevant', coalesce(sum(irrelevant), 0),
        'open', coalesce(sum(open), 0)
      )
      from per_term
    ),
    'terms', coalesce(
      (select json_agg(row_to_json(t) order by t.leads desc, t.term) from per_term t),
      '[]'::json
    )
  );
$$;

revoke all on function public.manage_paid_keyword_outcomes(date) from public, anon, authenticated;
