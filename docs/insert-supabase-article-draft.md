# Supabase Article Draft Insert

## What this phase does

`scripts/insert-supabase-article-draft.ts` is Phase 7 of the article import pipeline.

It reads `data/supabase-article-draft-payload.json` (from Phase 4) and:
1. Validates the `article_row_payload` against the `public.articles` schema
2. Connects to Supabase and checks for duplicate slug and id
3. In dry-run mode: prints the plan and stops
4. In `--insert` mode: inserts exactly one row into `public.articles`, then verifies the insert

---

## What this phase does NOT do

- Does not insert in default mode (dry-run only)
- Does not publish the article (`is_published` stays `false`)
- Does not set `image_url` (stays `null`)
- Does not insert private metadata, SEO fields, or migration metadata into `public.articles`
- Does not update `article_import_queue`
- Does not delete anything
- Does not print credentials or env var values
- Does not insert if slug or id already exists

---

## Dry-run vs `--insert`

### Default dry-run

```bash
npm run insert:supabase-draft
```

- Reads and validates the payload
- Connects to Supabase to check for duplicate slug and id
- Prints what would be inserted
- Writes `data/supabase-article-draft-insert-result.json` with `mode: "dry_run"`
- Does not insert

### Insert mode

```bash
npm run insert:supabase-draft -- --insert --allow-null-image
```

- Runs all dry-run checks first
- If all checks pass: inserts the row
- Verifies the insert by re-reading the row
- Writes result JSON with `mode: "insert"` and `status: "inserted"`

---

## Optional flags

| Flag | Description |
|---|---|
| `--insert` | Perform the actual Supabase insert (required to insert) |
| `--allow-null-image` | Suppress the null image_url informational note |
| `--expected-slug <slug>` | Verify the slug matches before inserting (extra safety) |

Example with all safety flags:
```bash
npm run insert:supabase-draft -- --insert --allow-null-image --expected-slug birth-order-family-dynamics
```

---

## Why image_url is allowed to remain null

The image generation pipeline (Phase 6) may not have completed yet. Inserting with `image_url: null` creates a valid, reviewable draft row in `public.articles` that:
- Can be reviewed in the CMS
- Will not be visible to the public (`is_published: false`)
- Can have `image_url` updated later via a separate SQL UPDATE or Phase 6 re-run

This is a deliberate decoupling: article text goes into the database first, image follows later.

---

## Why is_published must remain false

The article has not been reviewed for publication. The pipeline is designed so that publishing is always a manual, intentional action. `is_published: false` is enforced at three points:
1. Hardcoded in Phase 4 (`prepare-supabase-article-draft.ts`)
2. Validated before insert in this script
3. Verified after insert by re-reading from Supabase

If `is_published` is not `false` at any of these checks, the script aborts.

---

## Duplicate slug and id checks

Before any insert, the script queries `public.articles` for:
- An existing row with the same `slug`
- An existing row with the same `id`

If either exists, the insert is blocked and the script exits with a descriptive error showing the existing record's `id`, `title`, and `slug`. This prevents accidental duplicate articles.

---

## Which fields are inserted into public.articles

Exactly the 16 columns in the `public.articles` schema:

| Column | Value | Source |
|---|---|---|
| `id` | UUID | Generated in Phase 4 |
| `title` | Hebrew title | From source article |
| `slug` | ASCII-hyphenated | Generated in Phase 2 |
| `content` | Clean HTML | Phase 3b rewrite |
| `excerpt` | Short Hebrew description | Phase 3b |
| `image_url` | `null` | Pending image generation |
| `reading_time` | Minutes | Estimated in Phase 1 |
| `likes_count` | `0` | New article default |
| `views_count` | `0` | New article default |
| `tags` | Comma-separated Hebrew tags | Phase 2 |
| `is_published` | `false` | Hardcoded safety |
| `created_date` | ISO timestamp | Set in Phase 4 |
| `updated_date` | ISO timestamp | Same as created_date |
| `created_by_id` | `null` | No authenticated user |
| `created_by` | `"article_import_agent"` | Machine provenance |
| `is_sample` | `false` | Real content |

---

## Which metadata is intentionally NOT inserted

These fields exist in `data/supabase-article-draft-payload.json` but are **not** inserted into `public.articles` because they are not columns in the table:

| Field | Why excluded |
|---|---|
| `private_import_metadata.queue_id` | Internal pipeline tracking |
| `private_import_metadata.source_url_private` | Old source URL - never public |
| `private_import_metadata.seo.*` | Not a column in public.articles |
| `private_import_metadata.image_strategy.*` | Used for image generation only |
| `private_import_metadata.structured_data_candidate.*` | Injected at render time |
| `private_import_metadata.internal_linking.*` | Resolved when article URLs exist |
| `private_import_metadata.migration_status` | Internal tracking |
| `quality.*` | Pipeline validation metadata |
| `prepared_at` | Pipeline timestamp |

The script enforces this by building the insert row using only the `ALLOWED_COLUMNS` whitelist, ignoring all other keys in the payload.

---

## Validation rules

All of these must pass before an insert can proceed:

| Check | Expected |
|---|---|
| No extra columns beyond schema | true |
| All 16 schema columns present | true |
| title non-empty | true |
| slug non-empty | true |
| content non-empty | true |
| excerpt non-empty | true |
| slug is ASCII-hyphenated | true |
| is_published | `false` |
| image_url | `null` |
| likes_count | `0` |
| views_count | `0` |
| No em dash in any field | true |
| No old source URL in payload | true |
| Slug available in public.articles | true |
| ID available in public.articles | true |

---

## Result JSON

`data/supabase-article-draft-insert-result.json` is written after every run:

```json
{
  "mode": "dry_run",
  "status": "ready",
  "article_id": "08179042-70f6-4f60-a6ab-de388d729a10",
  "slug": "birth-order-family-dynamics",
  "title": "משמעות המיקום במערך המשפחתי",
  "is_published": false,
  "image_url": null,
  "duplicate_slug_found": false,
  "duplicate_id_found": false,
  "inserted_at": null,
  "verified_after_insert": null,
  "warnings": []
}
```

After a successful insert, `status` becomes `"inserted"`, `inserted_at` is set, and `verified_after_insert` is `true`.

---

## Next phase options

### Option A - Upload image and update image_url

Once the OpenAI billing limit is resolved:
```bash
npm run generate:article-image -- --generate --upload --update-payload
```

This sets `image_url` in the draft payload. Then run a SQL UPDATE:
```sql
UPDATE public.articles
SET image_url = 'https://[bucket]/articles/birth-order-family-dynamics/hero.webp'
WHERE slug = 'birth-order-family-dynamics'
  AND is_published = false;
```

### Option B - Create a manual review screen

Build a lightweight admin page at `/admin/articles/draft/[id]` that shows:
- The article content with the hero image (or a placeholder)
- A "Publish" button that calls a Supabase update to set `is_published: true`
- A "Reject" button to delete the draft

### Option C - Update queue status after review

Once the article is reviewed and approved:
```typescript
await supabase
  .from('article_import_queue')
  .update({ status: 'imported' })
  .eq('id', queueId);
```

Run this only after the article is confirmed published or approved for publication.

### Option D - Publish manually

After review, set `is_published: true` in the Supabase dashboard or via:
```sql
UPDATE public.articles
SET is_published = true,
    updated_date = NOW()
WHERE slug = 'birth-order-family-dynamics'
  AND is_published = false;
```
