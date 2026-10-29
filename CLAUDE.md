# Claude Code Instructions - niragabay.com

## Project overview

Next.js 16 + Supabase site for Nira Gabay, a licensed therapist. The site has a public article section and a `/manage` admin area. Articles are imported from an old source site via a batch pipeline.

---

## Model selection rule

### For coding, validation, ops, and orchestration

Use the current/default model (Sonnet is fine) for:
- Coding and script changes
- Supabase schema operations and SQL
- Pipeline orchestration and dry-runs
- Queue handling and status updates
- UI changes in `/manage`
- Documentation updates
- TypeScript / build checks

### For actual article writing - use Opus automatically

**Automatically switch to Opus (or the strongest available writing/reasoning model) for:**
- Substantial Hebrew editorial rewrite
- Duplicate-content-risk reduction
- Restructuring Hebrew articles for the web
- Writing SEO titles and meta descriptions
- Preserving Nira Gabay's warm, professional, therapeutic voice
- Any step that produces the final article content

**Do not stop and ask the user to switch models.** Switch automatically when Claude Code supports it during the session.

**Only stop and ask the user if:**
- Claude Code cannot switch models automatically in this context
- The current model is clearly not suitable for substantial Hebrew writing
- Running the rewrite on a weaker model would require explicit approval

The goal: the user says "run" and Claude Code handles the entire flow, including switching to the right model for the rewrite step.

---

## Article import flow (when user says "run")

1. Run dry-run: `npm.cmd run run:article-import-pipeline -- --limit 5`
2. Check for slug collisions - fix automatically if safe (no inserts needed, just slug map updates)
3. If collisions remain after safe fixes, report and stop
4. Switch to Opus for the rewrite stage
5. Extract source content via the pipeline
6. Perform substantial editorial rewrite directly as Claude Code (not via external API)
7. Save rewrite to `data/rewrite-source.json` keyed by `queue_id`
8. Run actual batch: `npm.cmd run run:article-import-pipeline -- --limit 5 --insert --mark-queue --skip-images --rewrite-source data/rewrite-source.json`
   - The pipeline now auto-generates AND validates a full SEO package before each insert (see "SEO generation + validation" below). Inserts are blocked on hard SEO errors unless `--continue-on-error` or `--skip-seo-validation` is passed.
9. Report results table: queue_id, source_title, article_id, slug, is_published, seo_score, seo_ok, image_prompt_saved, queue_status, error

---

## Safety rules (always enforced)

- Never set `is_published = true` automatically
- Always keep `image_url = null` for newly imported articles
- Never expose old source URLs (m-y-net.co.il) in public article fields
- Never use raw Hebrew slugs - always ASCII lowercase hyphenated
- Never use the em dash character (—) - use a regular hyphen (-)
- Never print secrets or env var values
- Always use `.env.local` for Supabase credentials
- Default to dry-run unless `--insert` is explicitly passed
- Never insert unless the dry-run was reviewed first
- Queue is marked `draft_created` only after BOTH article insert AND metadata insert succeed

---

## Growth work (Nira Growth project)

Growth strategy, backlog and verified tool access live outside the repo, in
the project's shared files (`/mnt/project-files/nira-growth/`:
`growth-operating-system.md`, `capability-matrix.md`,
`optimization-backlog.md`, `change-log.md`). When working on SEO, tracking,
landing pages or contact flows, read them if available, and reference the
backlog ID (B-xx) in the PR.

Rules for growth-related code:
- Success is new paying clients, not traffic or reported conversions.
  Paying clients are tracked separately from qualified enquiries,
  conversations (`spoke`) and raw conversion events.
- Do not add the clinic's street address or a navigation/maps link to any
  page or schema (owner decision; see `lib/clinic.ts` `streetAddress`).
- CBT is a real service: never remove or de-emphasize CBT pages or copy for
  ad or SEO reasons.
- No invented credentials, testimonials, studies, statistics or guaranteed
  outcomes in copy, schema or FAQ.
- Never send identifying enquiry data (name, phone, email, message) to
  Google Ads, GA4 or any third party. Offline conversion work may use only
  gclid and conversion name, with Dan's approval.
- Never build automated review requests or anything that reveals who is a
  client; psychotherapy reviews are Nira's personal choice.
- Google Ads access is read-only: account changes are listed for Dan, never
  automated.

---

## Hallmark design skill

`.claude/skills/hallmark/` is the Hallmark design skill (Nutlope/hallmark v2.0.0, MIT, vendored at commit 4f6a46c). It runs only when Hallmark is named, e.g. `/hallmark audit app/page.tsx` or `/hallmark redesign <path>`.

- On this site, Hallmark output is a proposal: the existing design, Hebrew RTL layout, contact paths and tracking stay unless Dan approves a change. Prefer `audit` first.
- All growth rules above still apply (no street address, no invented testimonials/stats, CBT stays).
- Do not run `scripts/imagegen.mjs` (needs a paid Together AI key) or `scripts/install-hook.mjs` (edits Claude settings) without Dan's approval.
- To update: copy `skills/hallmark` from the upstream repo over this folder in a PR.

---

## Key commands

```bash
# Dry-run (safe, no writes)
npm.cmd run run:article-import-pipeline -- --limit 5

# Actual batch (after dry-run passes)
npm.cmd run run:article-import-pipeline -- --limit 5 --insert --mark-queue --skip-images

# With pre-written Claude Code rewrites
npm.cmd run run:article-import-pipeline -- --limit 5 --insert --mark-queue --skip-images --rewrite-source data/rewrite-source.json

# Build check
npm.cmd run build

# Dev server
npm.cmd run dev
```

---

## Database

- Project ID: `tyrmguosxbmwykfnxcvk` (ap-southeast-2)
- Main tables: `public.articles`, `article_import_queue`, `article_draft_metadata`
- Articles insert: public columns + validated SEO columns (`meta_title`, `meta_description`, `focus_keyword`, `secondary_keywords`, `seo_score`, `canonical_url`, `faq`, `internal_links`, `schema_json`, `seo_package`, `status`, `imported_at`, `optimized_at`, `content_hash`). `source_url` is NEVER written to `articles` (old source URLs stay out of the public table).
- Image prompts: stored in `article_draft_metadata`, shown in `/manage/articles/edit/[id]`

---

## Rewrite requirements

Every imported article must receive a substantial editorial rewrite:
- Keep original topic and core ideas
- Preserve Nira Gabay's warm, professional, human, sensitive voice
- New original introduction and closing paragraph
- Rewritten H2 headings
- Paragraph-level fresh language (not sentence-by-sentence paraphrase)
- No invented facts, credentials, studies, or statistics
- Hebrew only - no external links

Target duplicate-content-risk profile:
```json
{
  "risk_level": "low",
  "rewrite_depth": "substantial",
  "new_intro_added": true,
  "new_closing_added": true,
  "headings_rewritten": true,
  "sentence_by_sentence_paraphrase": false
}
```

---

## SEO generation + validation

The conversion flow generates and validates all SEO fields before saving, via `lib/seo/`:

- `lib/seo/generate.ts` - `buildSeoPackage()` produces: `seo_title`/`meta_title`, `meta_description`, `slug`, `excerpt`, `tags`, `focus_keyword`, `secondary_keywords`, `image_prompt`, `image_alt`, `og_title`, `og_description`, `faq_json` (from question-style headings + their own text, never fabricated), `schema_json` (BlogPosting), `internal_links` (from existing articles by shared tags + title overlap), `canonical_url`.
- `lib/seo/validate.ts` - `validateSeoPackage()` checks title/description lengths, H1/H2 structure, Hebrew RTL readability, cannibalization vs existing articles, internal-link opportunities, image-alt quality, schema validity, E-E-A-T depth, GEO/AI readiness. Returns findings (`error`/`warn`/`info`), a 0-100 `seo_score`, and content metrics.
- `lib/seo/htmlToMarkdown.ts` - rewrite HTML (`<h2>`/`<p>`) is converted to Markdown before saving so it renders (the article page uses react-markdown) and its heading structure is real.
- Pipeline integration: after the rewrite, the pipeline generates + validates, blocks insert on any `error` finding (override with `--continue-on-error` or `--skip-seo-validation`), and maps the package onto the article SEO columns (full package + report stored in `seo_package` jsonb).
- Rendering: `app/articles/[slug]/page.tsx` prefers `meta_title` / `meta_description` / `canonical_url` / `schema_json` / `faq`, with fallbacks for pre-pipeline articles. The `/manage` edit page shows the SEO score, findings, internal-link suggestions, and editable `meta_title` / `meta_description` / `focus_keyword`.
- Sitemap (`app/sitemap.ts`, `app/sitemap-images.xml`) and robots only include `is_published = true` articles.

Flags: `--skip-seo-validation` (bypass the SEO gate), `--continue-on-error` (record errors, do not stop the batch).

---

## Consolidated articles (do not republish)

- `slug`: `birth-order-family-dynamics` (`id`: `08179042-70f6-4f60-a6ab-de388d729a10`)
- Owner-approved consolidation (2026-07-07, SEO audit P1-8): unpublished with
  `status = 'redirected'`; its URL 301s to
  `/articles/family-birth-order-meaning-and-impact` (see `next.config.ts`).
- Do not republish, do not remove the redirect, do not reuse the slug.
