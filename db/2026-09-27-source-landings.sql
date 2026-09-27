-- Adds 'source_landings' to manage_site_behavior: for every traffic source and
-- detail (keyword, AI tool, network, site), which page the visit landed on.
-- Powers the "נחתו ב:" line under each detail row in /manage/analytics.
--
-- Attribution is the session logic of manage_enquiry_log verbatim
-- (db/2026-09-26-enquiry-log.sql): first non-null value of each attribution
-- column in the window, the same group CASE, and a detail named the way the
-- dashboard's traffic list names it (AI tool name, else referring host first). landing = the
-- session's first page_view. manage_analytics is not touched.
--
-- Full function below; everything but the new CTEs and key is unchanged from
-- db/2026-09-27-site-behavior.sql.

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
  att as (
    select
      e.session_id,
      (array_agg(e.click_kind    order by e.created_at) filter (where e.click_kind    is not null))[1] as click_kind,
      (array_agg(e.utm_source    order by e.created_at) filter (where e.utm_source    is not null))[1] as utm_source,
      (array_agg(e.utm_medium    order by e.created_at) filter (where e.utm_medium    is not null))[1] as utm_medium,
      (array_agg(e.utm_campaign  order by e.created_at) filter (where e.utm_campaign  is not null))[1] as utm_campaign,
      (array_agg(e.utm_term      order by e.created_at) filter (where e.utm_term      is not null))[1] as utm_term,
      (array_agg(e.referrer_host order by e.created_at) filter (where e.referrer_host is not null))[1] as referrer_host,
      (array_agg(e.path          order by e.created_at) filter (where e.event_name = 'page_view' and e.path is not null))[1] as landing
    from site_events e, b
    where e.created_at >= b.cur_from
      and e.bot_kind is null
      and e.session_id is not null
    group by e.session_id
  ),
  att_grp as (
    select a.landing, a.utm_term, a.utm_campaign, a.utm_source, a.referrer_host,
      case
        when a.click_kind = 'google' then 'google_ads'
        when lower(coalesce(a.utm_medium,'')) in ('cpc','ppc','paid')
          then case when lower(coalesce(a.utm_source,'')) = 'google' then 'google_ads' else 'paid_other' end
        when a.referrer_host ~* '(^|\.)(chatgpt\.com|copilot\.microsoft\.com|gemini\.google\.com|bard\.google\.com|perplexity\.ai|claude\.ai|grok\.com)$'
          or a.utm_source ~* '(chatgpt|openai|perplexity|claude|gemini|copilot|grok)'
          then 'ai_referral'
        when a.referrer_host ~* '(^|\.)(facebook\.com|instagram\.com|fb\.me|t\.co|linkedin\.com|tiktok\.com|whatsapp\.com|wa\.me)$' then 'social'
        when a.referrer_host ~* '(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org)$' then 'organic_search'
        when a.referrer_host is null or a.referrer_host ~* 'niragabay\.com' then 'direct'
        else 'referral'
      end as grp
    from att a
    where a.landing is not null
  ),
  att_det as (
    select g.landing, g.grp,
      case
        when g.grp in ('google_ads','paid_other') then coalesce(g.utm_term, g.utm_campaign)
        when g.grp = 'direct' then null
        -- the tool's name, as the traffic list shows it
        when g.grp = 'ai_referral' then
          case
            when coalesce(g.referrer_host,'') ~* 'chatgpt' or coalesce(g.utm_source,'') ~* '(chatgpt|openai)' then 'ChatGPT'
            when coalesce(g.referrer_host,'') ~* 'perplexity' or coalesce(g.utm_source,'') ~* 'perplexity' then 'Perplexity'
            when coalesce(g.referrer_host,'') ~* 'claude' or coalesce(g.utm_source,'') ~* 'claude' then 'Claude'
            when coalesce(g.referrer_host,'') ~* '(gemini|bard)' or coalesce(g.utm_source,'') ~* 'gemini' then 'Gemini'
            when coalesce(g.referrer_host,'') ~* 'copilot' or coalesce(g.utm_source,'') ~* 'copilot' then 'Copilot'
            when coalesce(g.referrer_host,'') ~* 'grok' or coalesce(g.utm_source,'') ~* 'grok' then 'Grok'
            else coalesce(g.referrer_host, g.utm_source)
          end
        -- the referring host first, as the traffic list names it
        else coalesce(g.referrer_host, g.utm_source)
      end as detail
    from att_grp g
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
    'source_landings', (select coalesce(json_agg(x order by x.grp, x.detail, x.visits desc), '[]'::json) from (
        select grp, detail, landing, count(*) as visits
        from att_det
        where detail is not null
        group by grp, detail, landing) x),
    'multi_page_median_secs', (select round(percentile_cont(0.5) within group (order by secs))::int
                                 from sess where views >= 2)
  )
$$;

revoke all on function public.manage_site_behavior(integer) from public, anon, authenticated;
