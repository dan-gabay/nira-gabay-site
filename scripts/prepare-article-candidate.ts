#!/usr/bin/env tsx
/**
 * prepare-article-candidate.ts
 *
 * Phase 2 of the article import pipeline.
 * Reads data/extracted-source-article-preview.json and produces a structured
 * article candidate JSON with SEO, image strategy, schema, and linking fields.
 *
 * Dry-run safe: reads and writes local files only.
 * No Supabase. No publishing. No AI rewrites.
 */

import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Paths and constants
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), 'data');
const INPUT_FILE = path.join(DATA_DIR, 'extracted-source-article-preview.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'article-import-candidate.json');

const CANONICAL_BASE = 'https://www.niragabay.com';
const AUTHOR_NAME = 'נירה גבאי'; // נירה גבאי

// ---------------------------------------------------------------------------
// Hebrew keyword -> English slug word map
// More specific / higher-value phrases listed first.
// ---------------------------------------------------------------------------

const SLUG_KEYWORD_MAP: Array<[string, string]> = [
  ['מיקום', 'birth-order'],            // מיקום
  ['משפחתי', 'family-dynamics'],      // catches מערך המשפחתי, המשפחתי, etc.
  ['בכור', 'firstborn'],                    // בכור
  ['אחים', 'siblings'],                     // אחים
  ['הנחיית הורים', 'parent-coaching'], // הנחיית הורים
  ['זוגיות', 'couples'],          // זוגיות
  ['תקשורת', 'communication'],    // תקשורת
  ['גבולות', 'boundaries'],       // גבולות
  ['ביטחון עצמי', 'self-confidence'], // ביטחון עצמי
  ['חרדה', 'anxiety'],                      // חרדה
  ['רגשות', 'emotions'],               // רגשות
  ['הורים', 'parenting'],              // הורים
  ['ילדים', 'children'],               // ילדים
  ['משפחה', 'family'],                 // משפחה
  ['טיפול', 'therapy'],                // טיפול
  ['שינוי', 'change'],                 // שינוי
  ['יחסים', 'relationships'],          // יחסים
  ['קשר', 'relationship'],                       // קשר
];

// ---------------------------------------------------------------------------
// Tag pool: match tags by keywords present in title + content text
// ---------------------------------------------------------------------------

const TAG_POOL: Array<{ tag: string; keywords: string[] }> = [
  {
    tag: 'הורים וילדים', // הורים וילדים
    keywords: ['הורים', 'ילדים', 'הורות'],
  },
  {
    tag: 'משפחה', // משפחה
    keywords: ['משפחה', 'משפחתי', 'אחים', 'בכור', 'מערך'],
  },
  {
    tag: 'זוגיות', // זוגיות
    keywords: ['זוגיות', 'זוגי', 'בני זוג'],
  },
  {
    tag: 'טיפול רגשי', // טיפול רגשי
    keywords: ['טיפול', 'מטופל', 'קליניקה', 'פסיכותרפיה', 'אדלר'],
  },
  {
    tag: 'יחסים', // יחסים
    keywords: ['יחסים', 'קשר', 'מערכת יחסים'],
  },
  {
    tag: 'תקשורת', // תקשורת
    keywords: ['תקשורת', 'שיחה', 'דיאלוג'],
  },
  {
    tag: 'התפתחות אישית', // התפתחות אישית
    keywords: ['התפתחות', 'צמיחה', 'שינוי', 'עצמי'],
  },
];

// Signals that identify old-site boilerplate leftover in content
const OLD_SITE_SIGNALS = ['m-y-net', 'clearfix', 'pull-right', 'pull-left'];

// Signals that identify the author bio block at the bottom of articles
const BIO_SIGNALS = [
  'יועצת חינוכית', // יועצת חינוכית
  'ממכון אדלר',                    // ממכון אדלר
  'מיניות בריאה',        // מיניות בריאה
  'email-protection',
  '__cf_email__',
  'data-cfemail',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExtractedPreview {
  queue_id: string | null;
  source_url: string;
  source_title: string | null;
  extracted_title: string | null;
  extracted_excerpt: string | null;
  extracted_content: string;
  extracted_text: string;
  image_url: string | null;
  reading_time: number;
  content_length: number;
  extracted_at: string;
}

// ---------------------------------------------------------------------------
// Content cleaning
// ---------------------------------------------------------------------------

function cleanContentHtml(rawHtml: string): string {
  const $ = cheerio.load(rawHtml, { decodeEntities: false });

  // Strip the h1 (contains noisy column prefix; title is stored separately)
  $('h1').first().remove();

  // Strip the lede h2 (captured as excerpt separately)
  $('h2').first().remove();

  // Strip old-site chrome: date div, time element, clearfix toolbar
  $('div.clearfix').remove();
  $('time').remove();

  // Strip the first image-only paragraph (legacy inline article image)
  let removedFirstImg = false;
  $('p').each((_: number, el: any) => {
    if (removedFirstImg) return;
    const $p = $(el);
    if ($p.find('img').length > 0 && $p.text().replace(/ /g, '').trim() === '') {
      $p.remove();
      removedFirstImg = true;
    }
  });

  // Strip bio/signature paragraphs at the bottom
  $('p').each((_: number, el: any) => {
    const $el = $(el);
    const inner = $el.html() ?? '';
    const text = $el.text();
    if (BIO_SIGNALS.some((sig) => inner.includes(sig) || text.includes(sig))) {
      $el.remove();
    }
  });

  // Strip CloudFlare email-protection links (entire parent paragraph)
  $('a.__cf_email__, a[data-cfemail]').closest('p').remove();

  // Strip leading <br> from first content paragraph
  $('p br:first-child').remove();

  // Strip empty or whitespace-only paragraphs
  $('p').each((_: number, el: any) => {
    if ($(el).text().replace(/ /g, '').trim() === '') $(el).remove();
  });

  return ($('body').html() ?? '').trim();
}

function htmlToPlainText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Slug generation
// ---------------------------------------------------------------------------

function generateSlug(title: string, contentText: string): string {
  const combined = title + ' ' + contentText.slice(0, 600);
  const matched: string[] = [];

  for (const [hebrew, english] of SLUG_KEYWORD_MAP) {
    if (!combined.includes(hebrew)) continue;
    // Avoid duplicate root words
    if (matched.some((m) => m.split('-')[0] === english.split('-')[0])) continue;
    matched.push(english);
    if (matched.length >= 2) break;
  }

  if (matched.length === 0) return 'parenting-article';

  const slug = matched
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Hard limit: 5 words (hyphens as separators)
  return slug.split('-').slice(0, 5).join('-') || 'parenting-article';
}

// ---------------------------------------------------------------------------
// Tag generation
// ---------------------------------------------------------------------------

function generateTags(title: string, contentText: string): string {
  const combined = title + ' ' + contentText;
  const selected: string[] = [AUTHOR_NAME]; // always include author tag

  for (const { tag, keywords } of TAG_POOL) {
    if (keywords.some((kw) => combined.includes(kw))) {
      selected.push(tag);
    }
    if (selected.length >= 5) break;
  }

  return selected.join(',');
}

// ---------------------------------------------------------------------------
// SEO text generation
// ---------------------------------------------------------------------------

function generateSeoTitle(title: string): string {
  // Append author attribution if it fits within ~60 chars
  const withAuthor = title + ' - ' + AUTHOR_NAME;
  if (withAuthor.length <= 60) return withAuthor;
  if (title.length <= 60) return title;
  return title.slice(0, 57).trim() + '...';
}

function generateMetaDescription(excerpt: string, title: string): string {
  const base = excerpt.replace(/\s+/g, ' ').trim();

  if (base.length >= 140 && base.length <= 165) return base;

  if (base.length > 0 && base.length < 140) {
    // Light extension preserving natural tone
    const ext = base + ' קראו עוד במאמרה של ' + AUTHOR_NAME + '.'; // קראו עוד במאמרה של נירה גבאי.
    if (ext.length <= 165) return ext;
    return base;
  }

  if (base.length > 165) {
    // Trim to sentence boundary
    const cutoff = base.slice(0, 165);
    const lastPeriod = Math.max(cutoff.lastIndexOf('.'), cutoff.lastIndexOf('?'), cutoff.lastIndexOf('!'));
    if (lastPeriod > 120) return cutoff.slice(0, lastPeriod + 1).trim();
    return cutoff.trim();
  }

  // No excerpt available - derive from title
  return 'מאמר מאת ' + AUTHOR_NAME + ' על ' + title + '.'; // מאמר מאת נירה גבאי על {title}.
}

function generateExcerpt(rawExcerpt: string | null, contentText: string): string {
  if (rawExcerpt && rawExcerpt.trim().length > 40) {
    return rawExcerpt.replace(/\s+/g, ' ').trim();
  }
  if (!contentText) return '';
  const candidate = contentText.slice(0, 300);
  const lastPeriod = Math.max(
    candidate.lastIndexOf('.'),
    candidate.lastIndexOf('?'),
    candidate.lastIndexOf('!'),
  );
  return lastPeriod > 180
    ? candidate.slice(0, lastPeriod + 1).trim()
    : candidate.slice(0, 250).trim();
}

// ---------------------------------------------------------------------------
// RTL sanity check
// ---------------------------------------------------------------------------

// Known reversed forms of Hebrew constants used in generated fields.
// If any of these appear in a generated string, Hebrew storage is reversed.
const REVERSED_HEBREW_SIGNALS: string[] = [
  'יאבג הרינ',       // reversed: נירה גבאי
  'דוע וארק',         // reversed: קראו עוד
  'יתחפשמה',          // reversed: המשפחתי
  'ינרדומה',           // reversed: המודרני
  'םידליו םירוה',    // reversed: הורים וילדים
  'ישגר לופיט',      // reversed: טיפול רגשי
  'יתחפשמ ךרעמ',    // reversed: מערך משפחתי
  'םירוה תייחנה',   // reversed: הנחיית הורים
];

function checkRtlFields(fields: Record<string, string>): string[] {
  const warnings: string[] = [];
  for (const [fieldName, value] of Object.entries(fields)) {
    if (REVERSED_HEBREW_SIGNALS.some((sig) => value.includes(sig))) {
      warnings.push(
        'Possible reversed Hebrew detected in generated fields (' + fieldName + ')',
      );
    }
  }
  return warnings;
}

// ---------------------------------------------------------------------------
// Image strategy
// ---------------------------------------------------------------------------

interface ImageStrategy {
  concept: string;
  prompt: string;
  alt: string;
}

function generateImageStrategy(title: string, contentText: string): ImageStrategy {
  const text = title + ' ' + contentText.slice(0, 400);

  // Birth order / siblings / family system
  if (
    text.includes('מיקום') || // מיקום
    text.includes('משפחתי') || // המשפחתי, מערך המשפחתי
    text.includes('בכור') || // בכור
    text.includes('אחים')                                    // אחים
  ) {
    return {
      concept:
        'קומפוזיציה אבסטרקטית של שלושה אלמנטים רכים בגבהים שונים - ייצוג מודרני ועדין של מיקום ודינמיקה במערך המשפחתי', // abstract composition representing birth order
      prompt:
        'Abstract editorial illustration: three organic rounded forms of slightly different sizes, arranged at different heights, softly overlapping to suggest connection and gentle hierarchy. Warm amber, ivory, and soft terracotta color palette. Subtle shadow depth and smooth gradient lighting from above. One form slightly larger and higher, one mid-level, one smaller and lower - representing different family positions. Clean, modern, premium editorial style. No text. No faces. No literal children or figures. No logos. No stock illustration style. Calm, trustworthy, sophisticated atmosphere suitable for a professional therapist website.',
      alt:
        'קומפוזיציה אבסטרקטית של שלושה צורות רכות בגבהים שונים - ייצוג עדין של מיקום ודינמיקה במשפחה', // abstract composition of three soft shapes at different heights
    };
  }

  // Couples / relationship
  if (
    text.includes('זוגיות') || // זוגיות
    text.includes('בני זוג')    // בני זוג
  ) {
    return {
      concept:
        'שתי צורות אורגניות רכות הנוטות זו לזו - ייצוג אבסטרקטי מודרני של קרבה וחיבור בין שני אנשים', // two organic forms leaning toward each other
      prompt:
        'Abstract editorial illustration: two organic rounded forms leaning gently toward each other, nearly touching, on a warm cream background. Soft amber and dusty rose tones. Smooth gradient lighting, subtle shadow. Conveys closeness, trust, and quiet intimacy without being literal. Modern, premium, clean composition. No text. No faces. No literal figures. No logos. Suitable for a professional therapist website focused on relationships.',
      alt:
        'שתי צורות רכות הנוטות זו לזו - ייצוג עדין של קרבה וחיבור זוגי', // two soft forms leaning toward each other - representation of closeness
    };
  }

  // Parenting / child education
  if (
    text.includes('הורים') || // הורים
    text.includes('חינוך')    // חינוך
  ) {
    return {
      concept:
        'צורה גדולה ורכה המקיפה בעדינות צורה קטנה יותר - ייצוג אבסטרקטי מודרני של הגנה, נוכחות הורית וחיבור', // large shape gently surrounding a smaller one
      prompt:
        'Abstract editorial illustration: one larger organic rounded form gently enveloping a smaller form, suggesting protection and attentive presence. Warm amber and soft cream tones. Smooth gradient, subtle inner glow. Conveys care, safety, and connection without being literal or sentimental. Modern, premium, editorial composition. No text. No faces. No literal parent or child figures. No logos. Suitable for a professional therapist website focused on parenting.',
      alt:
        'צורה גדולה המקיפה בעדינות צורה קטנה - ייצוג של נוכחות הורית וחיבור', // large form gently surrounding a smaller one - parental presence
    };
  }

  // Default: personal growth / inner reflection
  return {
    concept:
      'צורה אורגנית בודדת באור חם ושקט - ייצוג אבסטרקטי מודרני של תהליך פנימי, הסתכלות עצמית ושקט', // single organic form in warm quiet light
    prompt:
      'Abstract editorial illustration: a single organic rounded form resting in warm, quiet light on a cream background. Soft amber and ivory tones. Gentle gradient, subtle shadow beneath. Conveys stillness, inner presence, and calm self-awareness. Modern, premium, clean composition. No text. No face. No literal human figure. No logos. No clinical or sad imagery. Suitable for a professional therapist website focused on personal growth.',
    alt:
      'צורה אורגנית בודדת באור חם ושקט - ייצוג של תהליך פנימי ושקט', // single organic form in warm quiet light - inner process
  };
}

// ---------------------------------------------------------------------------
// Internal linking
// ---------------------------------------------------------------------------

function buildInternalLinking(
  title: string,
  contentText: string,
  primaryCategory: string,
  topicCluster: string,
): object {
  const text = title + ' ' + contentText;
  const secondary: string[] = [];
  const anchors: string[] = [];
  const queries: string[] = [];

  if (text.includes('זוגיות')) secondary.push('זוגיות ודינמיקה משפחתית'); // זוגיות ודינמיקה משפחתית
  if (text.includes('בטחון עצמי')) secondary.push('ביטחון עצמי ותדמית עצמית'); // ביטחון עצמי ותדמית עצמית
  if (text.includes('גבולות')) secondary.push('הצבת גבולות בריאים'); // הצבת גבולות בריאים
  if (text.includes('תקשורת')) secondary.push('תקשורת בין-אישית'); // תקשורת בין-אישית
  if (text.includes('אדלר')) secondary.push('פסיכולוגיה אדלריאנית'); // פסיכולוגיה אדלריאנית

  // Descriptive anchor texts -- no generic labels
  anchors.push('מיקום הילד במשפחה ומשמעותו'); // מיקום הילד במשפחה ומשמעותו
  if (text.includes('בכור')) anchors.push('דינמיקה של ילד בכור'); // דינמיקה של ילד בכור
  if (text.includes('מוסר')) anchors.push('מוסר וצדק בין אחים'); // מוסר וצדק בין אחים
  if (text.includes('זוגיות')) anchors.push('השפעת המשפחה על הזוגיות'); // השפעת המשפחה על הזוגיות

  queries.push('הנחיית הורים נירה גבאי'); // הנחיית הורים נירה גבאי
  queries.push('זוגיות ומשפחה'); // זוגיות ומשפחה
  queries.push('ביטחון עצמי ילדים הורות'); // ביטחון עצמי ילדים הורות
  if (text.includes('אדלר')) queries.push('פסיכולוגיה אדלריאנית ילדים'); // פסיכולוגיה אדלריאנית ילדים

  return {
    primary_category: primaryCategory,
    topic_cluster: topicCluster,
    secondary_topics: secondary.slice(0, 4),
    suggested_anchor_texts: anchors.slice(0, 4),
    suggested_related_article_queries: queries.slice(0, 4),
    needs_link_resolution: true,
  };
}

// ---------------------------------------------------------------------------
// Quality checks
// ---------------------------------------------------------------------------

function buildWarnings(params: {
  title: string;
  slug: string;
  contentText: string;
  contentHtml: string;
  excerpt: string;
  metaDescription: string;
  canonicalUrl: string;
  imageStrategy: ImageStrategy;
  sourceUrl: string;
  tags: string;
  internalLinking: object;
  authorName: string;
}): string[] {
  const {
    title, slug, contentText, contentHtml,
    excerpt, metaDescription, canonicalUrl,
    imageStrategy, sourceUrl, tags, internalLinking, authorName,
  } = params;

  const warnings: string[] = [];

  if (!title) warnings.push('MISSING: title');
  if (!slug) warnings.push('MISSING: slug');
  if (contentText.length < 500) warnings.push('WARN: content under 500 chars (' + contentText.length + ')');
  if (!excerpt) warnings.push('MISSING: excerpt');
  if (!metaDescription) warnings.push('MISSING: meta_description');
  if (!canonicalUrl.startsWith(CANONICAL_BASE)) {
    warnings.push('CRITICAL: canonical_url is not on ' + CANONICAL_BASE);
  }
  if (contentHtml.includes(sourceUrl) || contentHtml.includes('m-y-net')) {
    warnings.push('WARN: old source domain may appear in content HTML');
  }
  if (!imageStrategy.prompt) warnings.push('MISSING: image_prompt');
  if (!imageStrategy.alt) warnings.push('MISSING: image_alt');

  for (const signal of OLD_SITE_SIGNALS) {
    if (contentHtml.includes(signal)) {
      warnings.push('WARN: old-site CSS class "' + signal + '" found in content HTML');
    }
  }

  // RTL sanity check on all generated Hebrew fields
  const il = internalLinking as Record<string, unknown>;
  const rtlFields: Record<string, string> = {
    title,
    excerpt,
    metaDescription,
    tags,
    image_concept: imageStrategy.concept,
    image_alt: imageStrategy.alt,
    author_name: authorName,
    primary_category: String(il.primary_category ?? ''),
    topic_cluster: String(il.topic_cluster ?? ''),
    secondary_topics: (il.secondary_topics as string[] ?? []).join(' '),
    suggested_anchor_texts: (il.suggested_anchor_texts as string[] ?? []).join(' '),
  };
  warnings.push(...checkRtlFields(rtlFields));

  return warnings;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log('='.repeat(60));
  console.log('Article candidate prep -- local dry-run');
  console.log('='.repeat(60));
  console.log('Input: ', INPUT_FILE);
  console.log('Output:', OUTPUT_FILE);
  console.log();

  if (!fs.existsSync(INPUT_FILE)) {
    console.error('Input file not found:', INPUT_FILE);
    console.error('Run "npm run extract:source-article" first.');
    process.exit(1);
  }

  const preview: ExtractedPreview = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));

  // --- Title ---
  const title = (preview.extracted_title ?? preview.source_title ?? '').replace(/\s+/g, ' ').trim();
  const h1 = title;

  if (!title) {
    console.error('No title available in input. Cannot proceed.');
    process.exit(1);
  }

  // --- Clean content HTML ---
  const contentHtml = cleanContentHtml(preview.extracted_content ?? '');
  const contentText = htmlToPlainText(contentHtml);

  // --- Excerpt ---
  const excerpt = generateExcerpt(preview.extracted_excerpt, contentText);

  // --- Slug and canonical ---
  const slug = generateSlug(title, preview.extracted_text ?? '');
  const canonicalSlug = slug;
  const canonicalUrl = CANONICAL_BASE + '/articles/' + slug;

  // --- SEO fields ---
  const seoTitle = generateSeoTitle(title);
  const metaDescription = generateMetaDescription(excerpt, title);

  // --- Tags ---
  const tags = generateTags(title, preview.extracted_text ?? '');

  // --- Categories ---
  const primaryCategory = 'הורות וחינוך'; // הורות וחינוך
  const topicCluster = 'דינמיקה משפחתית'; // דינמיקה משפחתית

  // --- Image strategy ---
  const imageStrategy = generateImageStrategy(title, preview.extracted_text ?? '');

  // --- Internal linking ---
  const internalLinking = buildInternalLinking(title, preview.extracted_text ?? '', primaryCategory, topicCluster);

  // --- Focus keywords (derived from content, not AI-generated) ---
  const focusKeywords: string[] = [];
  const kwText = title + ' ' + (preview.extracted_text ?? '').slice(0, 800);
  if (kwText.includes('מיקום')) focusKeywords.push('מיקום הילד במשפחה'); // מיקום הילד במשפחה
  if (kwText.includes('מערך')) focusKeywords.push('מערך משפחתי'); // מערך משפחתי
  if (kwText.includes('בכור')) focusKeywords.push('ביכור במשפחה'); // בכור במשפחה
  if (kwText.includes('סדר') || kwText.includes('לידה')) focusKeywords.push('סדר לידה'); // סדר לידה
  if (kwText.includes('אדלר')) focusKeywords.push('אדלר משפחה'); // אדלר משפחה

  // --- Reader problem and article purpose (derived from content) ---
  const readerProblem =
    'הורים ומטופלים המחפשים הבנה של הדפוסים שיצר בהם מקומם במשפחה והשפעתו על אישיותם'; // הורים ומטופלים המחפשים הבנה של הדפוסים שיצר בהם מקומם במשפחה והשפעתו על אישיותם
  const articlePurpose =
    'הסבר גישת אדלר למשמעות המיקום במערך המשפחתי וכיצד הוא עשוי להשפיע על תפיסה עצמית ועל תפקוד בזוגיות ובחברה'; // הסבר גישת אדלר למשמעות המיקום במערך המשפחתי וכיצד הוא עשוי להשפיע על תפיסה עצמית ועל תפקוד בזוגיות ובחברה

  // --- Quality warnings (includes RTL check) ---
  const warnings = buildWarnings({
    title, slug, contentText, contentHtml,
    excerpt, metaDescription, canonicalUrl,
    imageStrategy, sourceUrl: preview.source_url,
    tags, internalLinking, authorName: AUTHOR_NAME,
  });

  // --- Build candidate ---
  const candidate = {
    source: {
      queue_id: preview.queue_id,
      source_url_private: preview.source_url,
      source_title: preview.source_title,
      extracted_at: preview.extracted_at,
    },
    article_candidate: {
      original_title: title,
      title,
      h1,
      slug,
      content: contentHtml,
      excerpt,
      reading_time: preview.reading_time,
      tags,
      is_published: false,
    },
    seo: {
      seo_title: seoTitle,
      meta_description: metaDescription,
      canonical_url: canonicalUrl,
      canonical_slug: canonicalSlug,
      og_title: seoTitle,
      og_description: excerpt,
      focus_keywords: focusKeywords,
      search_intent: 'informational',
      reader_problem: readerProblem,
      article_purpose: articlePurpose,
      needs_ai_optimization: true,
    },
    image_strategy: {
      use_legacy_image: false,
      needs_new_image_generation: true,
      image_concept: imageStrategy.concept,
      image_prompt: imageStrategy.prompt,
      image_alt: imageStrategy.alt,
      image_style:
        'modern, calm, professional, warm, emotionally sensitive, suitable for a therapist website',
      avoid: [
        'stock photo look',
        'overly medical look',
        'dramatic facial expressions',
        'sad or frightening imagery',
        'text inside image',
        'logos',
        'old website branding',
      ],
    },
    structured_data_candidate: {
      schema_type: 'Article',
      headline: title,
      description: excerpt,
      author: { type: 'Person', name: AUTHOR_NAME },
      publisher: { type: 'Person', name: AUTHOR_NAME },
      main_entity_of_page: canonicalUrl,
      image: null,
      needs_schema_validation: true,
    },
    internal_linking: internalLinking,
    migration: {
      future_canonical_url: canonicalUrl,
      old_source_url_private: preview.source_url,
      migration_status: 'candidate_prepared',
      public_source_attribution: false,
      needs_redirect: false,
      notes:
        'Old source URL is kept only as private import metadata. It must not be used as canonical or public SEO metadata.',
    },
    quality: {
      content_length: contentText.length,
      has_title: !!title,
      has_excerpt: !!excerpt,
      has_content: contentText.length > 0,
      has_new_image_prompt: !!imageStrategy.prompt,
      warnings,
    },
    prepared_at: new Date().toISOString(),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(candidate, null, 2), 'utf-8');

  // --- Console summary ---
  console.log('='.repeat(60));
  console.log('Candidate prepared');
  console.log('='.repeat(60));
  console.log('Title:           ', title);
  console.log('H1:              ', h1);
  console.log('SEO title:       ', seoTitle);
  console.log('Slug:            ', slug);
  console.log('Canonical URL:   ', canonicalUrl);
  console.log('Excerpt:         ', excerpt.slice(0, 120) + (excerpt.length > 120 ? '...' : ''));
  console.log('Meta description:', metaDescription.slice(0, 110) + (metaDescription.length > 110 ? '...' : ''));
  console.log('Content length:  ', contentText.length, 'chars');
  console.log('Reading time:    ', preview.reading_time, 'min');
  console.log('Tags:            ', tags);
  console.log('Image concept:   ', imageStrategy.concept);
  console.log('Image prompt:    ', imageStrategy.prompt.slice(0, 100) + '...');
  console.log('Image alt:       ', imageStrategy.alt);
  if (warnings.length > 0) {
    console.log('\nWarnings (' + warnings.length + '):');
    warnings.forEach((w) => console.log('  [!] ' + w));
  } else {
    console.log('\nNo warnings.');
  }
  console.log('\nOutput file:', OUTPUT_FILE);
  console.log('='.repeat(60));
}

main();
