-- Measure visits that arrive on the recommendation of an AI assistant, and fix
-- two referrer rules that were silently mislabelling them.
--
-- THE BUG THAT WAS ALREADY LIVE. The social pattern carried `t\.co` - Twitter's
-- link shortener - unanchored, inside an alternation of bare substrings. Any
-- referrer host merely CONTAINING "t.co" matched it, which is every host ending
-- in "t.com": chatgpt.com and microsoft.com among them. Verified by running the
-- production expression over real hostnames rather than by reading it:
--
--   chatgpt.com           -> social          (via t.co)
--   copilot.microsoft.com -> social          (via t.co)
--   gemini.google.com     -> organic_search  (via the bare `google` substring)
--   bard.google.com       -> organic_search
--   perplexity.ai         -> referral
--   claude.ai             -> referral
--
-- So the three biggest assistants each landed somewhere different, two of them
-- in a bucket that was actively wrong. No stored row was affected - none of the
-- 11 referrer hosts seen since 2026-08-22 ends in "t.com" - so this is a fix
-- ahead of the traffic, not a repair of it.
--
-- Both the social and the search patterns are now anchored to a whole host
-- label, `(^|\.)host$`, which still matches m.facebook.com and www.google.co.il
-- and no longer matches a host that happens to contain the string.
--
-- THE NEW GROUP. ai_referral joins google_ads, paid_other, social,
-- organic_search, direct and referral. It is a seventh series in the stacked
-- chart, so the whole categorical palette was re-stepped and re-validated
-- all-pairs - see components/manage/Charts.tsx.
--
-- What it cannot see, stated plainly so the number is not over-read:
--   - Google AI Overviews are inside the search results page and send the
--     ordinary google.com referrer. They stay in organic_search.
--   - An assistant running as a desktop app sends no referrer. Unless the link
--     carries a utm_source, those visits stay in direct.
-- The number is therefore a floor, not a total.

-- WHAT ACTUALLY RAN. The function is 13KB and only three regions of it change,
-- so the migration was applied by rewriting the live definition in place rather
-- than by re-sending the whole body. Each replacement asserts that it matched,
-- so a drifted source aborts the migration instead of silently applying two
-- thirds of it. `select pg_get_functiondef('public.manage_analytics'::regproc)`
-- is the source of truth for the result.

do $do$
declare src text; out text;
begin
  select pg_get_functiondef(p.oid) into src
  from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname = 'public' and p.proname = 'manage_analytics';

  -- 1. the AI CTE, plus anchored social/search patterns in `channel`
  out := replace(src, '<the old channelled CTE>', '<the new aiflag + channelled CTEs>');
  if out = src then raise exception 'replacement 1 did not match'; end if;
  src := out;

  -- 2. the new group in `bucketed`, same anchoring
  out := replace(src, '<the old social/search branches>', '<is_ai branch + anchored branches>');
  if out = src then raise exception 'replacement 2 did not match'; end if;
  src := out;

  -- 3. name the tool in the traffic table's detail column
  out := replace(src, '<the direct branch>', '<the direct branch + ai_referral branch>');
  if out = src then raise exception 'replacement 3 did not match'; end if;

  execute out;
end $do$;

-- The resulting classification, in the order the CASE evaluates it. Paid first,
-- because a paid click is paid however it was surfaced; then AI, because two of
-- its hosts end in google.com and the search rule below would swallow them.
--
--   click_kind = 'google'                       -> google_ads
--   utm_medium in (cpc, ppc, paid)              -> google_ads | paid_other
--   AI host, or utm_source naming an AI tool    -> ai_referral        <- new
--   (^|.)facebook.com|instagram.com|fb.me|
--        t.co|linkedin.com|tiktok.com|
--        whatsapp.com|wa.me$                    -> social             <- anchored
--   (^|.)google.<tld>|bing.com|duckduckgo.com|
--        yahoo.com|ecosia.org$                  -> organic_search     <- anchored
--   no referrer, or our own domain              -> direct
--   anything else                               -> referral
--
-- VERIFIED AFTER APPLYING, over the 12 referrer hosts that actually exist in
-- site_events plus a set of AI and near-miss hostnames. Every real host keeps
-- the group it had - zero historical reclassification. The only movements are:
--
--   chatgpt.com, copilot.microsoft.com   social         -> ai_referral
--   gemini.google.com, bard.google.com   organic_search -> ai_referral
--   perplexity.ai, claude.ai, grok.com   referral       -> ai_referral
--   microsoft.com, support.com           social         -> referral
--
-- That last pair is the t.co bug, shown rather than argued: support.com has
-- nothing to do with social media and was classified as social purely because
-- "support.com" contains "t.co".
--
-- One session already qualifies: 2026-09-09 12:42 Israel time, mobile, no
-- referrer, utm_source=chatgpt.com, landing on /services/couples-therapy. It
-- had been counted as direct, because an assistant app sends no referrer and
-- nothing was reading utm_source for this purpose.
