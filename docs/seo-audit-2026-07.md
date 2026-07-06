# SEO Audit - niragabay.com Article Library (July 2026)

Audit of the live site (www.niragabay.com), the Supabase `articles` table (33 rows: 26 published, 7 drafts), and the codebase (rendering, schema, sitemap, SEO pipeline). Goal: turn the article archive into an organic-traffic asset that supports Nira's authority as a psychotherapist and parent-guidance expert.

---

## 1. What is already working (do not re-do)

Verified live and in code:

- Real HTTP 404 + noindex for missing article slugs (`app/articles/[slug]/page.tsx`)
- Canonical URLs on every article, apex -> www 308 redirect (`vercel.json`)
- `sitemap.xml` + `sitemap-images.xml` include only `is_published = true`; robots.txt blocks `/api/` and `/manage/`
- Rich JSON-LD rendered on article pages: BlogPosting, FAQPage, BreadcrumbList; site-wide Psychologist (LocalBusiness) + WebSite/SearchAction
- Visible breadcrumbs + BreadcrumbList schema
- `lang="he" dir="rtl"` correct
- Internal links rendered twice: in-body "מומלץ לקרוא גם" aside + related-articles block (unpublished targets filtered out)
- Body markdown `#` headings are demoted at render time - live pages have exactly one H1
- **No old-source (m-y-net.co.il) leakage anywhere public** - verified in DB content, rendered HTML, and code. All 18 code references are in scripts/docs/config only
- `llms.txt` exists; author bio box on articles; og:image with fallback

---

## 2. Top SEO issues blocking growth (ranked)

### Issue 1 - Title tags are unbranded and not search-optimized (21 of 26 published)
`meta_title` is NULL for 21 published articles. The intended fallback (root layout template `%s | נירה גבאי`) is **not applying in production** - live article pages serve a bare `<title>` (verified: `social-anxiety-parents-children` renders `<title>מהי חרדה חברתית ואיך מטפלים בה?</title>`, no brand, no keyword shaping). Titles are editorial, not intent-matching - e.g. "לעבור נכון את תקופת המעבר" contains no searchable keyword for מעבר דירה עם ילדים.

### Issue 2 - Keyword cannibalization: duplicate published articles
- **Birth order, both published:** `family-birth-order-meaning-and-impact` (7,198 chars, score 62) vs `birth-order-family-dynamics` (3,715 chars, score 92). Note: CLAUDE.md marks `birth-order-family-dynamics` as protected - consolidation needs an explicit decision.
- **Depression, both published:** `parents-kids-depression` (דיכאון בחורף) vs `depression-cycle-parenting` (מעגל הדיכאון). Salvageable by differentiating intent (seasonal/teen depression vs getting out of depression) - but see Issue 3.
- **Four unpublished draft twins of published articles** sitting in the table: `addiction-youth`, `summer-break-expectations`, `coming-out-youth`, `childhood-memories-therapy` duplicate published equivalents (two share the exact same title). Publishing any of them creates instant cannibalization. Other articles' stored `internal_links` already point at these drafts.

### Issue 3 - A published article with no SEO package at all
`depression-cycle-parenting` is live with NULL meta_description, canonical, schema_json, internal_links, focus_keyword, seo_score. It also happens to be a duplicate-topic page (Issue 2). Worst page on the site, live.

### Issue 4 - No commercial landing pages to receive the traffic
Site structure is Home / About / Articles / Contact. The homepage lists 6 services (טיפול במתבגרים, טיפול פרטני, טיפול זוגי, הדרכת הורים, טיפול מיני, CBT) but **none has a landing page**. Articles capture informational queries; there is nowhere to funnel that authority for commercial queries (הדרכת הורים ירושלים, טיפול CBT למתבגרים, פסיכותרפיה אונליין). This is the biggest gap between traffic and clients.

### Issue 5 - Flat architecture, no topic hubs
No tag/category archive routes exist. Tag "filters" on /articles are client-side state over one flat list - not crawlable, no per-topic H1/meta/canonical. 26 articles all hang directly off /articles with no topical grouping Google can read. No hub pages = no cluster authority.

### Issue 6 - Tag taxonomy is broken data
Two incompatible tag styles: old imports use `הורות, משפחה, מתבגרים` (spaced), the June batch uses `נירה גבאי,הורים וילדים,משפחה,זוגיות,טיפול רגשי` (unspaced, and includes the brand name "נירה גבאי" as a tag on every article - meaningless for grouping, and it inflates internal-link "shared tags" scores between unrelated articles). `הורים וילדים` vs `הורות` split the same concept. The `article_tags` join table is empty; everything runs off the free-text `tags` column.

### Issue 7 - The SEO validator is miscalibrated on the new batch
June-batch articles score 100/100 with focus keywords like `ילדים`, `מתבגרים`, `שגרה` - single generic words no small site can rank for, while older, better-targeted articles score 46-70. The gate passes junk; scores are not comparable across batches.

### Issue 8 - Thin content on the newest imports
June batch: 2,800-3,900 chars (~450-650 words) vs 5,500-8,100 for the earlier batch. For YMYL mental-health topics, thin + generic keyword = won't rank.

### Issue 9 - FAQ exists only as JSON-LD, invisible to users
Most articles carry a real FAQPage schema (built from actual content), but nothing renders on-page (homepage has a visible FaqSection; articles do not). Mismatch between markup and visible content is a rich-result risk and wastes good GEO/AI-answer material.

### Issue 10 - Freshness and measurement gaps
- Homepage links to zero individual articles (no "latest articles" section) - no equity/freshness flow from the strongest page
- `dateModified` in BlogPosting = `created_date` always; no og modifiedTime; sitemap uses `updated_date` - inconsistent freshness signals
- No Google Search Console verification meta tag found (if verified via DNS, fine - but confirm and wire in the property)
- `status` column says 'draft' for all 26 published rows (data hygiene; will bite any future status-based logic)

---

## 3. Ten highest-value improvements (ordered by impact/effort)

1. **Backfill `meta_title` + `meta_description` for all 21 published articles.** Keyword-first, ≤60 chars, brand suffix (e.g. `חרדה חברתית אצל ילדים: זיהוי וטיפול | נירה גבאי`). Also root-cause why the layout title template doesn't apply (suspect: `app/articles/layout.tsx` absolute title interfering with template cascade) - but backfilling makes titles explicit and template-independent anyway.
2. **Run the SEO pipeline on `depression-cycle-parenting`** (or unpublish until fixed) and differentiate it from `parents-kids-depression` with distinct focus keywords (יציאה מדיכאון vs דיכאון חורף אצל בני נוער).
3. **Quarantine the 4 draft twins** - mark them `superseded` in status (or delete), remove them from other articles' `internal_links`, and add a pipeline gate: block insert when title similarity vs a *published* article exceeds threshold (the current gate checks slug + focus keyword only, which is how twins got through).
4. **Decide the birth-order consolidation**: keep one canonical article (recommend the long `family-birth-order-meaning-and-impact` as primary), 301 the other or rewrite it to a genuinely different intent (e.g. "ילד סנדוויץ'" specific). Requires lifting the CLAUDE.md protection on `birth-order-family-dynamics` - owner decision.
5. **Create 5-6 server-rendered topic hub pages** (`/articles/topic/[slug]`) with unique H1, intro copy (150-250 words in Nira's voice), article list, FAQ, CTA; add to sitemap; make index tag chips real links to them. Prereq: normalize tags (see #6).
6. **Normalize the tag taxonomy** to one canonical set (proposal in §4), drop "נירה גבאי" as a tag, migrate the `tags` column (and optionally populate `article_tags`).
7. **Build service landing pages** for the 4-5 core services with local + online intent (הדרכת הורים, טיפול במתבגרים, טיפול זוגי, CBT, טיפול מיני) and link every article's CTA to its matching service page.
8. **Recalibrate `lib/seo/validate.ts`**: fail single-word generic focus keywords (require 2+ words or a curated allowlist), penalize <600 words on YMYL topics, then re-score all articles for an honest work queue.
9. **Render the FAQ visibly** on article pages (accordion above the author box, matching the existing JSON-LD), and add a "latest articles" section (3 items) to the homepage.
10. **Fix freshness + measurement**: `dateModified` from `updated_date` in schema + og; confirm GSC property (add verification meta if not DNS-verified), submit sitemap, and use GSC query data to iterate focus keywords quarterly.

---

## 4. Suggested topic clusters

Six clusters mapped from the current 33 articles (hub name -> canonical tag -> members):

**1. חרדה אצל ילדים ומתבגרים** (anxiety) - the strongest cluster, best search volume
- social-anxiety-parents-children, ocd-teens-parents-cbt-treatment, anxiety-relief-practice-for-stress-and-uncertainty, exam-anxiety-achievement (draft), when-to-start-cbt-therapy (draft)
- Hub keyword: חרדה אצל ילדים / חרדה אצל מתבגרים. Gap articles: חרדת נטישה, חרדה כללית אצל ילדים, סירוב בית ספר

**2. הדרכת הורים וגבולות** (parenting & discipline)
- parenting-without-boundaries-spoiled-children, tantrums-in-children-middle-child-sandwich, raising-socially-minded-kids, parents-kids-report-cards, talking-to-children-current-events
- Hub keyword: הדרכת הורים. Gap articles: מריבות בין אחים, מסכים וילדים, עצמאות ילדים

**3. גיל ההתבגרות** (adolescence)
- emotional-disorders-in-adolescence-guide-for-parents, addiction-teens-adults-how-to-cope, coming-out-teen-parents-guide, passover-break-adolescent
- Hub keyword: הורים למתבגרים / גיל ההתבגרות. Gap articles: מרד גיל ההתבגרות, מתבגר מסתגר בחדר, תקשורת עם מתבגרים

**4. משפחה ומעברים** (family transitions & routine)
- moving-with-kids-and-school-transitions, back-to-school-routine, parents-kids-summer-vacation-expectations, holiday-meal-family-dynamics, co-parenting-after-divorce, return-from-reserve-duty, family-birth-order-meaning-and-impact (+ birth-order-family-dynamics pending consolidation)
- Seasonal engine: back-to-school (Aug-Sep), holidays (Tishrei/Pesach), summer (Jun) - refresh + republish on calendar

**5. זוגיות** (relationships) - currently thin, 2 articles
- why-i-cant-create-a-healthy-relationship, love-language-couples (draft); return-from-reserve-duty overlaps
- Needs 3-4 more before a hub is justified: משבר בזוגיות, תקשורת זוגית, טיפול זוגי - מתי

**6. רגש וטיפול** (emotional wellbeing & therapy)
- perfectionism-how-it-holds-us-back, parents-children-mental-resilience, parents-kids-depression, depression-cycle-parenting, early-childhood-memories-parenting-emotional-therapy, childhood-memories-therapy (draft twin), when-to-start-cbt-therapy (also cluster 1)
- The "what is therapy / when to start" sub-topic converts best - prioritize מתי כדאי להגיע לטיפול CBT for publish after keyword fix

**Canonical tag set** (replace the current free-text mess): `חרדה`, `הורות`, `מתבגרים`, `משפחה ומעברים`, `זוגיות`, `טיפול רגשי`. Optional secondary: `CBT`, `מיניות בריאה`. One primary tag per article = its hub; secondaries allowed.

**Hebrew keyword opportunities** (long-tail, realistic for a new domain):
- חרדה חברתית אצל ילדים / איך עוזרים לילד עם חרדה חברתית
- טיפול CBT למתבגרים / מתי כדאי טיפול CBT
- התקפי זעם אצל ילדים בני 6/8/10 (age-modified variants)
- הצבת גבולות לילדים בלי צעקות
- הדרכת הורים אונליין / הדרכת הורים ירושלים
- מתבגר מסתגר / מתבגר עצבני - מה עושים
- חרדת בחינות אצל בני נוער
- דיכאון אצל בני נוער - סימנים
- Local: פסיכותרפיסטית ירושלים, מטפלת רגשית מבשרת ציון / בית שמש / מודיעין

---

## 5. Internal linking strategy

Current state: `internal_links` generated by shared-tag + title-token scoring, capped at 3, rendered as an in-body aside (only when ≥3 H2s) + related-articles block. Anchors are always the full target title. Some stored links point at drafts (filtered at render, so pages can show fewer than intended).

Target model - **hub and spoke**:

1. Every article links **up** to its cluster hub page in the intro or first section (natural anchor: "מאמרים נוספים על חרדה אצל ילדים").
2. Every article links **sideways** to 2-3 sibling spokes with *descriptive* anchors (keyword phrase, not full title) placed in-context in the body, not only in the aside.
3. Every hub links **down** to all its spokes + **across** to its matching service page.
4. Every article ends with **one CTA** to the relevant service page (or /contact until service pages exist): "מתלבטים אם הילד שלכם זקוק לליווי מקצועי? קראו על הדרכת הורים / צרו קשר".
5. Homepage links to the 3 latest articles + all hubs.

Pipeline changes to support this:
- Regenerate `internal_links` after tag normalization (current scores are polluted by the "נירה גבאי" tag match)
- Only consider `is_published = true` targets at generation time (not just render time)
- Store a short `anchor` keyword phrase distinct from `title`
- Remove the ≥3-H2 condition or lower it - short articles currently get no in-body links

---

## 6. Optimized article page template

Target spec for every published article (new and backfilled):

```
meta_title:        [focus keyword first] - [benefit/qualifier] | נירה גבאי   (≤60 chars)
meta_description:  120-158 chars, contains focus keyword, ends with soft CTA
slug:              ascii-lowercase-hyphens, ≤6 segments, contains EN translation of keyword
H1:                one only - question or promise containing the focus keyword
Intro:             2-3 paragraphs, empathetic hook (parent's felt experience), keyword in first 100 words
Body:              H2 sections, one idea each; at least one מקרה מהקליניקה (anonymized case) - E-E-A-T
                   1 in-context link to hub + 2 to sibling articles (descriptive anchors)
Practical section: H2 "מה אפשר לעשות בבית" - numbered/bulleted concrete tools
When-to-seek-help: H2 "מתי כדאי לפנות לעזרה מקצועית" - links to service page/contact
FAQ:               3-5 questions, VISIBLE accordion, mirrored 1:1 in FAQPage JSON-LD
Author box:        existing bio + credential line (M.A. ייעוץ חינוכי, CBT אונ' חיפה) + photo
CTA:               one clear action (WhatsApp / contact / service page)
Length:            800-1,200 words minimum for YMYL topics
Schema:            BlogPosting (dateModified = updated_date) + FAQPage + BreadcrumbList
Image:             unique og:image 1200x630, Hebrew-relevant alt containing keyword
```

---

## 7. Imported articles & the old source

**Good news: zero public leakage.** Content regex over all 33 rows found no m-y-net/ynet mentions, no URLs in content, no "פורסם לראשונה". `source_url` is never written to `articles`. Code references exist only in scripts/docs/config.

Remaining recommendations:
1. Keep the existing guardrails (CLAUDE.md safety rules) - they are working.
2. The 4 draft twins ARE the old-source risk now: they are shallower re-imports of articles already rewritten and published. Never publish them; mark `superseded` or delete (Backlog P0-3).
3. 21 published articles have `optimized_at = NULL` - they predate the SEO pipeline. Run them through generate+validate in backfill mode (no content change, metadata only) so every row has a consistent, honest SEO package.
4. Add a pipeline pre-insert check: fuzzy title match vs published articles (threshold ~0.6 token overlap) -> hard error. The current gate (slug + exact focus keyword) missed the twins.

---

## 8. Prioritized backlog

### P0 - fix live damage (this week)
| # | Task | Detail |
|---|------|--------|
| P0-1 | ~~Backfill meta_title for all 26 published articles~~ **DONE 2026-07-06** | 22 keyword-first branded titles written to DB (existing meta_descriptions kept). Verify live `<title>` after ISR refresh (~1h) |
| P0-2 | ~~SEO package for `depression-cycle-parenting`~~ **DONE 2026-07-06** | focus_keyword='יציאה מדיכאון', meta_description (139 chars), canonical set. schema_json/internal_links still null - page fallbacks cover it; full pipeline regen optional |
| P0-3 | ~~Quarantine 4 draft twins~~ **DONE 2026-07-06** | 4 twins marked status='superseded' (+ai_notes); 10 internal_links entries across 5 articles rewired to the published equivalents (not just removed); pipeline gate added: title overlap >=0.6 vs a published article is now a blocking error, drafts still warn, superseded rows excluded from checks and link suggestions (lib/seo/validate.ts, generate.ts, types.ts, pipeline + backfill scripts). Verified with targeted test |
| P0-4 | ~~Diagnose title-template bug~~ **DONE 2026-07-07** | Root cause: `app/articles/layout.tsx` set `title.absolute`, shadowing the root template for the [slug] child route. Metadata moved onto the (server-component) index page, layout deleted. Verified live: 404 article title now renders 'מאמר לא נמצא \| נירה גבאי' |
| P0-5 | Confirm GSC property + submit sitemap | Add verification meta if not DNS-verified |

### P1 - structural wins (2-4 weeks)
| # | Task | Detail |
|---|------|--------|
| P1-1 | ~~Normalize tag taxonomy~~ **DONE 2026-07-07** | 29 non-superseded articles retagged to the canonical set (primary tag first = future hub): core חרדה/הורות/מתבגרים/משפחה/זוגיות/טיפול רגשי + secondary CBT/מיניות בריאה. `tags` table synced (מיניות renamed to מיניות בריאה, התמודדות+רגשות deleted, CBT added). Brand-name tag gone. Verified: every article tag value has an exact chip match. Note: tag "משפחה" stays short for chips; the hub page (P1-2) can use the fuller "משפחה ומעברים" as its H1 |
| P1-2 | Topic hub pages | `/articles/topic/[slug]` server-rendered, unique meta/H1/intro/FAQ/CTA; add to sitemap; tag chips -> real links |
| P1-3 | Regenerate internal_links post-taxonomy | Published-only targets, descriptive anchors, hub links |
| P1-4 | Visible FAQ accordion on article pages | Render existing `faq.mainEntity`; keep JSON-LD 1:1 |
| P1-5 | Homepage "latest articles" section | 3 newest published, server-rendered |
| P1-6 | Recalibrate validator | Fail generic 1-word keywords; thin-content threshold 600 words; re-score all |
| P1-7 | dateModified fixes | Schema + og from `updated_date`; touch `updated_date` on real edits only |
| P1-8 | Birth-order consolidation decision | Owner call (protected article). Then 301 or intent-split |

### P2 - growth engine (1-3 months)
| # | Task | Detail |
|---|------|--------|
| P2-1 | Service landing pages ×5 | הדרכת הורים, טיפול במתבגרים, טיפול זוגי, CBT, טיפול מיני; local+online keywords; wire article CTAs |
| P2-2 | Expand June-batch thin articles to 800-1,200 words | Opus rewrite per CLAUDE.md model rule: case example, practical section, FAQ |
| P2-3 | Fill cluster gaps | 1-2 new articles/month from §4 gap lists, seasonal calendar for cluster 4 |
| P2-4 | Grow זוגיות cluster to hub-worthy size | 3-4 articles, then hub |
| P2-5 | Set status='published' consistency | Align `status` column with `is_published`; fix pipeline to set it |
| P2-6 | Quarterly GSC review loop | Re-target focus keywords from real query data |

---

## Appendix: security finding (not SEO - flagged by Supabase advisor)

RLS is **disabled** on `public.articles`, `public.comments`, `public.contact_messages`, `public.article_draft_metadata`. Anyone holding the anon key can read **and write** every row - including contact-form leads (names, emails, phones) in `contact_messages`, and could unpublish/deface articles. Enabling RLS without policies would break the site's reads, so policies must be added in the same change (public read for published articles; server-role-only for the rest). Handle as its own task - do not blanket-enable.
