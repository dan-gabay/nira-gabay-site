-- One row per enquiry in the range, newest first. Powers the "הפניות האחרונות"
-- list in /manage/analytics.
--
-- WHY. At a dozen enquiries a month every one of them is a story worth reading
-- whole: which button, on which page, after arriving from where, on which visit.
-- The aggregates spread that story over five cards (source, button, landing,
-- returning) and no card could say "the phone call on Tuesday came from an ad,
-- on the second visit, from the adult-therapy page".
--
-- Nothing here identifies a person. It is the same columns the aggregates are
-- built from, one event at a time: no IP, no user agent, no contact details.
--
-- ATTRIBUTION follows manage_analytics exactly: a visit is a session_id within
-- the current window, and its source is decided by the FIRST non-null value of
-- each attribution column in that window. The group CASE is the documented one
-- from db/2026-09-11-analytics-ai-referrals.sql, in the same order:
--
--   click_kind = 'google'                       -> google_ads
--   utm_medium in (cpc, ppc, paid)              -> google_ads | paid_other
--   AI host, or utm_source naming an AI tool    -> ai_referral
--   social hosts (anchored)                     -> social
--   search hosts (anchored)                     -> organic_search
--   no referrer, or our own domain              -> direct
--   anything else                               -> referral
--
-- manage_analytics is not touched. If the two ever disagree on a group, the
-- dashboard's totals are the reference and this list is the one to fix.

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
