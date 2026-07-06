-- Atomic view/like counters (fixes client read-modify-write lost updates)
create or replace function public.increment_article_views(aid text)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.articles
  set views_count = coalesce(views_count, 0) + 1
  where id = aid
  returning views_count;
$$;

create or replace function public.increment_article_likes(aid text)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.articles
  set likes_count = coalesce(likes_count, 0) + 1
  where id = aid
  returning likes_count;
$$;

revoke all on function public.increment_article_views(text) from public;
revoke all on function public.increment_article_likes(text) from public;
grant execute on function public.increment_article_views(text) to anon, authenticated, service_role;
grant execute on function public.increment_article_likes(text) to anon, authenticated, service_role;

-- Newsletter subscribers (written only from the server API route, service role)
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text,
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

-- meta_title backfill for pre-pipeline published articles.
-- Excludes the protected article 08179042-70f6-4f60-a6ab-de388d729a10.
update public.articles
set meta_title = case
  when char_length(title || ' | נירה גבאי') <= 65 then title || ' | נירה גבאי'
  else title
end
where is_published = true
  and meta_title is null
  and id <> '08179042-70f6-4f60-a6ab-de388d729a10';
