import { SeoPackage, SeoFinding, SeoValidationResult, ExistingArticleRef } from './types';
import {
  stripToPlainText,
  extractHeadings,
  wordCount,
  hebrewLetterRatio,
  hasHebrew,
  avgSentenceWords,
  longestParagraphChars,
  contentTokens,
  tokenOverlap,
} from './text';

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Deduction weights per severity, applied to a 100 baseline.
const PENALTY = { error: 22, warn: 8, info: 0 } as const;

// Broad head terms that are useless as a focus keyword for a small site.
// Specific one-word terms (e.g. "פרפקציוניזם", "CBT") remain allowed.
// Exported so lib/seo/generate.ts's keyword picker can avoid choosing these
// as the primary focus keyword in the first place, instead of relying on
// this validator to catch it after the fact.
export const GENERIC_KEYWORDS = new Set([
  'ילדים', 'ילד', 'הורים', 'הורות', 'מתבגרים', 'מתבגר', 'נוער', 'מבוגרים',
  'משפחה', 'זוגיות', 'חרדה', 'דיכאון', 'רגשות', 'שגרה', 'טיפול', 'קשר',
  'אהבה', 'תקשורת', 'יחסים', 'התמודדות',
]);

export function validateSeoPackage(
  pkg: SeoPackage,
  content: string,
  existing: ExistingArticleRef[],
): SeoValidationResult {
  const findings: SeoFinding[] = [];
  const add = (
    id: string,
    severity: SeoFinding['severity'],
    message: string,
    value?: string | number,
  ) => findings.push({ id, severity, message, value });

  const plain = stripToPlainText(content);
  const headings = extractHeadings(content);
  const h2s = headings.filter((h) => h.level === 2);
  const h1s = headings.filter((h) => h.level === 1);
  const words = wordCount(plain);
  const hebRatio = hebrewLetterRatio(plain);
  const longestP = longestParagraphChars(content);
  const avgSent = avgSentenceWords(plain);

  // 1. SEO title length
  const tLen = pkg.seo_title.length;
  if (tLen === 0) add('title_empty', 'error', 'כותרת SEO ריקה');
  else if (tLen > 65) add('title_long', 'error', `כותרת SEO ארוכה מדי (${tLen} תווים, יעד <=60)`, tLen);
  else if (tLen > 60) add('title_slightly_long', 'warn', `כותרת SEO מעט ארוכה (${tLen} תווים)`, tLen);
  else if (tLen < 20) add('title_short', 'warn', `כותרת SEO קצרה (${tLen} תווים)`, tLen);
  else add('title_ok', 'info', `אורך כותרת תקין (${tLen} תווים)`, tLen);

  // 2. Meta description length
  const dLen = pkg.meta_description.length;
  if (dLen === 0) add('desc_empty', 'error', 'meta description ריק');
  else if (dLen > 320) add('desc_too_long', 'error', `meta description ארוך מדי (${dLen} תווים)`, dLen);
  else if (dLen > 165) add('desc_long', 'warn', `meta description ארוך (${dLen} תווים, יעד 120-158)`, dLen);
  else if (dLen < 70) add('desc_short', 'warn', `meta description קצר (${dLen} תווים, יעד 120-158)`, dLen);
  else add('desc_ok', 'info', `אורך meta description תקין (${dLen} תווים)`, dLen);

  // 3. Slug
  if (!SLUG_RE.test(pkg.slug)) add('slug_invalid', 'error', `slug לא תקין (ASCII באותיות קטנות עם מקפים): "${pkg.slug}"`, pkg.slug);
  else if (pkg.slug.split('-').length > 6) add('slug_long', 'warn', `slug ארוך מדי (${pkg.slug.split('-').length} מקטעים)`, pkg.slug);
  else add('slug_ok', 'info', `slug תקין: ${pkg.slug}`, pkg.slug);

  // 4. Excerpt
  const eLen = pkg.excerpt.length;
  if (eLen < 50) add('excerpt_short', 'warn', `תקציר קצר (${eLen} תווים)`, eLen);
  else if (eLen > 320) add('excerpt_long', 'warn', `תקציר ארוך (${eLen} תווים)`, eLen);

  // 4b. Focus keyword quality - a generic one-word head term (e.g. "ילדים")
  // is unrankable for a small site and previously scored 100/100.
  const fk = (pkg.focus_keyword || '').trim();
  if (!fk) {
    add('focus_missing', 'error', 'חסרה מילת מפתח ראשית');
  } else if (GENERIC_KEYWORDS.has(fk)) {
    add('focus_generic', 'error', `מילת מפתח גנרית מדי ("${fk}") - נדרש ביטוי ספציפי של 2+ מילים`, fk);
  } else if (!fk.includes(' ') && fk.length < 4) {
    add('focus_weak', 'warn', `מילת מפתח קצרה מאוד ("${fk}")`, fk);
  } else {
    add('focus_ok', 'info', `מילת מפתח: "${fk}"`, fk);
  }

  // 5. H1/H2 structure. Body H1s are demoted to H2 at render time
  // (app/articles/[slug] markdownComponents), so live pages keep a single H1 -
  // this flags the fragile source markdown, not a live SEO defect.
  if (h1s.length > 0) add('content_has_h1', 'warn', `התוכן מכיל H1 (${h1s.length}) - מומרות ל-H2 בתצוגה, אך עדיף לתקן במקור`, h1s.length);
  if (h2s.length === 0) add('no_h2', 'warn', 'אין כותרות H2 בתוכן - מומלץ לפחות 2 לקריאות וסריקה');
  else if (h2s.length < 2) add('few_h2', 'warn', `מעט כותרות H2 (${h2s.length})`, h2s.length);
  else add('h2_ok', 'info', `${h2s.length} כותרות H2`, h2s.length);

  // 6. Hebrew RTL readability
  if (hebRatio < 0.4) add('not_hebrew', 'error', `התוכן אינו עברית ברובו (יחס אותיות עברית ${hebRatio.toFixed(2)})`, hebRatio.toFixed(2));
  else if (hebRatio < 0.6) add('low_hebrew', 'warn', `יחס עברית נמוך (${hebRatio.toFixed(2)})`, hebRatio.toFixed(2));
  if (avgSent > 32) add('long_sentences', 'warn', `משפטים ארוכים בממוצע (${avgSent.toFixed(0)} מילים) - מקשה על קריאה`, Math.round(avgSent));
  if (longestP > 700) add('long_paragraph', 'warn', `פסקה ארוכה מאוד (${longestP} תווים) - כדאי לפצל`, longestP);

  // 7. Cannibalization / duplicate risk
  const myTitleTokens = contentTokens(pkg.seo_title);
  let cannibal = false;
  for (const a of existing) {
    if (a.slug === pkg.slug) {
      add('slug_collision', 'error', `slug כבר קיים: /articles/${a.slug}`, a.slug);
      cannibal = true;
      continue;
    }
    if (a.focus_keyword && a.focus_keyword.trim() && a.focus_keyword.trim() === pkg.focus_keyword.trim()) {
      add('dup_focus_keyword', 'error', `מילת מפתח ראשית זהה למאמר קיים (/articles/${a.slug}): "${pkg.focus_keyword}"`, a.slug);
      cannibal = true;
    }
    const overlap = tokenOverlap(myTitleTokens, contentTokens(a.title));
    if (overlap >= 0.6) {
      // High overlap with a PUBLISHED article is a blocking error - this is how
      // duplicate "twin" imports of already-published articles slip through.
      if (a.is_published) {
        add('title_cannibalization', 'error', `חפיפת כותרת גבוהה (${(overlap * 100).toFixed(0)}%) עם מאמר מפורסם /articles/${a.slug}`, a.slug);
      } else {
        add('title_cannibalization_draft', 'warn', `חפיפת כותרת גבוהה (${(overlap * 100).toFixed(0)}%) עם טיוטה /articles/${a.slug}`, a.slug);
      }
      cannibal = true;
    }
  }
  if (!cannibal) add('no_cannibalization', 'info', 'אין סיכון קניבליזציה מול מאמרים קיימים');

  // 8. Internal linking opportunities
  if (existing.length > 0 && pkg.internal_links.length === 0) {
    add('no_internal_links', 'warn', 'לא נמצאו הזדמנויות לקישור פנימי - שקול לקשר למאמר קשור');
  } else if (pkg.internal_links.length > 0) {
    add('internal_links_ok', 'info', `${pkg.internal_links.length} הצעות לקישור פנימי`, pkg.internal_links.length);
  }

  // 9. Image alt quality
  const alt = pkg.image_alt.trim();
  if (!alt) add('alt_missing', 'warn', 'חסר טקסט חלופי (alt) לתמונה');
  else if (alt.length < 10) add('alt_short', 'warn', `alt קצר מדי (${alt.length} תווים)`, alt.length);
  else if (alt.length > 125) add('alt_long', 'warn', `alt ארוך מדי (${alt.length} תווים)`, alt.length);
  else if (!hasHebrew(alt)) add('alt_not_hebrew', 'warn', 'ה-alt אינו בעברית');
  else add('alt_ok', 'info', 'טקסט alt תקין');

  // 10. Schema validity (BlogPosting)
  const s = pkg.schema_json as Record<string, unknown>;
  const required = ['headline', 'author', 'publisher', 'datePublished'];
  const missing = required.filter((k) => !s[k]);
  if (missing.length > 0) add('schema_missing', 'error', `schema_json חסר שדות: ${missing.join(', ')}`);
  else add('schema_ok', 'info', 'schema BlogPosting תקין');

  // 11. E-E-A-T signals - mental health is YMYL, so depth matters more:
  // under 300 words blocks, under 600 flags.
  if (words < 300) add('thin_content', 'error', `תוכן דק מאוד (${words} מילים, מינימום 300)`, words);
  else if (words < 600) add('shallow_content', 'warn', `תוכן קצר לנושא YMYL (${words} מילים, יעד 600+)`, words);
  else add('content_depth_ok', 'info', `${words} מילים`, words);

  // 12. GEO / AI search readiness
  if (pkg.faq_json && pkg.faq_json.mainEntity.length > 0) {
    add('geo_faq', 'info', `${pkg.faq_json.mainEntity.length} שאלות FAQ - מצוין לציטוט ב-AI`);
  } else {
    add('geo_no_faq', 'info', 'אין FAQ - שקול להוסיף שאלות ותשובות לשיפור נראות ב-AI search');
  }

  // Score
  let score = 100;
  for (const f of findings) score -= PENALTY[f.severity];
  score = Math.max(0, Math.min(100, score));

  const passed = !findings.some((f) => f.severity === 'error');

  return {
    passed,
    score,
    findings,
    metrics: {
      word_count: words,
      hebrew_letter_ratio: Number(hebRatio.toFixed(3)),
      h2_count: h2s.length,
      has_h1: h1s.length > 0,
      longest_paragraph_chars: longestP,
      avg_sentence_words: Number(avgSent.toFixed(1)),
    },
  };
}
