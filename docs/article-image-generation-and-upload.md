# Article Image Generation and Upload

## What this phase does

`scripts/generate-and-upload-article-image.ts` is Phase 6 of the article import pipeline.

It reads the image brief from Phase 5 and optionally:
1. Calls the OpenAI image generation API to create a hero image
2. Saves the generated image locally to `data/generated-images/`
3. Uploads the image to Supabase Storage bucket `article-images`
4. Updates `data/supabase-article-draft-payload.json` with the public image URL

---

## What this phase does NOT do

- Does not generate images in default mode (dry-run only)
- Does not upload anything unless `--upload` is passed
- Does not update the draft payload unless `--update-payload` is passed
- Does not insert into `public.articles`
- Does not publish anything
- Does not update `article_import_queue`
- Does not delete anything
- Does not use old source images
- Does not expose old source URLs
- Does not print or log any secret values

---

## Safety defaults

**Default mode is dry-run.** Running without any flags only reads files and prints the plan:

```bash
npm run generate:article-image
```

No API calls are made. No files are written (except `article-image-result.json` with `status: "dry_run"`). No Supabase operations occur.

---

## CLI modes

### Dry-run (default)

```bash
npm run generate:article-image
```

Prints planned generation details, local output path, bucket, storage path, and planned public URL. No actions taken.

### Generate only

```bash
npm run generate:article-image -- --generate
```

Calls OpenAI image generation. Saves image locally to `data/generated-images/{slug}-hero.{ext}`. Does not upload.

### Generate and upload

```bash
npm run generate:article-image -- --generate --upload
```

Generates image, then uploads it to Supabase Storage at `articles/{slug}/hero.webp`. Does not update draft payload.

### Full run

```bash
npm run generate:article-image -- --generate --upload --update-payload
```

Generates, uploads, and updates `data/supabase-article-draft-payload.json` with the public URL. `is_published` remains `false`.

### Upload existing local file

```bash
npm run generate:article-image -- --upload --local-file data/generated-images/birth-order-family-dynamics-hero.png --update-payload
```

Skips generation. Uploads the provided local file to Supabase Storage. Updates draft payload if `--update-payload` is passed.

### Overwrite existing storage file

```bash
npm run generate:article-image -- --generate --upload --upsert
```

Overwrites the existing file in Supabase Storage if one already exists at the target path.

---

## Optional flags

| Flag | Description |
|---|---|
| `--generate` | Call image generation API |
| `--upload` | Upload to Supabase Storage |
| `--update-payload` | Update draft payload `image_url` (requires `--upload`) |
| `--upsert` | Overwrite existing file in storage (default: fail if exists) |
| `--local-file <path>` | Use an existing local file instead of generating |
| `--provider openai` | Image provider (default: openai) |
| `--output-format webp` | Request WebP output via gpt-image-1 (default: png via dall-e-3) |
| `--output-format png` | Request PNG output via dall-e-3 (default) |
| `--quality high` | Quality level (default: high) |

---

## Required environment variables

Add these to `.env.local`:

```env
# Required for --generate
OPENAI_API_KEY=sk-...

# Required for --upload and --update-payload
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Security rules:**
- Never commit `.env.local` to git (it is in `.gitignore`)
- Never print or log the value of `OPENAI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL` is a public env var (used client-side) and may appear in console output
- In dry-run mode, only `NEXT_PUBLIC_SUPABASE_URL` is used (to show the planned URL shape)
- Missing required env vars only cause errors when the relevant action is requested

---

## How image generation works

### Provider: OpenAI

**Default model: `dall-e-3`**
- Size: `1792x1024` (7:4 landscape - closest to 16:9 that dall-e-3 supports)
- Quality: `hd`
- Style: `natural`
- Response format: `b64_json` (image returned as base64 data directly)
- Output: PNG

**WebP mode: `gpt-image-1`** (pass `--output-format webp`)
- Size: `1536x1024` (3:2 landscape)
- Quality: `high`
- Output format: `webp` (native WebP support)
- Response: base64 WebP data

### Negative prompt handling

Neither `dall-e-3` nor `gpt-image-1` support a separate `negative_prompt` parameter. The script incorporates the 16 most important avoidance terms from `image_generation.negative_prompt` into the positive prompt as a "Strictly avoid:" clause.

### Prompt source

The full prompt comes from `data/article-image-generation-brief.json` > `image_generation.prompt`. This was crafted in Phase 5 and is production-ready.

---

## How Supabase Storage upload works

1. Reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`
2. Creates a Supabase client with the service role key (admin-level access)
3. Calls `supabase.storage.from('article-images').upload(storagePath, fileBuffer, { contentType, upsert })`
4. On success, calls `supabase.storage.from('article-images').getPublicUrl(storagePath)` to get the public URL
5. The public URL is saved to `article-image-result.json` and optionally to the draft payload

### Error handling

| Error | Message |
|---|---|
| File already exists | "Rerun with --upsert to overwrite" |
| Bucket not found | "Create it in Supabase Storage: article-images (public)" |
| Missing env var | "Add it to .env.local: NEXT_PUBLIC_SUPABASE_URL=..." |

---

## Bucket and path strategy

**Bucket name**: `article-images`

The bucket must be created manually in the Supabase dashboard before `--upload` can work:
- Supabase dashboard > Storage > New Bucket
- Name: `article-images`
- Public: ON (for public URL access without signed URLs)

**Storage path pattern**: `articles/{slug}/hero.webp`

For `birth-order-family-dynamics`:
```
articles/birth-order-family-dynamics/hero.webp
```

**Filename saved locally**: `{slug}-hero.{ext}`

Example: `data/generated-images/birth-order-family-dynamics-hero.png`

The filename extension reflects the actual format returned by the API (`.png` for dall-e-3, `.webp` for gpt-image-1). The storage path always ends in `.webp` per convention (the uploaded file should ideally be WebP for optimal delivery).

---

## How draft payload image_url is updated

When `--update-payload` is passed after a successful upload:

1. `data/supabase-article-draft-payload.json` is read
2. `article_row_payload.image_url` is set to the Supabase public URL
3. `private_import_metadata.image_asset` is set with bucket, path, URLs, and timestamps
4. `article_row_payload.is_published` is verified to be `false` - if not, the script aborts
5. The updated JSON is written back to disk

The article row is then ready for the Phase 7 Supabase insert.

---

## Result JSON

`data/generated-images/article-image-result.json` is written after every run (including dry-run):

```json
{
  "status": "generated | uploaded | payload_updated | dry_run",
  "article_slug": "birth-order-family-dynamics",
  "local_path": "data/generated-images/birth-order-family-dynamics-hero.png",
  "bucket": "article-images",
  "storage_path": "articles/birth-order-family-dynamics/hero.webp",
  "public_url": "https://[project].supabase.co/storage/v1/object/public/article-images/...",
  "provider": "openai",
  "model": "dall-e-3",
  "actual_format": "png",
  "generated_at": "...",
  "uploaded_at": "...",
  "payload_updated_at": "...",
  "warnings": []
}
```

---

## Why no article insert happens here

The image upload and the article insert are intentionally separate phases. This allows:
- Human review of the generated image before it is attached to a public article
- Re-generating a better image without touching the draft
- Uploading a manually-edited version of the image
- Running the pipeline in stages across multiple sessions

The insert (Phase 7) reads from `data/supabase-article-draft-payload.json` which will have `image_url` populated after this phase runs with `--update-payload`.

---

## Next phase options

### Option A - Create first unpublished draft in Supabase (recommended next)

Once `article_row_payload.image_url` is populated:
1. Review `data/supabase-article-draft-payload.json`
2. Run Phase 7: `insert-article-draft.ts` to insert the row into `public.articles` with `is_published: false`
3. Review the draft in the CMS before publishing

### Option B - Build a daily cron pipeline

Chain phases 1-7 into a cron job that processes one article per day:
- Extract one pending article from `article_import_queue`
- Run all pipeline phases automatically
- Send a Slack/email notification with the draft URL for human review

### Option C - Build a manual review workflow

Build a lightweight admin UI that:
- Shows the draft article with the hero image
- Allows one-click publish (sets `is_published: true`)
- Links to the Supabase Storage image for replacement if needed
