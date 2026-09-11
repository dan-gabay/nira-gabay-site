-- Restore blank-line paragraph breaks in article bodies.
--
-- This is the SQL that was actually executed against production on 2026-09-11.
-- It is the exact transform scripts/fix-paragraph-breaks.ts performs, run
-- through SQL because the container had no network route to the Supabase host
-- (the egress proxy answers 403 to CONNECT for the project host). The script
-- remains the canonical, repeatable tool; this file is the record of the two
-- runs and of the gates they were held to.
--
-- The two engines were not assumed to agree, they were shown to. The row for
-- ocd-teens-parents-cbt-treatment was written by the statement below, read
-- back, and md5-verified (8ec750696d62ceaf7697a519bf0f77b3); feeding its
-- inverse through lib/seo/paragraphBreaks.ts normalizeParagraphBreaks()
-- reproduced the written row byte for byte. The simple regex here is
-- equivalent to the module's line-by-line rule on exactly these rows because
-- the `lb_lines = 0` gate proves no list, blockquote, table, indented or
-- fenced line exists in the document at all, which is the only case where the
-- module's exclusions would bite.
--
-- THE PROBLEM. 15 published articles stored a single newline between
-- paragraphs. app/articles/[slug]/page.tsx renders the body with
-- `remarkPlugins={[remarkBreaks]}`, which turns a soft line break into a <br>
-- INSIDE the current <p> rather than starting a new one. So:
--
--   1. app/globals.css `.prose p { margin: 0.875rem 0 }` (1rem at md) applied
--      once per section, not once per paragraph. The gap at a paragraph
--      boundary was 28.8px where it should be 42.8px (36px vs 52px at md).
--   2. A whole section reached any extractor as a single <p>. Measured on the
--      real render, ocd-teens-parents-cbt-treatment went from 15 <p> holding
--      29 <br> with a longest <p> of 1,268 characters, to 45 <p> with 0 <br>
--      and a longest of 313.
--
-- WHAT WAS DELIBERATELY LEFT ALONE.
--
--   - parents-kids-report-cards. Its 12 single newlines are not prose
--     boundaries, they are runs of example sentences under a colon lead-in
--     ("כדאי להשתמש במשפטים מעודדים, לדוגמה:" and three more). Those are
--     lists written without list markers; giving each a full paragraph margin
--     is a visible change and not an improvement. Owner decision, 2026-09-11.
--   - holiday-meal-family-dynamics, talking-to-children-current-events and
--     parenting-without-boundaries-spoiled-children. Every single newline in
--     those three sits between two `- ` list items, where a blank line would
--     turn a tight list into a loose one. The `lb_lines = 0` gate excludes
--     them without needing a slug list.
--   - Every `---` boundary. All 15 targets end with a thematic rule, and the
--     only two blank lines each document had were the ones flanking it. That
--     is why `blanks = 2` identified them. It also matters directly: `text\n---`
--     is a setext <h2>, not text followed by an <hr>, so opening that boundary
--     would change the document. No gate had to special-case it because the
--     rule line is already blank-separated on both sides.
--
-- depression-cycle-parenting was included although it was not in the original
-- list of 15: all 4 of its single newlines are heading-to-text boundaries, so
-- the write is pure canonicalisation with no rendered change at all.

-- Run 1 (review row). Run 2 was identical with the slug predicate replaced by
-- `slug <> 'parents-kids-report-cards'`, after the rendered before/after was
-- reviewed and approved.
with cand as (
  select id, slug, content,
         regexp_replace(content, '([^\n])(?=\n[^\n])', E'\\1\n', 'g') as aft
  from articles
  where coalesce(status,'') not in ('superseded','redirected')
    and content is not null
    and slug <> 'parents-kids-report-cards'
), safe as (
  select * from cand
  where aft <> content
    -- Every non-empty line byte-identical and in the same order. One equality
    -- that subsumes both write gates in the script: textUnchanged cannot see a
    -- heading that stopped being one (whitespace collapse hides it), and
    -- headingsUnchanged cannot see a dropped word. This sees both.
    and array_remove(string_to_array(content, E'\n'), '')
      = array_remove(string_to_array(aft, E'\n'), '')
    -- The only edit is one inserted newline per adjacent non-blank pair.
    and length(aft) - length(content) = regexp_count(content, '[^\n](?=\n[^\n])')
    -- Idempotent: no adjacent pair survives, so a second run is a no-op.
    and regexp_count(aft, '[^\n](?=\n[^\n])') = 0
    -- No line anywhere whose own line break is load-bearing. This is what makes
    -- the regex above equivalent to the module's per-line rule.
    and regexp_count(content, '(^|\n)( {0,3}([-*+]|[0-9]{1,9}[.)])[[:space:]]|'
                           || ' {0,3}>| {0,3}\||\t| {4,}| {0,3}<[a-zA-Z!/?]| {0,3}(```|~~~))', 1, 'n') = 0
    -- Reversible. Either the rule-flanked shape (collapse every blank line,
    -- then restore the two around the `---`), or, for a document whose only
    -- opened boundaries were heading-to-text, drop the blank after each
    -- heading. One of the two must reproduce the stored row exactly.
    and (
      regexp_replace(regexp_replace(aft, E'\n\n', E'\n', 'g'), E'\n---\n', E'\n\n---\n\n', 'g') = content
      or regexp_replace(aft, '(^|\n)(#{1,6} [^\n]*)\n\n', '\1\2' || E'\n', 'g') = content
    )
)
update articles a set content = s.aft from safe s where a.id = s.id
returning a.slug, a.is_published,
          regexp_count(a.content, '\n\n') as blanks,
          regexp_count(a.content, '[^\n](?=\n[^\n])') as pairs_left,
          a.updated_date;

-- 16 rows written across the two runs, all is_published = true. `content` is
-- the only column the statement assigns, and public.articles has no triggers,
-- so updated_date did not move on any row (verified: all still 2026-08-22).
--
-- Post-write state across the 35 published articles:
--   published articles                                       35
--   with fewer "\n\n" than "## "                              0
--   still carrying a single newline between non-blank lines    4
--     (parents-kids-report-cards plus the three list articles, all deliberate)
--   with a body `# `                                          0  (2026-09-08 holds)
--   longest rendered <p> anywhere                           631
--     depression-cycle-parenting, unchanged by this migration - one genuinely
--     long prose paragraph written as a single line, not a missing break.
--   every other published article                          <= 600
