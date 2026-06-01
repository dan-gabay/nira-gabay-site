# Source Article Extraction Layer

## Purpose

`scripts/extract-one-source-article.ts` is the extraction layer in the article import pipeline.

It reads one pending URL from `public.article_import_queue`, fetches the source page from m-y-net.co.il, strips old-site boilerplate, and writes a local preview JSON for review.

It always runs in **dry-run mode**: no Supabase writes, no status changes.

---

## Usage

```bash
# Extract next pending article from queue (dry-run)
npm run extract:source-article

# Test a specific URL without reading from queue
npm run extract:source-article -- --source-url https://www.m-y-net.co.il/...

# Reserved flag (not active yet)
npm run extract:source-article -- --mark-processing
```

---

## Output

Writes `data/extracted-source-article-preview.json` with these fields:

| Field | Description |
|---|---|
| `queue_id` | Row ID from `article_import_queue` (null if `--source-url` used) |
| `source_url` | The original article URL |
| `source_title` | Title as stored in the queue (from discovery phase) |
| `extracted_title` | Title freshly extracted from the live page |
| `extracted_excerpt` | Short description (from og:description or first 250 chars) |
| `extracted_content` | Clean article body as HTML |
| `extracted_text` | Plain text of the body (for reading time / search) |
| `image_url` | Best available image (og:image preferred) |
| `reading_time` | Estimated minutes at 200 words/min (Hebrew speed) |
| `content_length` | Character count of `extracted_text` |
| `extracted_at` | ISO timestamp of extraction |

---

## Boilerplate Removal

Removed before and within the content container:

- `header`, `footer`, `nav`, `aside`
- Related / recommended article blocks
- Sidebar widgets and ads
- Breadcrumbs
- Comments sections
- Social share widgets
- Newsletter / subscribe blocks
- Cookie notices
- Tag clouds and author boxes
- Navigation, pagination, scripts, styles, iframes

---

## Content Container Detection

Selectors tried in order (first with >150 chars of text wins):

1. `.entry-content`
2. `.post-content`
3. `.td-post-content`
4. `.article-content`
5. `.article-body`
6. `[itemprop="articleBody"]`
7. `.post-body`
8. `.single-content`
9. `article .content`
10. `article` (fallback)
11. `main` (last resort)

---

## Title Cleaning

1. Strip site-name suffixes (`| m-y-net`, `- מטה יהודה`, etc.)
2. Strip longest segment from `|` / `-` splits common in `<title>` tags
3. Strip column name prefixes (`הורים וילדים`, `מטה יהודה`, `בקיצור מטה יהודה`)

---

## Soft 404 Detection

The script exits with an error if the raw page text contains:

- `page not found`
- `הדף לא נמצא`
- `לא נמצא`

It also exits if extracted text is shorter than 200 characters after extraction.

---

## What This Layer Does Not Do

- Does **not** insert into `public.articles`
- Does **not** update `article_import_queue` status
- Does **not** optimize content with AI
- Does **not** publish anything
- Does **not** delete anything
