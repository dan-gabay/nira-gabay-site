-- Demote markdown H1 headings (`# `) to H2 (`## `) in article bodies.
--
-- This is the SQL that was actually executed against production on 2026-09-08.
-- It is the exact transform scripts/fix-content-heading-levels.ts performs, run
-- through SQL because the container that ran the migration had no network route
-- to the Supabase host. The script remains the canonical, repeatable tool; this
-- file is the record of the one run, and of the checks it was gated on.
--
-- Why the change is invisible to a reader: app/articles/[slug]/page.tsx renders
-- the body under `components={{ h1: 'h2' }}`, so a stored `# ` already reached
-- the page as an <h2>. Both `# ` and `## ` therefore emit the same element with
-- the same .prose h2 styling. The DOM is unchanged, not merely similar.
--
-- Why it was worth doing anyway - two surfaces have no such remap:
--
--   1. lib/agent/markdown.ts articleMarkdown() emits `# {title}` and then
--      concatenates article.content untouched. That is the Markdown served to
--      OAI-SearchBot and PerplexityBot and at /api/md/*, so every body `# ` sat
--      at the same level as the article title. parents-kids-depression shipped
--      ten H1s in one document.
--   2. splitAtThirdH2() in app/articles/[slug]/page.tsx searches for the
--      literal "\n## " to place the in-body "מומלץ לקרוא גם" aside. An article
--      whose sections were all `# ` never reached three matches and silently
--      lost its contextual internal links. Three articles were in that state.
--
-- lib/seo/validate.ts has flagged this all along as the `content_has_h1` warn
-- ("מומרות ל-H2 בתצוגה, אך עדיף לתקן במקור"). This is that fix.
--
-- The `safe` CTE is the gate, and it is what makes the write reviewable. A row
-- is only updated when all five hold:
--
--   * no fenced code blocks, so a `#` comment can never be read as a heading
--     (this also makes the SQL transform provably identical to the script's
--     fence-aware one, since the fence branch is unreachable);
--   * the length grows by exactly the number of `^# ` lines, so every heading
--     that matched gained exactly one '#' and nothing else moved;
--   * no `^# ` survives;
--   * the count of rendered H2s (`#` and `##` both render as h2) is unchanged;
--   * stripping every heading marker leaves both texts byte-identical, so no
--     heading was dropped, reordered, retitled, or pushed down to H3.
--
-- Result: 19 rows, all published, zero refused. Three of them
-- (parents-kids-report-cards, parents-kids-depression,
-- emotional-disorders-in-adolescence-guide-for-parents) gained the in-body
-- aside. An md5 fingerprint over is_published, status, updated_date,
-- meta_title, meta_description, image_url, faq, schema_json, internal_links and
-- seo_score across all 42 rows was identical before and after, confirming that
-- only `content` changed. public.articles carries no triggers, so updated_date
-- did not move and sitemap lastmod values are untouched.
--
-- Still outstanding: scripts/rescore-published.ts --apply, to refresh
-- seo_score and the stored seo_package findings. It needs the TypeScript
-- validator and so cannot be expressed here.

with cand as (
  select id, content,
         regexp_replace(content, '^# ( *[^[:space:]])', '## \1', 'gn') as aft
  from articles
  where coalesce(status,'') not in ('superseded','redirected')
    and content is not null
    and regexp_count(content, '^# ', 1, 'n') > 0
),
safe as (
  select * from cand
  where regexp_count(content,'^[[:space:]]*(```|~~~)',1,'n') = 0
    and length(aft) - length(content) = regexp_count(content,'^# ',1,'n')
    and regexp_count(aft,'^# ',1,'n') = 0
    and regexp_count(content,'^#{1,2} ',1,'n') = regexp_count(aft,'^#{1,2} ',1,'n')
    and regexp_replace(content,'^#+ ','','gn') = regexp_replace(aft,'^#+ ','','gn')
)
update articles a
set content = s.aft
from safe s
where a.id = s.id
returning a.slug, a.is_published, regexp_count(a.content,'^# ',1,'n') as h1_left;
