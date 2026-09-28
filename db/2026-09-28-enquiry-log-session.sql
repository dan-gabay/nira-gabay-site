-- Adds session_id to each manage_enquiry_log row, so the enquiry row in
-- /manage/analytics can open that visit's story (manage_enquiry_journey, see
-- db/2026-09-28-enquiry-journey.sql). The id is random per visit and is never
-- shown on screen. Otherwise identical to db/2026-09-26-enquiry-log.sql.

create or replace function public.manage_enquiry_log(p_days integer default 30)
returns json
language sql
security definer
set search_path to 'public'
as $$
  with cur as (
    select e.*
      from site_events e
     where e.created_at >= now() - make_interval(days => p_days)
       and e.bot_kind is null
       and e.session_id is not null
  ),
  sess as (
    select
      session_id,
      (array_agg(click_kind    order by created_at) filter (where click_kind    is not null))[1] as click_kind,
      (array_agg(utm_source    order by created_at) filter (where utm_source    is not null))[1] as utm_source,
      (array_agg(utm_medium    order by created_at) filter (where utm_medium    is not null))[1] as utm_medium,
      (array_agg(utm_campaign  order by created_at) filter (where utm_campaign  is not null))[1] as utm_campaign,
      (array_agg(utm_term      order by created_at) filter (where utm_term      is not null))[1] as utm_term,
      (array_agg(referrer_host order by created_at) filter (where referrer_host is not null))[1] as referrer_host,
      (array_agg(path          order by created_at) filter (where event_name = 'page_view' and path is not null))[1] as landing,
      count(*) filter (where event_name = 'page_view') as views,
      max(visit_number) as visit_number,
      max(device)       as device
    from cur
    group by session_id
  ),
  grouped as (
    select s.*,
      case
        when s.click_kind = 'google' then 'google_ads'
        when lower(coalesce(s.utm_medium,'')) in ('cpc','ppc','paid')
          then case when lower(coalesce(s.utm_source,'')) = 'google' then 'google_ads' else 'paid_other' end
        when s.referrer_host ~* '(^|\.)(chatgpt\.com|copilot\.microsoft\.com|gemini\.google\.com|bard\.google\.com|perplexity\.ai|claude\.ai|grok\.com)$'
          or s.utm_source ~* '(chatgpt|openai|perplexity|claude|gemini|copilot|grok)'
          then 'ai_referral'
        when s.referrer_host ~* '(^|\.)(facebook\.com|instagram\.com|fb\.me|t\.co|linkedin\.com|tiktok\.com|whatsapp\.com|wa\.me)$' then 'social'
        when s.referrer_host ~* '(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org)$' then 'organic_search'
        when s.referrer_host is null or s.referrer_host ~* 'niragabay\.com' then 'direct'
        else 'referral'
      end as grp
    from sess s
  )
  select coalesce(json_agg(r order by r.ts desc), '[]'::json) from (
    select
      e.session_id,
      e.created_at as ts,
      to_char(e.created_at at time zone 'Asia/Jerusalem', 'YYYY-MM-DD"T"HH24:MI') as at,
      e.event_name,
      e.source,
      e.path,
      g.landing,
      g.grp,
      case
        when g.grp in ('google_ads','paid_other') then coalesce(g.utm_term, g.utm_campaign)
        when g.grp = 'direct' then null
        else coalesce(g.utm_source, g.referrer_host)
      end as detail,
      g.views,
      g.visit_number,
      g.device
    from cur e
    join grouped g on g.session_id = e.session_id
    where e.is_conversion
    order by e.created_at desc
    limit 60
  ) r
$$;

revoke all on function public.manage_enquiry_log(integer) from public, anon, authenticated;
