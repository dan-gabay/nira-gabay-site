-- Direct visits by landing page.
--
-- Asked 17 Nov 2026: in /manage/analytics -> מקורות וגוגל -> מקורות תנועה, the
-- "ישיר - הקלדה או שמירה" row should open like the Google Ads and organic rows
-- and show which page direct visitors landed on.
--
-- manage_site_behavior already computes each session's landing page and group
-- (att_grp / att_det), but att_det set detail = null for direct sessions and
-- 'source_landings' keeps only rows with a detail, so direct was dropped.
-- This gives direct sessions the detail 'direct'; nothing else changes.
-- att_det feeds only 'source_landings' (checked on the live definition), so no
-- other number on the page moves. Aggregated counts per page only.
--
-- Patched in place from the live definition; the replacement must match
-- exactly once or the block aborts and nothing changes. Safe to re-run.

do $patch$
declare
  d   text;
  n   int;
  fn  text := 'public.manage_site_behavior(integer)';
  o   text := $o$when g.grp = 'direct' then null$o$;
  r   text := $n$when g.grp = 'direct' then 'direct'$n$;
begin
  d := pg_get_functiondef(fn::regprocedure);
  if position(r in d) > 0 then
    raise notice '% already patched, skipped', fn;
    return;
  end if;
  n := (length(d) - length(replace(d, o, ''))) / length(o);
  if n <> 1 then
    raise exception '% : expected 1 match, found % for [%]', fn, n, o;
  end if;
  execute replace(d, o, r);
  raise notice '% patched', fn;
end
$patch$;
