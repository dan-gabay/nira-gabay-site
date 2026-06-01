# Article Import Pipeline Runner

## Operating model

This is a **manually-triggered batch pipeline**. It is not a cron job and does not run automatically.

**Claude Code is the writing agent.** When the user says "run", Claude Code:
1. Runs a dry-run to check for slug collisions and other issues
2. Fixes safe issues automatically (slug map updates, no inserts required)
3. **Automatically switches to Opus or the strongest available writing model** for the editorial rewrite step
4. Performs the editorial rewrite directly in the conversation
5. Saves rewrites to `data/rewrite-source.json` keyed by `queue_id`
6. Runs the actual batch insert with the pre-written rewrites
7. Reports results

**Model switching rule:**

| Stage | Model |
|---|---|
| Dry-run, slug checks, orchestration, validation | Current/default (Sonnet is fine) |
| Substantial Hebrew editorial rewrite | Opus (or strongest available) |
| Supabase ops, queue updates, metadata inserts | Current/default |
| Image prompt generation | Current/default |

Claude Code switches to Opus automatically for the rewrite stage when possible. It does **not** stop and ask the user to switch models unless automatic switching is not possible in the current context.

**No external APIs are used for article text.** The OpenAI key is an optional fallback. Claude Code performing the rewrite directly is the preferred path.

**Images are never generated automatically.** The pipeline saves an image prompt to `article_draft_metadata` for every article. The user creates images manually later using the prompt shown in `/manage/articles/edit/[id]`.

---

## Commands

### Dry-run (default - no writes)

```bash
npm.cmd run run:article-import-pipeline -- --limit 5
```

Reports:
- Selected pending articles
- Planned slugs (from title only)
- Duplicate slug check against existing articles
- What each step would do
- Confirms no publishing, no image generation, no queue updates

### Actual batch

```bash
npm.cmd run run:article-import-pipeline -- --limit 5 --insert --mark-queue --skip-images
```

### With pre-written Claude Code rewrites (standard flow)

```bash
npm.cmd run run:article-import-pipeline -- --limit 5 --insert --mark-queue --skip-images --rewrite-source data/rewrite-source.json
```

Format of `data/rewrite-source.json`:
```json
{
  "<queue_id>": {
    "content": "<h2>...</h2><p>...</p>...",
    "risk_level": "low",
    "rewrite_depth": "substantial",
    "new_intro_added": true,
    "new_closing_added": true,
    "headings_rewritten": true,
    "sentence_by_sentence_paraphrase": false,
    "original_structure_preserved": false,
    "recommendation": "Ready for draft review",
    "notes": "Rewritten by Claude Code Opus"
  }
}
```

---

## CLI flags

| Flag | Description |
|---|---|
| `--insert` | Enable actual Supabase writes (default: dry-run) |
| `--mark-queue` | Update `article_import_queue` status |
| `--limit N` | Process up to N articles (default: 1) |
| `--skip-images` | Skip image generation (recommended) |
| `--generate-image` | Generate actual image via OpenAI (requires billing) |
| `--skip-ai-rewrite` | Skip rewrite entirely, use original cleaned content |
| `--rewrite-source <path>` | Path to JSON file with pre-written Claude Code rewrites |
| `--continue-on-error` | Continue to next article on per-article failure |
| `--expected-status <s>` | Queue status to select (default: `pending`) |

---

## Safety rules

- `is_published` is always `false` for newly imported articles
- `image_url` is always `null` until a real image is attached manually
- Old source URLs never appear in public article fields
- Em dash character never appears in content
- Slugs are always ASCII lowercase hyphenated
- Duplicate slug check runs before every insert
- Queue is only marked `draft_created` after BOTH article insert AND metadata insert succeed
- No secrets are printed

---

## Article insert columns (16 public fields only)

```
id, title, slug, content, excerpt, image_url,
reading_time, likes_count, views_count, tags,
is_published, created_date, updated_date,
created_by_id, created_by, is_sample
```

SEO fields (`meta_title`, `meta_description`, `canonical_url`, etc.) are not inserted. They can be added manually via the `/manage` edit view if needed.

---

## Rewrite requirements

Every article must receive a **substantial editorial rewrite** using Opus or the strongest available model:

- Keep original topic and core ideas
- Preserve Nira Gabay's warm, professional, human, sensitive voice
- Do not invent facts, credentials, studies, or statistics
- Write a new original introduction (2-3 sentences)
- Write a new original closing paragraph (2-3 sentences)
- Reorganize into clear web-friendly structure
- Rewrite H2 headings with fresh phrasing
- Rewrite paragraphs with fresh language - not sentence-by-sentence paraphrase
- Remove old-source artifacts
- Keep in Hebrew - no external links, no em dash

**Duplicate content risk target:**
```json
{
  "risk_level": "low",
  "rewrite_depth": "substantial",
  "original_structure_preserved": false,
  "new_intro_added": true,
  "new_closing_added": true,
  "headings_rewritten": true,
  "sentence_by_sentence_paraphrase": false
}
```

---

## Image prompts

The pipeline generates an abstract editorial illustration concept for every article and saves it to `article_draft_metadata`. Images are never generated automatically.

Style: modern abstract editorial illustration, warm amber/ivory/terracotta palette, no people, no text, no logos, premium editorial look suitable for a Hebrew therapist website.

See `/manage/articles/edit/[id]` to view the saved prompt and copy it for manual image creation.

---

## Queue status flow

```
pending -> processing -> draft_created
                      -> failed (with last_error)

duplicate slug -> draft_created (reconciliation, no insert)
```

---

## Slug generation

Slugs are generated deterministically from the article title and content using a keyword map (`SLUG_KEYWORD_MAP` in the runner script). Multi-word phrases take priority over single keywords.

The dry-run uses title only for slug preview. The actual insert uses the full extracted content, so the final slug may pick up an additional keyword component from the body text.

If the dry-run shows slug collisions (`parenting-article` fallback for multiple articles), add new keyword mappings to `SLUG_KEYWORD_MAP` before running the actual batch.

---

## Result file

Every run writes `data/article-import-pipeline-run-result.json`:

```json
{
  "mode": "dry_run",
  "limit": 5,
  "started_at": "...",
  "finished_at": "...",
  "articles_attempted": 5,
  "articles_inserted": 0,
  "articles_failed": 0,
  "articles_skipped": 0,
  "queue_updated": false,
  "items": [
    {
      "queue_id": "...",
      "source_title": "...",
      "article_id": null,
      "slug": "planned-slug",
      "is_published": false,
      "image_url": null,
      "image_prompt_saved": null,
      "duplicate_content_risk": null,
      "queue_status": "would be: draft_created",
      "error": null
    }
  ]
}
```

---

## Publishing

Publishing is always manual. The pipeline never publishes. To publish a draft:
1. Go to `/manage/articles`
2. Click "עריכה" on the draft
3. Check "מאמר מפורסם"
4. Save
