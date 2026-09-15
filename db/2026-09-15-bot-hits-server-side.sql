-- Record automated fetches on the server, because the client-side measurement
-- cannot see most of them.
--
-- The hole, found the hard way: on 2026-09-15 at 11:09 ChatGPT answered a
-- question about a therapist in Moshav Shoeva by recommending Nira and citing
-- her site. site_events has no row for it. Nothing between 10:57 and 12:00 at
-- all.
--
-- The reason is structural, not a bug. A row in site_events is written by the
-- page's own JavaScript calling /api/track (lib/siteEvents.ts). An assistant
-- that fetches the HTML and reads it never runs that JavaScript, so it never
-- appears. bot_kind could only ever label the automated clients that already
-- got through that door - which is why the 'ai' rows we do have all fired
-- article_read: they are the JS-executing minority. The measurement was
-- systematically blind to exactly the fetch that matters most.
--
-- Scale of the gap, same 12 hours: 325 middleware invocations, 27 page_view
-- rows in site_events.
--
-- proxy.ts already runs on every request that is not Next's own build output,
-- and it already has the user agent in its hand. It just was not writing
-- anything down. Now it is.

create table if not exists public.bot_hits (
  id         bigserial primary key,
  created_at timestamptz not null default now(),
  bot_kind   text        not null,
  path       text
);

comment on table public.bot_hits is
  'One row per automated request, written server-side by proxy.ts - see lib/botLog.ts. Complete in a way site_events is not: it does not require the client to run JavaScript, so a crawler or an assistant that fetches the HTML and leaves is recorded. Nothing is written for a person: botKindFromUserAgent returns null and the row is skipped, so this table adds no collection about human visitors. No IP, no user agent, no session - the same bargain as site_events.bot_kind.';

comment on column public.bot_hits.bot_kind is
  'ai_answer, ai_crawler, search, seo, preview, automation, monitor, other - see lib/botDetect.ts. Never null: a null kind means a person and nothing is written.';

comment on column public.bot_hits.path is
  'The page that was fetched. No query string: the tracked pages have none that matters and it is where identifiers would hide.';

create index if not exists bot_hits_created_at_idx on public.bot_hits (created_at desc);
create index if not exists bot_hits_kind_created_idx on public.bot_hits (bot_kind, created_at desc);

-- Same protection as site_events: RLS on, no policies, so only the service role
-- reaches it. The anon key cannot read or write this table.
alter table public.bot_hits enable row level security;

-- manage_analytics gains a 'bot_fetches' key beside the existing 'bots'. They
-- are different questions and both are kept:
--
--   bots         - automated clients that ran the page's JavaScript. This is
--                  what was EXCLUDED from the visit numbers, which is why the
--                  dashboard prints it as a caveat under the headline.
--   bot_fetches  - every automated request the server saw. Complete, and the
--                  only place ai_answer can actually show up.
--
-- Rewritten in place, one replacement, asserted. The rest of the 16KB body is
-- untouched.
do $mig$
declare
  src     text := pg_get_functiondef('public.manage_analytics'::regproc);
  needle  text := $n$        group by 1) x),
    'totals', (select json_build_object($n$;
  repl    text := $r$        group by 1) x),
    'bot_fetches', (select coalesce(json_agg(x order by x.hits desc), '[]'::json) from (
        select h.bot_kind as kind, count(*) as hits,
               count(distinct h.path) as paths
        from bot_hits h, bounds b
        where h.created_at >= b.cur_from
        group by 1) x),
    'totals', (select json_build_object($r$;
begin
  if position(needle in src) = 0 then
    raise exception 'manage_analytics: anchor not found, refusing to rewrite';
  end if;
  if position($c$'bot_fetches'$c$ in src) > 0 then
    raise notice 'manage_analytics already has bot_fetches, nothing to do';
    return;
  end if;
  src := replace(src, needle, repl);
  execute src;
end
$mig$;
