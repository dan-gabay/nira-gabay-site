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
9. Report results table: queue_id, source_title, article_id, slug, is_published, image_url, image_prompt_saved, queue_status, error

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
- Articles insert: 16 public columns only (no SEO/migration fields)
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

## Published articles (do not modify)

- `id`: `08179042-70f6-4f60-a6ab-de388d729a10`
- `slug`: `birth-order-family-dynamics`
- Do not re-insert, do not change `is_published`, do not change content
