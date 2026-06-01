# Article Image Generation

## What this phase does

`scripts/prepare-article-image-asset.ts` is Phase 5 of the article import pipeline.

It reads the optimized article candidate and draft payload, and produces `data/article-image-generation-brief.json` - a complete, production-ready brief for generating the article hero image.

The brief contains:
- A detailed prompt ready for any image generation model (DALL-E, Midjourney, Flux, Stable Diffusion)
- A negative prompt listing what must be excluded
- A deterministic storage path for the generated image
- A recommended filename
- Descriptive Hebrew alt text
- Quality validation results

---

## What this phase does NOT do

- Does not generate images
- Does not call any external image generation API
- Does not upload anything to Supabase Storage or Vercel Blob
- Does not update `article_row_payload.image_url`
- Does not insert into `public.articles`
- Does not update `article_import_queue`
- Does not publish anything
- Does not use old source images
- Does not expose old source URLs

---

## How to run

```bash
# Requires Phases 3 and 4 outputs to exist
npm run prepare:article-image
```

---

## Input files

| File | Purpose |
|---|---|
| `data/article-ai-optimized-candidate.json` | Source of `image_strategy`, `article_candidate`, `internal_linking` |
| `data/supabase-article-draft-payload.json` | Used to confirm slug and article context |

---

## Output file

`data/article-image-generation-brief.json`

---

## Output structure

| Section | Purpose |
|---|---|
| `article` | Article identity: title, slug, canonical URL, topic cluster, category |
| `image_generation` | Full brief: prompt, negative prompt, alt text, style, avoid list, storage path |
| `future_asset` | Placeholder for the generated asset: paths are set, URLs are null until generated |
| `quality` | Validation results for all required properties |
| `prepared_at` | ISO timestamp |

---

## Image style rules

All generated images for `niragabay.com` must follow these rules:

**Required style**
- Abstract editorial illustration - not stock, not photorealistic, not decorative
- Warm color palette: amber, ivory, soft terracotta, muted beige
- Smooth gradients, subtle depth, dimensional texture suggesting warmth
- Generous negative space, clean warm background
- Premium magazine / wellness publication aesthetic
- 16:9 horizontal format for hero placement

**Forbidden in every image**
- Text, words, letters, numbers, labels, or captions inside the image
- Logos, icons, symbols, or watermarks
- Literal human figures, children, faces, or body parts
- Medical or clinical imagery (stethoscopes, therapy couches, hospitals)
- Dramatic sadness, fearful imagery, or violent imagery
- Stock photo look or stock illustration aesthetic
- Cartoon, childish, or anime style
- Old website branding, vintage or retro look
- Bright saturated or neon colors
- Harsh contrast lighting

**Preferred visual language**
- Organic rounded forms suggesting connection without depicting figures
- Soft overlapping shapes implying relationships or hierarchy
- Calm, intelligent, sophisticated atmosphere
- Emotionally resonant without being literal

---

## Storage path strategy

The storage path is deterministic and derived from the article slug:

```
articles/{slug}/hero.webp
```

For `birth-order-family-dynamics`:
```
articles/birth-order-family-dynamics/hero.webp
```

**Bucket**: `article-images`

**Filename**: `{slug}-hero.webp`

Rules:
- Always WebP format for optimal web delivery
- Always lowercase, ASCII, hyphen-separated
- Never includes Hebrew characters, spaces, or special characters
- One hero image per article; future variants would use a different suffix (e.g., `hero-v2.webp`)

---

## Alt text strategy

Alt text must be:
- Written in Hebrew
- Descriptive of what the image visually shows (composition, shapes, mood)
- Not keyword spam - no exact article title, no SEO phrases repeated verbatim
- Short enough to be read naturally by a screen reader (under 120 characters)
- Updated after generation if the actual generated image differs from the planned concept

Current alt text for this article:
> קומפוזיציה אבסטרקטית של שלושה צורות רכות בגבהים שונים - ייצוג עדין של מיקום ודינמיקה במשפחה

---

## Why legacy images are not used

The source article images at `m-y-net.co.il` are:
- Hosted on a third-party domain with no guaranteed uptime or licensing
- Not optimized for the new site's visual style or layout
- Not in WebP format
- Potentially subject to copyright held by the original publisher
- Not consistent with the editorial design of `niragabay.com`

`use_legacy_image` is always `false` in this pipeline. Old image URLs are never written to `article_row_payload.image_url`.

---

## Prompt structure

The generation prompt is built in layers:

1. **Format declaration** - aspect ratio and rendering intent
2. **Theme clause** - composition description specific to this article's topic (birth order: three forms at different heights)
3. **Color palette** - warm amber, aged ivory, soft terracotta, muted beige
4. **Lighting** - soft gradient from above and left, diffused shadows
5. **Texture** - subtle dimensional warmth, clean background
6. **Style declaration** - premium editorial, flat to slightly dimensional, no harsh lines
7. **Exclusion list** - explicit "No text. No figures. No logos." in the positive prompt

The negative prompt repeats the exclusions as a comma-separated rejection list for models that support it (Stable Diffusion, Flux).

---

## Next phase options

### Option A - Generate the image manually

Copy the `image_generation.prompt` from `data/article-image-generation-brief.json` and paste it into an image generation tool:
- DALL-E 3 (via ChatGPT or API): use the positive prompt; negative prompt is not supported
- Midjourney: use the prompt with `--no` flag for negative terms
- Stable Diffusion / Flux: use both `prompt` and `negative_prompt`

Generate at 16:9 aspect ratio. Export as WebP.

### Option B - Upload generated image to Supabase Storage

Once the image file exists locally:
1. Upload to Supabase Storage bucket `article-images` at path `articles/{slug}/hero.webp`
2. Get the public URL from Supabase
3. Update `data/supabase-article-draft-payload.json` field `article_row_payload.image_url` with the public URL
4. Set `future_asset.public_url` and `future_asset.ready_to_attach_to_article: true`

### Option C - Upload to Vercel Blob

Alternative to Supabase Storage: upload the WebP to Vercel Blob using `@vercel/blob`. The public URL then goes into `article_row_payload.image_url`.

### Option D - Insert unpublished draft now (image_url = null)

Skip image generation for now and insert the article into `public.articles` with `image_url: null` and `is_published: false`. The image can be attached later via an UPDATE query. This creates a reviewable draft in the CMS.

### Option E - Full insert after image is ready

Wait until the image is generated and uploaded, then update `article_row_payload.image_url` and insert the complete row into `public.articles`. This is the cleanest approach.
