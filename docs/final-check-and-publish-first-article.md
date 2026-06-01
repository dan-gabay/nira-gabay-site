# Final Check and Publish - First Article

## What this phase does

`scripts/final-check-and-publish-first-article.ts` runs a complete final validation of the first imported draft across all local artifacts and Supabase, then publishes the article only if every required check passes.

It is scoped to exactly one article:
- `id`: `08179042-70f6-4f60-a6ab-de388d729a10`
- `slug`: `birth-order-family-dynamics`
- `url`: `https://www.niragabay.com/articles/birth-order-family-dynamics`

---

## What this phase does NOT do

- Does not generate images
- Does not upload images
- Does not update `image_url`
- Does not update `article_import_queue`
- Does not change title, slug, content, excerpt, or tags
- Does not publish if any required check fails
- Does not re-publish if already published (idempotent)
- Does not print secrets or env var values

---

## Dry-run vs `--publish`

### Default dry-run

```bash
npm run final:check-and-publish
```

- Queries Supabase by id and slug
- Runs all checks against the live row and local artifacts
- Prints a detailed readiness report
- Writes `data/final-check-and-publish-result.json` with `mode: "dry_run"`
- Makes **no Supabase writes**

### Publish mode

```bash
npm run final:check-and-publish -- --publish
```

- Runs all checks first
- If any required check fails: exits with error, does not publish
- If already published: reports 'already_published', exits cleanly (idempotent)
- If all required checks pass and article is unpublished: updates `is_published = true` and `updated_date`
- Re-reads the row to verify the update
- Writes result with `mode: "publish"` and `status: "published"`

---

## Why image_url is allowed to remain null for this first publish

The image generation pipeline (Phase 6) requires the OpenAI billing limit to be resolved. The article content, title, and SEO fields are complete. Publishing without a hero image is acceptable for the first article because:

- The article page handles `image_url: null` gracefully (no image section rendered)
- The article is fully readable without an image
- An image can be generated, uploaded, and attached to the published article later via a SQL UPDATE

This is a deliberate decoupling: content goes live first, image follows later.

---

## What fields are updated on publish

Only two fields are written:

| Field | Value |
|---|---|
| `is_published` | `true` |
| `updated_date` | Current ISO timestamp |

The update is double-gated: `.eq('id', ARTICLE_ID).eq('slug', ARTICLE_SLUG).eq('is_published', false)` - so it will only affect a row that is:
- The exact expected article (by id AND slug)
- Currently unpublished (prevents double-writes)

---

## Required checks

All of the following must pass before `--publish` proceeds:

| Check | Description |
|---|---|
| `supabase_row_exists` | A row with this id exists in `public.articles` |
| `single_row` | Exactly one row (no duplicates) |
| `id_matches` | Row id equals expected `08179042-70f6-4f60-a6ab-de388d729a10` |
| `slug_matches` | Row slug equals `birth-order-family-dynamics` |
| `title_present` | Title is non-empty |
| `content_present` | Content is non-empty |
| `excerpt_present` | Excerpt is non-empty |
| `old_source_url_not_public` | `m-y-net.co.il` does not appear in any public field |
| `no_editor_helper_text` | `תומך ב-Markdown` or similar does not appear |
| `no_em_dash` | Em dash character `—` does not appear in any public field |
| `slug_is_valid` | Slug matches `/^[a-z0-9]+(-[a-z0-9]+)*$/` |
| `canonical_url_is_niragabay` | Local canonical URL points to `https://www.niragabay.com/articles/birth-order-family-dynamics` |
| `duplicate_content_risk_low` | All five sub-checks pass in local AI candidate |
| `payload_id_matches` | Local draft payload id matches inserted id |
| `payload_slug_matches` | Local draft payload slug matches inserted slug |

### Duplicate content risk sub-checks

From `data/article-ai-optimized-candidate.json > duplicate_content_risk`:

| Sub-check | Required value |
|---|---|
| `risk_level` | `"low"` |
| `rewrite_depth` | `"substantial"` |
| `new_intro_added` | `true` |
| `new_closing_added` | `true` |
| `headings_rewritten` | `true` |
| `sentence_by_sentence_paraphrase` | `false` |

### Informational checks (non-blocking)

| Check | Description |
|---|---|
| `payload_matches_db` | Local payload content equals DB content. Article may have been edited in the dashboard after insert - difference is a warning, not a blocker. |
| `image_url` | `null` is allowed. A valid `https://` URL is also accepted. |
| `likes_count`, `views_count` | Must be non-negative numbers. Failure is a warning only. |

---

## Result JSON

`data/final-check-and-publish-result.json` is written after every run:

```json
{
  "mode": "dry_run",
  "status": "ready",
  "article_id": "08179042-70f6-4f60-a6ab-de388d729a10",
  "slug": "birth-order-family-dynamics",
  "title": "משמעות המיקום במערך המשפחתי",
  "public_url": "https://www.niragabay.com/articles/birth-order-family-dynamics",
  "is_published_before": false,
  "is_published_after": null,
  "image_url": null,
  "required_checks_passed": true,
  "checks": {
    "supabase_row_exists": true,
    "single_row": true,
    "id_matches": true,
    "slug_matches": true,
    "title_present": true,
    "content_present": true,
    "excerpt_present": true,
    "old_source_url_not_public": true,
    "no_editor_helper_text": true,
    "no_em_dash": true,
    "slug_is_valid": true,
    "canonical_url_is_niragabay": true,
    "duplicate_content_risk_low": true,
    "payload_id_matches": true,
    "payload_slug_matches": true,
    "payload_is_published_false": true,
    "payload_matches_db": true
  },
  "updated_fields": [],
  "published_at": null,
  "warnings": []
}
```

After a successful publish, `status` becomes `"published"`, `is_published_after` becomes `true`, `updated_fields` contains `["is_published", "updated_date"]`, and `published_at` is set.

---

## Already published behavior

If the article is already published (`is_published = true` in Supabase), the script:
- Reports `status: "already_published"`
- Does not attempt to update anything
- Exits cleanly (not an error)
- Writes the result with a warning: "Article is already published"

This makes the script idempotent - safe to re-run at any time.

---

## How to confirm the article is live

After a successful `--publish` run:

1. Visit `https://www.niragabay.com/articles/birth-order-family-dynamics` in a browser
2. Confirm the article page renders with:
   - The correct Hebrew title
   - The article content
   - The excerpt in the header
   - No placeholder images (image section is hidden when `image_url` is null)
3. Check `data/final-check-and-publish-result.json`:
   - `status: "published"`
   - `is_published_after: true`

---

## What the next phase is

After the first article is live:

1. **Attach a hero image** (when OpenAI billing is resolved):
   ```bash
   npm run generate:article-image -- --generate --upload --update-payload
   ```
   Then run a SQL UPDATE to set `image_url` on the live article.

2. **Process remaining pending articles as unpublished drafts**:
   ```bash
   npm run run:article-import-pipeline -- --insert --mark-queue
   ```
   This processes the next pending item from `article_import_queue` and inserts it as `is_published = false`.

3. **Review and publish each draft manually** via the Supabase dashboard, or build a `/final:check-and-publish` variant that accepts a slug argument to repeat this gate for each new article.

Publishing is always a manual, gated step - not automated by the import pipeline.
