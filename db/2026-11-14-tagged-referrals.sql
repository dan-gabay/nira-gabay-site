-- A tagged visit is never a direct visit.
--
-- Found 14 Nov 2026: Dan clicked Nira's profile link on hebpsy.net (פסיכולוגיה
-- עברית) and /manage/analytics filed the visit under "ישיר - הקלדה או שמירה".
-- site_events had recorded it correctly - utm_source = 'hebpsy', utm_medium =
-- 'directory' - but no referrer_host: the browser sent none (a link opened in a
-- new incognito tab, copied, or opened from an app carries no referrer; hebpsy
-- itself does pass one, checked the same night). The traffic grouping in three
-- functions decided "direct" from the referrer alone, so the tag was ignored.
--
-- The rule now: a session is direct only when it has neither a utm_source nor
-- a referrer from another site. Concretely, in manage_analytics,
-- manage_site_behavior and manage_enquiry_log:
--
--   1. utm_source / utm_medium of a social network -> 'social' even without a
--      referrer (facebook, fb, instagram, ig, linkedin, tiktok, whatsapp, or
--      utm_medium = social).
--   2. 'direct' requires utm_source is null. A tagged session that is not paid,
--      AI, social or search falls to 'referral'.
--   3. The detail of a 'referral' row is utm_source first, the host second, so
--      a directory's tagged visits group under one name whether or not the
--      browser also sent the host (the dashboard maps both spellings to one
--      Hebrew name, lib/sourceNames.ts).
--
-- No table, column or index changes: the functions are patched in place from
-- their live definitions, and each replacement must match exactly once or the
-- whole block aborts and nothing changes. Safe to re-run: a function already
-- patched is skipped. Return shapes are unchanged.

do $patch$
declare
  d    text;
  n    int;
  fn   text;
  reps text[][];
  i    int;
begin
  ---------------------------------------------------------------------------
  -- manage_analytics (alias c. in `bucketed`)
  ---------------------------------------------------------------------------
  fn := 'public.manage_analytics(integer)';
  d  := pg_get_functiondef(fn::regprocedure);
  if position('c.utm_source is null and (c.referrer_host is null' in d) > 0 then
    raise notice '% already patched, skipped', fn;
  else
    reps := array[
      array[
        $o$when c.referrer_host ~* '(^|\.)(facebook\.com|instagram\.com|fb\.me|t\.co|linkedin\.com|tiktok\.com|whatsapp\.com|wa\.me)$' then 'social'$o$,
        $n$when lower(coalesce(c.utm_source,'')) in ('facebook','fb','instagram','ig','linkedin','tiktok','whatsapp')
          or lower(coalesce(c.utm_medium,'')) = 'social' then 'social'
        when c.referrer_host ~* '(^|\.)(facebook\.com|instagram\.com|fb\.me|t\.co|linkedin\.com|tiktok\.com|whatsapp\.com|wa\.me)$' then 'social'$n$
      ],
      array[
        $o$when c.referrer_host is null or c.referrer_host ~* 'niragabay\.com' then 'direct'$o$,
        $n$when c.utm_source is null and (c.referrer_host is null or c.referrer_host ~* 'niragabay\.com') then 'direct'$n$
      ],
      array[
        $o$else coalesce(referrer_host, 'לא ידוע')$o$,
        $n$when grp = 'referral'    then coalesce(utm_source, referrer_host, 'לא ידוע')
                 else coalesce(referrer_host, utm_source, 'לא ידוע')$n$
      ]
    ];
    for i in 1 .. array_length(reps, 1) loop
      n := (length(d) - length(replace(d, reps[i][1], ''))) / length(reps[i][1]);
      if n <> 1 then
        raise exception '% : expected 1 match, found % for [%]', fn, n, reps[i][1];
      end if;
      d := replace(d, reps[i][1], reps[i][2]);
    end loop;
    execute d;
    raise notice '% patched', fn;
  end if;

  ---------------------------------------------------------------------------
  -- manage_site_behavior (alias a. in `att_grp`, g. in `att_det`)
  ---------------------------------------------------------------------------
  fn := 'public.manage_site_behavior(integer)';
  d  := pg_get_functiondef(fn::regprocedure);
  if position('a.utm_source is null and (a.referrer_host is null' in d) > 0 then
    raise notice '% already patched, skipped', fn;
  else
    reps := array[
      array[
        $o$when a.referrer_host ~* '(^|\.)(facebook\.com|instagram\.com|fb\.me|t\.co|linkedin\.com|tiktok\.com|whatsapp\.com|wa\.me)$' then 'social'$o$,
        $n$when lower(coalesce(a.utm_source,'')) in ('facebook','fb','instagram','ig','linkedin','tiktok','whatsapp')
          or lower(coalesce(a.utm_medium,'')) = 'social' then 'social'
        when a.referrer_host ~* '(^|\.)(facebook\.com|instagram\.com|fb\.me|t\.co|linkedin\.com|tiktok\.com|whatsapp\.com|wa\.me)$' then 'social'$n$
      ],
      array[
        $o$when a.referrer_host is null or a.referrer_host ~* 'niragabay\.com' then 'direct'$o$,
        $n$when a.utm_source is null and (a.referrer_host is null or a.referrer_host ~* 'niragabay\.com') then 'direct'$n$
      ],
      array[
        $o$-- the referring host first, as the traffic list names it$o$,
        $n$-- a referral by its tag first, so tagged visits group under one name
        when g.grp = 'referral' then coalesce(g.utm_source, g.referrer_host)
        -- the referring host first, as the traffic list names it$n$
      ]
    ];
    for i in 1 .. array_length(reps, 1) loop
      n := (length(d) - length(replace(d, reps[i][1], ''))) / length(reps[i][1]);
      if n <> 1 then
        raise exception '% : expected 1 match, found % for [%]', fn, n, reps[i][1];
      end if;
      d := replace(d, reps[i][1], reps[i][2]);
    end loop;
    execute d;
    raise notice '% patched', fn;
  end if;

  ---------------------------------------------------------------------------
  -- manage_enquiry_log (alias s. in `grouped`; its detail is already
  -- coalesce(utm_source, referrer_host))
  ---------------------------------------------------------------------------
  fn := 'public.manage_enquiry_log(integer)';
  d  := pg_get_functiondef(fn::regprocedure);
  if position('s.utm_source is null and (s.referrer_host is null' in d) > 0 then
    raise notice '% already patched, skipped', fn;
  else
    reps := array[
      array[
        $o$when s.referrer_host ~* '(^|\.)(facebook\.com|instagram\.com|fb\.me|t\.co|linkedin\.com|tiktok\.com|whatsapp\.com|wa\.me)$' then 'social'$o$,
        $n$when lower(coalesce(s.utm_source,'')) in ('facebook','fb','instagram','ig','linkedin','tiktok','whatsapp')
          or lower(coalesce(s.utm_medium,'')) = 'social' then 'social'
        when s.referrer_host ~* '(^|\.)(facebook\.com|instagram\.com|fb\.me|t\.co|linkedin\.com|tiktok\.com|whatsapp\.com|wa\.me)$' then 'social'$n$
      ],
      array[
        $o$when s.referrer_host is null or s.referrer_host ~* 'niragabay\.com' then 'direct'$o$,
        $n$when s.utm_source is null and (s.referrer_host is null or s.referrer_host ~* 'niragabay\.com') then 'direct'$n$
      ]
    ];
    for i in 1 .. array_length(reps, 1) loop
      n := (length(d) - length(replace(d, reps[i][1], ''))) / length(reps[i][1]);
      if n <> 1 then
        raise exception '% : expected 1 match, found % for [%]', fn, n, reps[i][1];
      end if;
      d := replace(d, reps[i][1], reps[i][2]);
    end loop;
    execute d;
    raise notice '% patched', fn;
  end if;
end
$patch$;
