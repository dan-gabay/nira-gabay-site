# Article AI Optimization

## What this phase does

Phase 3 of the article import pipeline applies editorial optimization to the candidate produced in Phase 2. It runs in two sub-phases:

**Phase 3a - Artifact cleanup and structure** reads `data/article-import-candidate.json` and produces `data/article-ai-optimized-candidate.json` with:
- Cleaned source artifacts (broken punctuation, non-breaking spaces, stray dashes)
- Proper HTML heading structure (H2 for all section headings)
- Improved SEO text (meta description, excerpt, og_description)
- A full `editorial_optimization` audit trail of every change made

**Phase 3b - Substantial editorial rewrite** updates `data/article-ai-optimized-candidate.json` in place with:
- A new original introduction that opens from the reader's experience, not the clinician's intake checklist
- A new theoretical section (H2: מיקום שעיצב אישיות) that did not exist in the source
- Rewritten firstborn section with a new heading (H2: הבכור - ממרכז העולם לנסיגה ראשונה)
- Rewritten second-child section with a new heading (H2: הילד השני - יצירתיות שנולדה מהמחסום) that merges the original "טריטוריות תפוסות" and "מוסר וצדק" sections
- A new reflective closing paragraph that did not exist in the source
- A `duplicate_content_risk` object assessing rewrite depth

All changes are non-inventive: no facts are added, no therapeutic claims are introduced, and the author's voice is preserved throughout.

---

## What this phase does NOT do

- Does not insert into `public.articles`
- Does not update `article_import_queue`
- Does not publish anything
- Does not delete anything
- Does not invent content, facts, or claims
- Does not change `is_published` to true
- Does not expose the old source URL in any public field
- Does not use the old source URL as canonical

---

## Input

`data/article-import-candidate.json`

Produced by `npm run prepare:article-candidate`.

---

## Output

`data/article-ai-optimized-candidate.json`

---

## Output JSON structure

All sections from the Phase 2 candidate are preserved. This phase adds one section and updates several fields:

| Section | Change |
|---|---|
| `article_candidate.content` | Artifact-cleaned, headings promoted to H2 |
| `article_candidate.excerpt` | Rewritten to be reader-facing and specific |
| `seo.meta_description` | Rewritten with concrete article-grounded questions |
| `seo.og_description` | Updated to match improved excerpt |
| `seo.needs_ai_optimization` | Set to `false` |
| `structured_data_candidate.description` | Updated to match improved og_description |
| `migration.migration_status` | Progressed from `candidate_prepared` to `ai_optimized` |
| `quality` | Added `h2_headings_count`, `has_no_nbsp`, `has_no_source_artifacts`, `canonical_is_niragabay`, `no_em_dash`, `no_old_url_in_public_fields` |
| `editorial_optimization` | New section - full audit trail |
| `ai_optimized_at` | New field - ISO timestamp |

---

## Editorial rules applied

### Content - what is fixed

**Source artifacts removed**:
- Spurious comma after colon: `אשאל גם על ההורים: , מה` - the `, ` is a source CMS artifact, corrected to `אשאל גם על ההורים: מה`
- `&nbsp;` (non-breaking space) entities - replaced with regular space or removed where they appear as trailing whitespace
- En dash characters (`–` U+2013) - replaced with ` - ` (space-hyphen-space) for typographic consistency

**Structure**:
- `<p><strong>heading text</strong></p>` patterns promoted to `<h2>heading text</h2>` for semantic HTML and SEO
- Leading newline removed from opening `<p>` tag
- Blank lines between sections normalized

**Grammar**:
- Run-on sentence in closing paragraph: missing period added after `ובחברה` before `ההבנה הזאת`

### Content - what is preserved

- Author's first-person clinical voice (`אבדוק`, `אשאל`, `נבדוק`, `אני נותנת`)
- All factual claims and therapeutic concepts exactly as written
- All Hebrew quotations including curly/smart quote typography
- All inclusive language notes (e.g., `השימוש בלשון זכר לצורך נוחות בלבד`)
- Article flow and paragraph breaks

### SEO - what is improved

**meta_description** - was generic:
> "למיקום של הילד במערך המשפחתי יש חשיבות גדולה... הנה ההסבר לכך קראו עוד במאמרה של נירה גבאי."

Improved to surface specific questions the article answers:
> "מה קורה לבכור כשמגיע תינוק חדש? למה הילד השני מפתח תחושת צדק חזקה? נירה גבאי מסבירה כיצד המיקום במערך המשפחתי עצב דפוסי חשיבה לכל החיים."

**excerpt** - was abstract:
> "למיקום של הילד במערך המשפחתי יש חשיבות גדולה המשליכה על התפקוד בזוגיות, בעבודה, במשפחה ובחברה. הנה ההסבר לכך"

Improved to be reader-facing:
> "מיקומך במשפחה - בכור, שני, או ילד יחיד - עיצב דפוסי חשיבה שמשפיעים על הזוגיות, העבודה והיחסים שלך עד היום. נירה גבאי מסבירה את גישת אדלר."

---

## Heading structure after Phase 3b

| H2 | Position in article | vs. source |
|---|---|---|
| מיקום שעיצב אישיות | After 3-paragraph introduction | New - did not exist in source |
| הבכור - ממרכז העולם לנסיגה ראשונה | After theory section | Rewritten from "הבכור זוכה בכל" |
| הילד השני - יצירתיות שנולדה מהמחסום | After firstborn section | Rewritten, merges "טריטוריות תפוסות" + "מוסר וצדק" |

## Duplicate content risk gate (Phase 3b)

The `duplicate_content_risk` object in the output JSON records the rewrite depth assessment:

| Field | Value |
|---|---|
| `risk_level` | `low` |
| `rewrite_depth` | `substantial` |
| `original_structure_preserved` | `false` |
| `new_intro_added` | `true` |
| `new_closing_added` | `true` |
| `headings_rewritten` | `true` |
| `sentence_by_sentence_paraphrase` | `false` |

**Validation rule**: if rewrite is only punctuation cleanup and heading conversion (`risk_level: "high"`), Phase 3b must be re-run with deeper rewriting before Phase 4 can proceed.

---

## Quality checks

All of the following are verified `true` before the file is written:

- `is_published: false`
- `canonical_url` points only to `https://www.niragabay.com`
- No old source URL (`m-y-net.co.il`) in any public field
- No em dash character (`—` U+2014) in any string field
- No `&nbsp;` in content
- No `: ,` artifact pattern in content
- `has_title`, `has_excerpt`, `has_content`, `has_new_image_prompt` all true
- `warnings: []`

---

## What is NOT changed

| Field | Reason not changed |
|---|---|
| `article_candidate.title` / `h1` | Original Hebrew title is accurate and SEO-appropriate |
| `article_candidate.slug` | Correct English slug set in Phase 2 |
| `seo.seo_title` | Correct format, within character limit |
| `seo.focus_keywords` | Reflect actual article content |
| `image_strategy` | Phase 2 prompt is correct and premium; no change needed |
| `structured_data_candidate.headline` | Matches H1 as required by schema.org |
| `internal_linking` | Unchanged; link resolution happens in a later phase |
| `source.*` | Private metadata - never modified after extraction |

---

## Safety summary

- Reads one local file, writes one local file
- No network calls. No Supabase reads or writes
- `is_published: false` verified
- `migration_status: "ai_optimized"` makes the stage explicit
- `editorial_optimization` section provides a full audit trail of every change made to the article
- Old source URL appears only in `source.source_url_private` and `migration.old_source_url_private`

---

## Next phase

**Phase 4: Image generation**

- Use `image_strategy.image_prompt` to generate the article image
- Upload to Vercel Blob, get the public URL
- Set `image_strategy.use_legacy_image: false` and store the new URL
- Validate `structured_data_candidate` schema
- Then proceed to Supabase insert (`public.articles`)
- Update `article_import_queue` status to `imported`
