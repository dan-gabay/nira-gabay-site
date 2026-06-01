# Supabase Draft Insert

## What this phase does

`scripts/prepare-supabase-article-draft.ts` is Phase 4 of the article import pipeline.

It reads `data/article-ai-optimized-candidate.json` (output of Phase 3) and produces `data/supabase-article-draft-payload.json` containing:

1. `article_row_payload` - the exact row ready for insertion into `public.articles`, with only columns that exist in the table
2. `private_import_metadata` - SEO, image strategy, migration, and source metadata kept out of the public table
3. `quality` - validation results with all field-level checks
4. `prepared_at` - ISO timestamp

A UUID is generated for `id` on each run. The payload is not inserted until explicitly requested.

---

## What this phase does NOT do

- Does not insert into `public.articles`
- Does not update `article_import_queue`
- Does not publish anything
- Does not delete anything
- Does not change `is_published` to true
- Does not generate or fetch images
- Does not expose old source URLs in the article row
- Does not include SEO or canonical URL fields in the article row (not in schema)

---

## Why it is still local-only

The `public.articles` insert is a write to production that cannot be undone easily. This phase exists to:

- Confirm the exact row shape before touching the database
- Allow human review of the payload
- Validate schema compliance without needing a database connection
- Separate image generation (Phase 5) from the insert (Phase 6) cleanly

---

## How to run

```bash
# Run all prior phases first if not already done
npm run extract:source-article
npm run prepare:article-candidate
# (Phase 3 AI optimization is currently manual)

# Then run Phase 4
npm run prepare:supabase-draft
```

---

## Input

`data/article-ai-optimized-candidate.json`

Produced by the Phase 3 AI editorial optimization step.

The script also accepts `article_candidate` (Phase 2 output) as a fallback if the optimized file uses that key name.

---

## Output

`data/supabase-article-draft-payload.json`

---

## Field mapping: optimized candidate to articles table

| `article_row_payload` field | Source in candidate | Notes |
|---|---|---|
| `id` | Generated | `crypto.randomUUID()` - new UUID per run |
| `title` | `article_candidate.title` | Original Hebrew title |
| `slug` | `article_candidate.slug` | ASCII-only, hyphenated, set in Phase 2 |
| `content` | `article_candidate.content` | Phase 3 cleaned HTML with H2 headings |
| `excerpt` | `article_candidate.excerpt` | Phase 3 improved reader-facing excerpt |
| `image_url` | Hardcoded `null` | Image not yet generated |
| `reading_time` | `article_candidate.reading_time` | Minutes, integer |
| `likes_count` | Hardcoded `0` | New article starts at zero |
| `views_count` | Hardcoded `0` | New article starts at zero |
| `tags` | `article_candidate.tags` | Comma-separated Hebrew tag string |
| `is_published` | Hardcoded `false` | Must be reviewed before publishing |
| `created_date` | `isoNow()` | ISO timestamp at payload preparation time |
| `updated_date` | `isoNow()` | Same as created_date at this stage |
| `created_by_id` | Hardcoded `null` | No authenticated user during import |
| `created_by` | `"article_import_agent"` | Machine provenance marker |
| `is_sample` | Hardcoded `false` | This is a real article, not sample content |

---

## Fields intentionally excluded from article_row_payload

These fields exist in the candidate JSON but are NOT columns in `public.articles` and are kept in `private_import_metadata` only:

| Field | Reason excluded |
|---|---|
| `seo.canonical_url` | Not a column in `public.articles` |
| `seo.seo_title` | Not a column in `public.articles` |
| `seo.meta_description` | Not a column in `public.articles` |
| `seo.og_title` / `og_description` | Not a column in `public.articles` |
| `seo.focus_keywords` | Not a column in `public.articles` |
| `image_strategy.*` | Not a column - used for image generation only |
| `structured_data_candidate.*` | Not a column - injected at app render time |
| `internal_linking.*` | Not a column - resolved when real URLs exist |
| `source.source_url_private` | Not public - stored in `private_import_metadata` |
| `migration.*` | Not public - internal pipeline tracking |

---

## Schema validation

The script validates `article_row_payload` against a hardcoded `ARTICLES_SCHEMA_COLUMNS` set that reflects the actual `public.articles` columns:

```
id, title, slug, content, excerpt, image_url, reading_time,
likes_count, views_count, tags, is_published, created_date,
updated_date, created_by_id, created_by, is_sample
```

Any field present in the payload but missing from this set triggers a warning. Any column in this set but missing from the payload also triggers a warning.

---

## Quality checks

All of the following are verified before the file is written:

| Check | Expected |
|---|---|
| `matches_articles_schema` | true |
| `is_published_false` | true |
| `image_url_null_until_generation` | true |
| `old_source_url_publicly_exposed` | false |
| `contains_em_dash` | false |
| `slug_is_ascii_hyphenated` | true |
| `title_non_empty` | true |
| `excerpt_non_empty` | true |
| `content_non_empty` | true |
| `all_required_fields_present` | true |
| `warnings` | [] |

---

## Next phase options

### Option A - Generate the article image (recommended next)

Use `private_import_metadata.image_strategy.image_prompt` to generate the article image:
- Call an image generation API (e.g., DALL-E, Midjourney, Flux)
- Upload the result to Vercel Blob
- Update `article_row_payload.image_url` with the Blob URL
- Re-run this script (or write a Phase 5 script) to produce a final payload with a real `image_url`

### Option B - Insert as unpublished draft now (image_url = null)

Insert the current `article_row_payload` directly into `public.articles` with `image_url: null` and `is_published: false`. This creates a reviewable draft in the CMS. The image can be added later via an update.

### Option C - Manual review workflow

Open `data/supabase-article-draft-payload.json` in a text editor or review tool. Confirm all fields. Then authorize the insert manually or run a separate `insert-article-draft.ts` script that reads this file and performs the Supabase insert.

---

## Safety notes

- `id` is regenerated each time the script runs. If you run it twice and insert both, you get two rows. Always insert from a single reviewed payload.
- `is_published: false` is hardcoded in the script and cannot be changed without editing the source.
- The old source URL (`m-y-net.co.il`) is scanned for in all `article_row_payload` fields - any match raises a warning and blocks the clean result.
- `private_import_metadata.source_url_private` stores the old URL for internal reference only. It is never written to `public.articles`.
