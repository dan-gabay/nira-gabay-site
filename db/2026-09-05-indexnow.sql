-- IndexNow submission state.
--
-- One row per public URL, holding the content key that was last submitted for
-- it. The whole point of the table is the diff: without it, every deploy and
-- every nightly cron would post the entire sitemap to IndexNow, which is the
-- behaviour the protocol's own guidance calls out as abuse and answers with
-- 429. With it, a run submits an article on the day it is published and says
-- nothing about it afterwards.
--
-- Applied to production on 2026-09-05; kept here so the schema is reviewable
-- in the repo rather than only in the dashboard.

create table if not exists public.indexnow_urls (
  url          text primary key,
  -- Changes if and only if the page's content changed. See lib/siteUrls.ts:
  -- an article's own updated_date, a hash of a service page's copy, a hash of
  -- a topic hub's membership, or the manual STATIC_CONTENT_VERSION.
  content_key  text not null,
  submitted_at timestamptz not null default now()
);

create index if not exists indexnow_urls_submitted_idx
  on public.indexnow_urls (submitted_at desc);

-- Deliberately no policies: reachable only through the service role, i.e. only
-- from our own server routes and the deploy script.
alter table public.indexnow_urls enable row level security;
