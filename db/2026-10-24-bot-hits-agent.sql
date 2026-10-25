-- RUN on production 2026-10-25 (approved by Dan). Kept for the record.
--
-- Adds the crawler's product token to bot_hits, so the GEO page can say
-- which AI crawler read the site and not only which kind of client it was.
--
-- Why it matters: bot_kind puts GPTBot (OpenAI training) and OAI-SearchBot
-- (the index ChatGPT Search answers from) in the same 'ai_crawler' bucket, and
-- Claude-SearchBot next to ClaudeBot. The second of each pair is the one that
-- decides whether an assistant can cite the site. Since 2026-09-15 that
-- distinction has been thrown away with the user agent.
--
-- PRIVACY. The value is one of a fixed list of published crawler names
-- (lib/botDetect.ts BOT_AGENT_NAMES), never any part of the user agent string.
-- It is null for browsers - they are never written here at all - and for every
-- automated client outside the AI and search families. No IP, no user agent,
-- no session, as before.
--
-- Additive and nullable, no rewrite of existing rows. The app writes the
-- column unconditionally from the deploy after this ran, so do not drop it
-- without first removing bot_agent from lib/botLog.ts botHitRow: PostgREST
-- rejects an insert that names an unknown column.

alter table public.bot_hits add column if not exists bot_agent text;

alter table public.bot_hits drop constraint if exists bot_hits_bot_agent_len;
alter table public.bot_hits add constraint bot_hits_bot_agent_len
  check (bot_agent is null or char_length(bot_agent) <= 40);

comment on column public.bot_hits.bot_agent is
  'Published crawler name from a fixed allowlist (lib/botDetect.ts BOT_AGENT_NAMES), e.g. OAI-SearchBot, GPTBot, ClaudeBot. Only for ai_answer, ai_crawler and search; null otherwise and on rows before 2026-10-24. Never a slice of the user agent.';

create index if not exists bot_hits_agent_created_idx
  on public.bot_hits (bot_agent, created_at desc) where bot_agent is not null;
