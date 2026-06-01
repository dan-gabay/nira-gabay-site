# Image Prompts in /manage

## Where image prompts are stored

Image prompts are stored in the `public.article_draft_metadata` table in Supabase.

| Column | Description |
|---|---|
| `article_id` | Foreign key to `public.articles.id` |
| `queue_id` | Optional reference to `article_import_queue.id` |
| `slug` | Article slug (for readability) |
| `image_concept` | Short Hebrew description of the image concept |
| `image_prompt` | Full English prompt for the image generator |
| `negative_prompt` | What to exclude from the image |
| `image_alt` | Hebrew alt text for accessibility |
| `image_status` | `prompt_ready` = prompt saved, waiting for image creation |
| `source` | Always `article_import_pipeline` for imported articles |

This table is separate from `public.articles`. It does not affect public article rendering. `articles.image_url` remains `null` until a real image is attached.

---

## How /manage displays image prompts

Go to `/manage/articles`, click "עריכה" on any article.

In the edit page, below the image upload section, a card titled **"פרטי תמונה (לשימוש פנימי בלבד)"** appears when:
- The article has no hero image (`image_url` is null), OR
- Metadata exists in `article_draft_metadata`

The card shows:
- **רעיון לתמונה** - the Hebrew concept description
- **פרומפט לתמונה** - the full English prompt with a "העתק פרומפט" button
- **פרומפט שלילי** - the negative prompt with a "העתק" button
- **טקסט חלופי לתמונה** - the Hebrew alt text

These fields are only visible in `/manage`. They never appear on the public article page.

---

## How to copy the prompt

1. Open `/manage/articles/edit/[article-id]`
2. Scroll to the "פרטי תמונה" section
3. Click "העתק פרומפט" - the prompt is copied to clipboard
4. The button briefly shows "הועתק!" to confirm

---

## How to create the image manually

Use any image generation service:

- **Midjourney** - paste the prompt, use `--ar 16:9`
- **DALL-E** (via ChatGPT) - paste the prompt directly
- **Adobe Firefly** - paste the prompt, select 16:9

The image style target: modern abstract editorial illustration, warm amber/ivory/terracotta palette, no people, no text, premium editorial look.

Recommended output size: 1536x1024 (16:9).

---

## How to attach the image to an article

After generating the image:

1. Go to `/manage/articles/edit/[article-id]`
2. Under "תמונת ראשית", upload the image file
3. The image uploads to Vercel Blob and sets `image_url`
4. Click "שמור שינויים"

Alternatively, update `articles.image_url` directly in Supabase with the public URL of the uploaded image.

---

## What image_url=null means

- The article renders normally without a hero image
- The hero image section is hidden on the public article page
- No placeholder or broken image is shown
- You can publish the article with `image_url=null` - publishing is not blocked

---

## Image prompt style reference

All auto-generated prompts use this style:

```
Abstract editorial illustration, horizontal 16:9.
[theme-specific composition]
Warm amber, aged ivory, soft terracotta palette.
Smooth gradient lighting.
Generous negative space. Clean warm off-white background.
Premium contemporary editorial style suitable for a professional psychology publication.
Flat to slightly dimensional rendering. No text, no people, no figures.
```

Negative prompt (standard for all articles):
```
text, words, letters, numbers, labels, captions, watermark, signature,
logos, icons, symbols, brand marks,
human figures, people, faces, hands, body parts, children, portraits,
medical imagery, clinical imagery, hospital, therapy couch, stethoscope,
dark imagery, violent imagery, fearful imagery, sad imagery,
dramatic contrast, neon colors, bright saturated colors, harsh lighting,
stock photo look, stock illustration, cartoon style, childish illustration,
anime, manga, digital art cliche, 3D render, CGI,
old website branding, vintage, retro, photo-realistic photography,
blurry, low quality, distorted, artifact
```
