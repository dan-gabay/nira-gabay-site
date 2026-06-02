#!/usr/bin/env tsx
/**
 * run-article-import-pipeline.ts
 *
 * Manually-triggered batch pipeline. Claude Code is the writing agent.
 * Selects pending items from article_import_queue, extracts content,
 * rewrites (via Claude Code or OpenAI fallback), and inserts into
 * public.articles as unpublished drafts. Saves image prompt metadata
 * to article_draft_metadata after each successful insert.
 *
 * Default: dry-run (no Supabase writes)
 * Active:  --insert --mark-queue --skip-images
 *
 * Pre-written rewrites from Claude Code can be injected via:
 *   --rewrite-source data/rewrite-source.json
 *   Format: { "<queue_id>": { "content": "...", "risk_level": "low", ... } }
 *
 * Safety rules enforced:
 * - is_published always false
 * - image_url always null
 * - No old source URLs in public article fields
 * - No em dash characters
 * - Slug is ASCII lowercase hyphenated
 * - Duplicate slug check before any insert
 * - No secrets printed
 */

import * as cheerio from 'cheerio';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { generateAndValidateSeo, htmlToMarkdown } from '../lib/seo';
import type { ExistingArticleRef, SeoResult } from '../lib/seo';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), 'data');
const RESULT_FILE = path.join(DATA_DIR, 'article-import-pipeline-run-result.json');
const CANONICAL_BASE = 'https://www.niragabay.com';
const CREATED_BY_AGENT = 'article_import_agent';
const HEBREW_WPM = 200;

// Public article columns + the SEO columns the article page and metadata read.
// (source_url is intentionally NOT included - old source URLs must never be
// written to the public articles table.)
const ALLOWED_COLUMNS = new Set([
  // base public columns
  'id', 'title', 'slug', 'content', 'excerpt', 'image_url',
  'reading_time', 'likes_count', 'views_count', 'tags',
  'is_published', 'created_date', 'updated_date', 'created_by_id', 'created_by',
  'is_sample',
  // SEO columns (generated + validated by lib/seo)
  'meta_title', 'meta_description', 'focus_keyword', 'secondary_keywords',
  'seo_score', 'canonical_url', 'faq', 'internal_links', 'schema_json',
  'seo_package', 'status', 'optimized_at', 'imported_at', 'content_hash',
]);

const STANDARD_NEGATIVE_PROMPT = [
  'text, words, letters, numbers, labels, captions, watermark, signature',
  'logos, icons, symbols, brand marks',
  'human figures, people, faces, hands, body parts, children, portraits',
  'medical imagery, clinical imagery, hospital, therapy couch, stethoscope',
  'dark imagery, violent imagery, fearful imagery, sad imagery',
  'dramatic contrast, neon colors, bright saturated colors, harsh lighting',
  'stock photo look, stock illustration, cartoon style, childish illustration',
  'anime, manga, digital art cliche, 3D render, CGI',
  'old website branding, vintage, retro, photo-realistic photography',
  'blurry, low quality, distorted, artifact',
].join(', ');

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------

const cliArgs = process.argv.slice(2);
const DRY_RUN = !cliArgs.includes('--insert');
const DO_INSERT = cliArgs.includes('--insert');
const DO_MARK_QUEUE = cliArgs.includes('--mark-queue');
const SKIP_AI_REWRITE = cliArgs.includes('--skip-ai-rewrite');
const SKIP_SEO_VALIDATION = cliArgs.includes('--skip-seo-validation');
const DO_GENERATE_IMAGE = cliArgs.includes('--generate-image') && !cliArgs.includes('--skip-images');
const CONTINUE_ON_ERROR = cliArgs.includes('--continue-on-error');
const EXPECTED_STATUS = (() => {
  const idx = cliArgs.indexOf('--expected-status');
  return idx !== -1 ? (cliArgs[idx + 1] ?? 'pending') : 'pending';
})();
const LIMIT = (() => {
  const idx = cliArgs.indexOf('--limit');
  return idx !== -1 ? Math.max(1, parseInt(cliArgs[idx + 1] ?? '1', 10)) : 1;
})();

// ---------------------------------------------------------------------------
// Rewrite source map (pre-written content from Claude Code)
// --rewrite-source data/rewrite-source.json
// ---------------------------------------------------------------------------

interface ExternalRewrite {
  content: string;
  risk_level?: string;
  rewrite_depth?: string;
  new_intro_added?: boolean;
  new_closing_added?: boolean;
  headings_rewritten?: boolean;
  sentence_by_sentence_paraphrase?: boolean;
  original_structure_preserved?: boolean;
  recommendation?: string;
  notes?: string;
}

const REWRITE_SOURCE_MAP: Record<string, ExternalRewrite> = (() => {
  const idx = cliArgs.indexOf('--rewrite-source');
  if (idx === -1) return {};
  const sourcePath = cliArgs[idx + 1];
  if (!sourcePath) return {};
  try {
    return JSON.parse(fs.readFileSync(sourcePath, 'utf-8')) as Record<string, ExternalRewrite>;
  } catch (e: unknown) {
    console.error('[!] Could not load --rewrite-source:', sourcePath, e instanceof Error ? e.message : String(e));
    return {};
  }
})();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QueueItem {
  id: string;
  source_url: string;
  source_title: string | null;
  source_site: string | null;
  status: string;
  attempts: number;
  imported_article_id: string | null;
}

interface ExtractedContent {
  title: string | null;
  excerpt: string | null;
  contentHtml: string;
  contentText: string;
}

interface DuplicateContentRisk {
  risk_level: 'low' | 'medium' | 'high';
  rewrite_depth: 'substantial' | 'moderate' | 'light' | 'none';
  original_structure_preserved: boolean;
  new_intro_added: boolean;
  new_closing_added: boolean;
  headings_rewritten: boolean;
  sentence_by_sentence_paraphrase: boolean;
  recommendation: string;
  notes: string;
}

interface RewriteResult {
  content: string;
  risk: DuplicateContentRisk;
  skipped: boolean;
  skip_reason: string | null;
}

interface ArticleInsertPayload {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  image_url: null;
  reading_time: number;
  likes_count: number;
  views_count: number;
  tags: string;
  is_published: false;
  is_sample: false;
  created_date: string;
  updated_date: string;
  created_by_id: null;
  created_by: string;
  // SEO columns
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
  secondary_keywords: string[];
  seo_score: number;
  canonical_url: string;
  faq: unknown | null;
  internal_links: unknown;
  schema_json: unknown;
  seo_package: unknown;
  status: string;
  optimized_at: string;
  imported_at: string;
  content_hash: string;
}

interface ImagePromptData {
  concept: string;
  prompt: string;
  negative_prompt: string;
  alt: string;
}

interface PipelineItemResult {
  queue_id: string;
  source_url_private: string;
  source_title: string | null;
  status_before: string;
  article_id: string | null;
  slug: string | null;
  title: string | null;
  is_published: false | null;
  image_url: string | null;
  image_prompt_saved: boolean | null;
  duplicate_content_risk: DuplicateContentRisk | null;
  seo_score: number | null;
  seo_passed: boolean | null;
  seo_errors: string[];
  seo_warnings_count: number | null;
  queue_status: string | null;
  reconciliation: boolean;
  warnings: string[];
  error: string | null;
}

interface PipelineRunResult {
  mode: 'dry_run' | 'insert';
  limit: number;
  started_at: string;
  finished_at: string | null;
  articles_attempted: number;
  articles_inserted: number;
  articles_failed: number;
  articles_skipped: number;
  queue_updated: boolean;
  items: PipelineItemResult[];
}

// ---------------------------------------------------------------------------
// Extraction helpers
// ---------------------------------------------------------------------------

const NOISE_PREFIXES = ['הורים וילדים', 'מטה יהודה', 'בקיצור מטה יהודה'];
const TITLE_SUFFIX_TOKENS = ['| m-y-net', '- m-y-net', 'm-y-net |', 'm-y-net -', '| מטה יהודה', '- מטה יהודה'];
const SOFT_404_STRINGS = ['page not found', 'הדף לא נמצא', 'לא נמצא'];

const CONTENT_SELECTORS = [
  '#content section', '#content', '.entry-content', '.post-content',
  '.td-post-content', '.article-content', '.article-body',
  '[itemprop="articleBody"]', '.post-body', '.single-content',
  'article .content', '.col-main',
];

const BOILERPLATE_SELECTORS = [
  'header', 'footer', 'nav', 'aside',
  '[class*="related"]', '[class*="recommend"]', '.widget', '.widget-area', '.sidebar',
  '.breadcrumbs', '.breadcrumb', '[class*="advertisement"]',
  '.ad', '.ads', '.advertisement', '.adsbygoogle',
  '.comments', '#comments', '.comment-respond', '.comments-area',
  '[class*="social-share"]', '.newsletter', '.subscribe', '[class*="newsletter"]',
  '[class*="cookie"]', '.tags', '.tagcloud', '.post-tags',
  '[class*="read-more"]', '[class*="author-box"]', '[class*="sponsor"]',
  'script', 'style', 'noscript', 'iframe',
  '.tools', '.left-side', '.fb-comments', '#fb-root', '.pirsomet',
];

const TITLE_SELECTORS = [
  'h1.entry-title', 'h1.article-title', 'h1.post-title',
  'h1.td-page-title', '.single-article h1', 'article h1', '.entry h1', 'h1',
];

const BIO_SIGNALS = [
  'יועצת חינוכית', 'ממכון אדלר', 'מיניות בריאה',
  'email-protection', '__cf_email__', 'data-cfemail',
];

function stripTitleSuffix(title: string): string {
  for (const token of TITLE_SUFFIX_TOKENS) {
    const idx = title.indexOf(token);
    if (idx !== -1) title = title.slice(0, idx).trim();
  }
  return title;
}

function stripNoisePrefix(title: string): string {
  for (const prefix of NOISE_PREFIXES) {
    if (!title.startsWith(prefix)) continue;
    const rest = title.slice(prefix.length).trimStart();
    const sep = rest[0];
    if (sep === ':' || sep === '-' || sep === '–' || sep === '—' || sep === '|') {
      return rest.slice(1).trimStart();
    }
  }
  return title;
}

function cleanTitle(raw: string): string {
  let t = raw.trim();
  // This source renders the H1/og:title as "CATEGORY\n\nTITLE" (a breadcrumb
  // category line stacked above the headline). Drop the category line and the
  // embedded newlines so only the real title survives.
  if (/[\r\n]/.test(t)) {
    const lines = t.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) t = lines[lines.length - 1];
  }
  t = stripTitleSuffix(t);
  for (const sep of [' | ', ' - ', ' – ', ' — ']) {
    const parts = t.split(sep);
    if (parts.length > 1) {
      t = parts.reduce((a, b) => (a.length >= b.length ? a : b)).trim();
      break;
    }
  }
  return stripNoisePrefix(t);
}

function isSoft404(bodyText: string): boolean {
  const lower = bodyText.toLowerCase();
  return SOFT_404_STRINGS.some(s => lower.includes(s.toLowerCase()));
}

function estimateReadingTime(text: string): number {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / HEBREW_WPM));
}

function resolveRelativeUrls(html: string, pageUrl: string): string {
  try {
    const origin = new URL(pageUrl).origin;
    return html
      .replace(/src="\.\/([^"]*)"/g, `src="${origin}/$1"`)
      .replace(/src="\/([^"]*)"/g, `src="${origin}/$1"`)
      .replace(/href="\.\/([^"]*)"/g, `href="${origin}/$1"`)
      .replace(/href="\/([^"]*)"/g, `href="${origin}/$1"`);
  } catch {
    return html;
  }
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NiraGabayBot/1.0; +https://www.niragabay.com)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.error('HTTP error: ' + res.status + ' ' + res.statusText);
      return null;
    }
    return await res.text();
  } catch (err: unknown) {
    console.error('Fetch failed:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

// Some source pages serve the magazine's SITE-WIDE og/meta description (its tagline,
// e.g. "האתר של מגזין בקיצור - המגזין של מטה יהודה") on articles that lack their own.
// That boilerplate must never become an article excerpt or meta description.
const BOILERPLATE_DESCRIPTION_MARKERS = ['מטה יהודה', 'מגזין בקיצור', 'האתר של מגזין'];
function isBoilerplateDescription(text: string | null | undefined): boolean {
  if (!text) return false;
  return BOILERPLATE_DESCRIPTION_MARKERS.some((m) => text.includes(m));
}

function extractContent(html: string, pageUrl: string): ExtractedContent {
  const $ = cheerio.load(html);

  const ogTitle = ($('meta[property="og:title"]').attr('content') ?? '').trim();
  const ogDescriptionRaw = ($('meta[property="og:description"]').attr('content') ?? '').trim();
  const metaDescriptionRaw = ($('meta[name="description"]').attr('content') ?? '').trim();
  // Drop site-wide boilerplate so it can't leak into the excerpt.
  const ogDescription = isBoilerplateDescription(ogDescriptionRaw) ? '' : ogDescriptionRaw;
  const metaDescription = isBoilerplateDescription(metaDescriptionRaw) ? '' : metaDescriptionRaw;
  const rawPageTitle = ($('title').text() ?? '').trim();

  let rawTitle: string | null = null;
  for (const sel of TITLE_SELECTORS) {
    const text = $(sel).first().text().trim();
    if (text.length > 4) { rawTitle = text; break; }
  }
  if (!rawTitle && ogTitle.length > 4) rawTitle = ogTitle;
  if (!rawTitle && rawPageTitle.length > 4) rawTitle = rawPageTitle;
  const title = rawTitle ? cleanTitle(rawTitle) : null;

  for (const sel of BOILERPLATE_SELECTORS) $(sel).remove();

  let $container: ReturnType<typeof $> | null = null;
  for (const sel of CONTENT_SELECTORS) {
    const found = $(sel).first();
    if (found.length > 0 && found.text().trim().length > 150) { $container = found; break; }
  }
  if (!$container) {
    const $a = $('article').first();
    if ($a.length > 0 && $a.text().trim().length > 150) $container = $a;
  }
  if (!$container) {
    const $m = $('main').first();
    if ($m.length > 0 && $m.text().trim().length > 150) $container = $m;
  }

  if (!$container) {
    return { title, excerpt: ogDescription || metaDescription || null, contentHtml: '', contentText: '' };
  }

  for (const sel of BOILERPLATE_SELECTORS) $container.find(sel).remove();
  $container.find('p, div').each((_: number, el: any) => {
    if ($(el).text().trim() === '' && $(el).find('img').length === 0) $(el).remove();
  });

  const rawHtml = ($container.html() ?? '').trim();
  const contentHtml = resolveRelativeUrls(rawHtml, pageUrl);
  const contentText = $container.text().replace(/\s+/g, ' ').trim();
  const excerpt = ogDescription || metaDescription || (contentText.length > 0 ? contentText.slice(0, 250).trim() : null);

  return { title, excerpt: excerpt || null, contentHtml, contentText };
}

// ---------------------------------------------------------------------------
// Candidate prep helpers
// ---------------------------------------------------------------------------

// Multi-word phrases first (most specific), then single keywords.
// Order within the list determines which component appears first in compound slugs.
// The generator picks up to 2 matches; dedup is based on the first hyphen-segment.
const SLUG_KEYWORD_MAP: Array<[string, string]> = [
  // --- Multi-word phrases ---
  ['לדבר עם הילדים', 'talking-to-children'],
  ['המצב במדינה', 'current-events'],
  ['מצב חירום', 'emergency'],
  ['חופשת פסח', 'passover-break'],
  ['חופשת קיץ', 'summer-break'],
  ['ארוחת החג', 'holiday-meal'],
  ['לחזור לשגרה', 'back-to-school'],
  ['חרדת בחינות', 'exam-anxiety'],
  ['הישגיות', 'achievement'],   // 2nd token for exam-anxiety pieces, before generic 'חרדה'
  // Subject keyword: a teen-focused piece should slug as the subject, not an
  // incidental mention of the therapy room. Kept above 'חדר הטיפול' on purpose.
  ['מתבגר', 'adolescent'],
  ['שפת אהבה', 'love-language'],
  ['שפת האהבה', 'love-language'],
  ['מעגל הדיכאון', 'depression-cycle'],
  ['זיכרונות ילדות', 'childhood-memories'],
  ['זכרונות ילדות', 'childhood-memories'],   // alternate spelling without yod
  ['חדר הטיפול', 'therapy'],                 // maps to 'therapy' so compound stays 3 components
  ['הנחיית הורים', 'parent-coaching'],
  ['ביטחון עצמי', 'self-confidence'],
  ['יציאה מהארון', 'coming-out'],
  ['החופש הגדול', 'summer-break'],            // must precede 'תיאום ציפיות' for correct order
  ['חופש גדול', 'summer-break'],
  ['תיאום ציפיות', 'expectations'],
  // --- Single keywords ---
  ['דיכאון', 'depression'],
  ['מיקום', 'birth-order'],
  ['משפחתי', 'family-dynamics'],
  ['בכור', 'firstborn'],
  ['אחים', 'siblings'],
  ['התמכרות', 'addiction'],
  ['נוער', 'youth'],
  ['זוגיות', 'couples'],
  ['תקשורת', 'communication'],
  ['גבולות', 'boundaries'],
  ['שגרה', 'routine'],   // 'back-to-routine' pieces: routine as 2nd token, before anxiety
  ['חרדה', 'anxiety'],
  ['רגשות', 'emotions'],
  ['הורים', 'parenting'],
  ['ילדים', 'children'],
  ['משפחה', 'family'],
  ['טיפול', 'therapy'],
  ['שינוי', 'change'],
  ['יחסים', 'relationships'],
  ['אהבה', 'love'],
  ['קשר', 'relationship'],
];

const TAG_POOL: Array<{ tag: string; keywords: string[] }> = [
  { tag: 'הורים וילדים', keywords: ['הורים', 'ילדים', 'הורות'] },
  { tag: 'משפחה', keywords: ['משפחה', 'משפחתי', 'אחים', 'בכור', 'מערך'] },
  { tag: 'זוגיות', keywords: ['זוגיות', 'זוגי', 'בני זוג', 'אהבה'] },
  { tag: 'טיפול רגשי', keywords: ['טיפול', 'מטופל', 'קליניקה', 'פסיכותרפיה', 'אדלר'] },
  { tag: 'יחסים', keywords: ['יחסים', 'קשר', 'מערכת יחסים'] },
  { tag: 'תקשורת', keywords: ['תקשורת', 'שיחה', 'דיאלוג'] },
  { tag: 'התפתחות אישית', keywords: ['התפתחות', 'צמיחה', 'שינוי', 'עצמי'] },
  { tag: 'התמכרות', keywords: ['התמכרות', 'נוער', 'מבוגרים'] },
];

const AUTHOR_NAME = 'נירה גבאי';

function generateSlug(title: string, contentText: string): string {
  const combined = title + ' ' + contentText.slice(0, 600);
  const matched: string[] = [];
  for (const [hebrew, english] of SLUG_KEYWORD_MAP) {
    if (!combined.includes(hebrew)) continue;
    if (matched.some(m => m.split('-')[0] === english.split('-')[0])) continue;
    matched.push(english);
    if (matched.length >= 2) break;
  }
  if (matched.length === 0) return 'parenting-article';
  return matched.join('-').toLowerCase()
    .replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
    .split('-').slice(0, 5).join('-') || 'parenting-article';
}

function generateTags(title: string, contentText: string): string {
  const combined = title + ' ' + contentText;
  const selected: string[] = [AUTHOR_NAME];
  for (const { tag, keywords } of TAG_POOL) {
    if (keywords.some(kw => combined.includes(kw))) selected.push(tag);
    if (selected.length >= 5) break;
  }
  return selected.join(',');
}

function generateExcerpt(rawExcerpt: string | null, contentText: string): string {
  if (rawExcerpt && !isBoilerplateDescription(rawExcerpt) && rawExcerpt.trim().length > 40) {
    return rawExcerpt.replace(/\s+/g, ' ').trim();
  }
  if (!contentText) return '';
  const candidate = contentText.slice(0, 300);
  const lastPeriod = Math.max(candidate.lastIndexOf('.'), candidate.lastIndexOf('?'), candidate.lastIndexOf('!'));
  return lastPeriod > 180 ? candidate.slice(0, lastPeriod + 1).trim() : candidate.slice(0, 250).trim();
}

function htmlToPlainText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanContentHtml(rawHtml: string): string {
  const $ = cheerio.load(rawHtml, { decodeEntities: false });
  $('h1').first().remove();
  $('h2').first().remove();
  $('div.clearfix').remove();
  $('time').remove();

  let removedFirstImg = false;
  $('p').each((_: number, el: any) => {
    if (removedFirstImg) return;
    const $p = $(el);
    if ($p.find('img').length > 0 && $p.text().replace(/ /g, '').trim() === '') {
      $p.remove(); removedFirstImg = true;
    }
  });

  $('p').each((_: number, el: any) => {
    const $el = $(el);
    const inner = $el.html() ?? '';
    const text = $el.text();
    if (BIO_SIGNALS.some(sig => inner.includes(sig) || text.includes(sig))) $el.remove();
  });

  $('a.__cf_email__, a[data-cfemail]').closest('p').remove();
  $('p br:first-child').remove();
  $('p').each((_: number, el: any) => {
    if ($(el).text().replace(/ /g, '').trim() === '') $(el).remove();
  });

  return ($('body').html() ?? '').trim();
}

function validateSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

function containsEmDash(value: unknown): boolean {
  if (typeof value === 'string') return value.includes('—');
  if (Array.isArray(value)) return value.some(containsEmDash);
  if (typeof value === 'object' && value !== null) {
    return Object.values(value as Record<string, unknown>).some(containsEmDash);
  }
  return false;
}

// ---------------------------------------------------------------------------
// AI editorial rewrite
// Checks REWRITE_SOURCE_MAP first (Claude Code pre-written content),
// then falls back to OpenAI, then to original cleaned HTML.
// ---------------------------------------------------------------------------

const NO_REWRITE_RISK: DuplicateContentRisk = {
  risk_level: 'high',
  rewrite_depth: 'none',
  original_structure_preserved: true,
  new_intro_added: false,
  new_closing_added: false,
  headings_rewritten: false,
  sentence_by_sentence_paraphrase: false,
  recommendation: 'Manual rewrite required before publishing',
  notes: '',
};

const SUBSTANTIAL_REWRITE_RISK: DuplicateContentRisk = {
  risk_level: 'low',
  rewrite_depth: 'substantial',
  original_structure_preserved: false,
  new_intro_added: true,
  new_closing_added: true,
  headings_rewritten: true,
  sentence_by_sentence_paraphrase: false,
  recommendation: 'Ready for draft review',
  notes: '',
};

async function aiEditorialRewrite(
  queueId: string,
  title: string,
  contentHtml: string,
  skipRewrite: boolean,
): Promise<RewriteResult> {
  // 1. Use pre-written rewrite from Claude Code if available
  const external = REWRITE_SOURCE_MAP[queueId];
  if (external) {
    const sanitized = external.content.replace(/—/g, '-');
    return {
      content: sanitized,
      risk: {
        risk_level: (external.risk_level ?? 'low') as DuplicateContentRisk['risk_level'],
        rewrite_depth: (external.rewrite_depth ?? 'substantial') as DuplicateContentRisk['rewrite_depth'],
        original_structure_preserved: external.original_structure_preserved ?? false,
        new_intro_added: external.new_intro_added ?? true,
        new_closing_added: external.new_closing_added ?? true,
        headings_rewritten: external.headings_rewritten ?? true,
        sentence_by_sentence_paraphrase: external.sentence_by_sentence_paraphrase ?? false,
        recommendation: external.recommendation ?? 'Ready for draft review',
        notes: external.notes ?? 'Rewritten by Claude Code.',
      },
      skipped: false,
      skip_reason: null,
    };
  }

  // 2. Skip if requested
  if (skipRewrite) {
    return {
      content: contentHtml,
      risk: { ...NO_REWRITE_RISK, notes: 'AI rewrite skipped via --skip-ai-rewrite.' },
      skipped: true,
      skip_reason: '--skip-ai-rewrite',
    };
  }

  // 3. OpenAI fallback
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      content: contentHtml,
      risk: { ...NO_REWRITE_RISK, notes: 'No OPENAI_API_KEY. Use --rewrite-source to inject Claude Code rewrite.' },
      skipped: true,
      skip_reason: 'no_api_key',
    };
  }

  const contentText = htmlToPlainText(contentHtml);

  const systemPrompt = [
    'You are an expert Hebrew content editor for a licensed therapist\'s professional website (niragabay.com).',
    'Substantially rewrite the given Hebrew article to reduce duplicate content risk.',
    '',
    'Rules:',
    '- Write entirely in Hebrew',
    '- Return clean HTML using ONLY <h2> and <p> tags',
    '- Do NOT include <html>, <body>, <head>, or any wrapper tags',
    '- Do NOT include links, images, scripts, or any other elements',
    '- New introduction: 2-3 sentences, warm and accessible, speaking to the reader\'s lived experience',
    '- Create 3-4 new H2 headings that capture the main themes with fresh phrasing',
    '- Rewrite each section with completely new paragraph-level language',
    '- New reflective closing paragraph: 2-3 sentences',
    '- Professional, warm, non-clinical tone suitable for a therapist website',
    '- Do NOT use the em dash character (—) - use a regular hyphen (-) instead',
    '- Do NOT include the article title - it will be added separately as H1',
    '- Target length: 600-1000 words of Hebrew body text',
  ].join('\n');

  const userPrompt = `Article title: ${title}\n\nRewrite this article substantially. Return only the HTML body content using <h2> and <p> tags.\n\n${contentText}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const errBody = await response.text();
      const errMsg = 'OpenAI API error ' + response.status + ': ' + errBody.slice(0, 300);
      console.error('[!] AI rewrite API error:', errMsg);
      return {
        content: contentHtml,
        risk: { ...NO_REWRITE_RISK, notes: errMsg },
        skipped: true,
        skip_reason: 'api_error',
      };
    }

    const json = await response.json() as { choices: Array<{ message: { content: string } }> };
    const rawOutput = (json.choices[0]?.message?.content ?? '').trim();

    const hasHebrew = /[֐-׿]/.test(rawOutput);
    const hasHtml = rawOutput.includes('<h2') || rawOutput.includes('<p');

    if (!hasHebrew || !hasHtml || rawOutput.length < 300) {
      return {
        content: contentHtml,
        risk: { ...NO_REWRITE_RISK, notes: 'AI output failed validation (missing Hebrew, HTML tags, or too short).' },
        skipped: true,
        skip_reason: 'validation_failed',
      };
    }

    const sanitized = rawOutput.replace(/—/g, '-');
    return {
      content: sanitized,
      risk: { ...SUBSTANTIAL_REWRITE_RISK, notes: 'Rewritten via OpenAI gpt-4o-mini.' },
      skipped: false,
      skip_reason: null,
    };

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: contentHtml,
      risk: { ...NO_REWRITE_RISK, notes: 'AI rewrite failed: ' + msg },
      skipped: true,
      skip_reason: 'exception',
    };
  }
}

// ---------------------------------------------------------------------------
// Abstract editorial image prompt generator
// Style: modern abstract editorial illustration, no people/faces
// ---------------------------------------------------------------------------

function generateImagePromptData(title: string, contentText: string): ImagePromptData {
  const text = title + ' ' + contentText.slice(0, 500);

  if (text.includes('שפת אהבה') || (text.includes('זוגיות') && text.includes('אהבה'))) {
    return {
      concept: 'שתי צורות אורגניות מתחברות בעדינות - ייצוג של קשר, שיח, ושפה משותפת',
      prompt: 'Abstract editorial illustration, horizontal 16:9. Two organic rounded forms gently touching at their center point, each leaning slightly toward the other. Warm amber and soft ivory palette, muted terracotta accent. Smooth gradient light from above-left. Generous negative space. Clean warm off-white background. Premium contemporary editorial style suitable for a professional psychology publication. Flat to slightly dimensional rendering, no harsh lines. No text, no people, no figures.',
      negative_prompt: STANDARD_NEGATIVE_PROMPT,
      alt: 'שתי צורות אורגניות מתחברות בעדינות - ייצוג של חיבור ושיח באהבה',
    };
  }

  if (text.includes('מיקום') || text.includes('משפחתי') || text.includes('בכור') || text.includes('אחים')) {
    return {
      concept: 'שלוש צורות אורגניות בגבהים שונים - ייצוג של מיקום ודינמיקה במערך המשפחתי',
      prompt: 'Abstract editorial illustration, horizontal 16:9. Three organic rounded forms of slightly different sizes, arranged at different heights across a warm neutral background. The forms softly overlap and lean toward each other, suggesting quiet hierarchy and family position. One form slightly larger and elevated, one mid-level, one smaller and lower. Warm amber, aged ivory, and soft terracotta color palette. Smooth gradient lighting from slightly above and left. Generous negative space. Clean warm off-white background. Premium contemporary editorial style. No text, no people, no figures.',
      negative_prompt: STANDARD_NEGATIVE_PROMPT,
      alt: 'שלוש צורות אורגניות בגבהים שונים - ייצוג של מיקום ודינמיקה במשפחה',
    };
  }

  if (text.includes('התמכרות') || text.includes('נוער') || text.includes('מתבגר')) {
    return {
      concept: 'צורה אחת זזה לעבר אור - ייצוג של מסע שינוי, תקווה, ומעבר',
      prompt: 'Abstract editorial illustration, horizontal 16:9. A single organic form moving toward a warm light source in the upper right of the composition. The form transitions from cooler muted stone tones at its base to warm amber at its leading edge, suggesting transformation and hope. Clean off-white background with a subtle warm gradient. Generous negative space. Premium contemporary editorial style. No text, no people, no figures.',
      negative_prompt: STANDARD_NEGATIVE_PROMPT,
      alt: 'צורה אורגנית זזה לעבר אור חם - ייצוג של שינוי ותקווה',
    };
  }

  if (text.includes('הורים') || text.includes('הורות') || text.includes('חינוך')) {
    return {
      concept: 'צורה מגינה גדולה סביב צורה קטנה - ייצוג של חום הורי, הגנה, ובטיחות',
      prompt: 'Abstract editorial illustration, horizontal 16:9. A larger organic form gently curving around a smaller one, evoking protection and nurturing warmth. The forms share a warm amber and ivory palette, with the larger form casting a soft shadow behind the smaller. Smooth directional light from above. Clean warm off-white background. Generous negative space. Premium contemporary editorial style. No text, no people, no figures.',
      negative_prompt: STANDARD_NEGATIVE_PROMPT,
      alt: 'צורה גדולה מגינה על צורה קטנה - ייצוג של חום הורי ובטיחות',
    };
  }

  if (text.includes('זוגיות') || text.includes('בני זוג') || text.includes('קשר')) {
    return {
      concept: 'שתי צורות מאוזנות זו לצד זו - ייצוג של שותפות ושיתוף שקט',
      prompt: 'Abstract editorial illustration, horizontal 16:9. Two balanced organic forms positioned side by side, their outer edges curving gently toward each other. Warm muted amber and ivory tones, with a subtle color distinction between the two forms. Soft ambient light. Clean warm off-white background. The composition feels balanced and calm. Premium contemporary editorial style. No text, no people, no figures.',
      negative_prompt: STANDARD_NEGATIVE_PROMPT,
      alt: 'שתי צורות מאוזנות זו לצד זו - ייצוג של שותפות ושיתוף',
    };
  }

  if (text.includes('גבולות') || text.includes('תקשורת') || text.includes('יחסים')) {
    return {
      concept: 'שתי צורות נפרדות עם מרחב ברור ביניהן - ייצוג של גבולות, דיאלוג, ושלמות עצמית',
      prompt: 'Abstract editorial illustration, horizontal 16:9. Two distinct organic forms with clear intentional space between them. Each form is whole and complete on its own. Warm amber and stone tones. Clean directional light from above. The space between the forms feels purposeful, not empty - a held breath. Clean warm off-white background. Premium contemporary editorial style. No text, no people, no figures.',
      negative_prompt: STANDARD_NEGATIVE_PROMPT,
      alt: 'שתי צורות נפרדות עם מרחב מכוון ביניהן - ייצוג של גבולות ודיאלוג',
    };
  }

  // Default: personal growth / therapy / quiet reflection
  return {
    concept: 'צורה בודדת מרוכזת באור רך - ייצוג של תהליך פנימי, רפלקציה, ושינוי',
    prompt: 'Abstract editorial illustration, horizontal 16:9. A single centered organic form in soft, even warm light. The form has subtle internal color variation suggesting depth and inner complexity. Warm amber and ivory palette on a clean off-white background. The composition is calm, grounded, and introspective. Generous negative space. Premium contemporary editorial style suitable for a professional psychology publication. No text, no people, no figures.',
    negative_prompt: STANDARD_NEGATIVE_PROMPT,
    alt: 'צורה אורגנית בודדת באור רך - ייצוג של תהליך פנימי ורפלקציה',
  };
}

// ---------------------------------------------------------------------------
// Image generation and upload (requires --generate-image)
// ---------------------------------------------------------------------------

interface ImageGenerationResult {
  url: string | null;
  localPath: string | null;
  error: string | null;
}

async function generateAndUploadArticleImage(
  slug: string,
  prompt: string,
  supabase: any,
): Promise<ImageGenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { url: null, localPath: null, error: 'OPENAI_API_KEY not set in .env.local' };
  }

  console.log('Generating image via gpt-image-1...');

  let imageBuffer: Buffer;
  try {
    const genRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size: '1536x1024',
        quality: 'medium',
        output_format: 'webp',
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!genRes.ok) {
      const errBody = await genRes.text();
      return { url: null, localPath: null, error: 'Image API error ' + genRes.status + ': ' + errBody.slice(0, 200) };
    }

    const genJson = await genRes.json() as { data: Array<{ b64_json: string }> };
    const b64 = genJson.data[0]?.b64_json;
    if (!b64) return { url: null, localPath: null, error: 'No image data in API response' };

    imageBuffer = Buffer.from(b64, 'base64');
  } catch (err: unknown) {
    return { url: null, localPath: null, error: 'Image generation failed: ' + (err instanceof Error ? err.message : String(err)) };
  }

  const generatedDir = path.join(DATA_DIR, 'generated-images');
  fs.mkdirSync(generatedDir, { recursive: true });
  const localPath = path.join(generatedDir, slug + '-hero.webp');
  fs.writeFileSync(localPath, imageBuffer);
  console.log('Image saved:', localPath, '(' + imageBuffer.length + ' bytes)');

  const storagePath = 'articles/' + slug + '/hero.webp';
  const bucket = 'article-images';

  try {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, imageBuffer, { contentType: 'image/webp', upsert: true });

    if (uploadError) {
      return { url: null, localPath, error: 'Storage upload failed: ' + uploadError.message };
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    const publicUrl = urlData?.publicUrl ?? null;
    console.log('Image uploaded:', storagePath);

    return { url: publicUrl, localPath, error: null };
  } catch (err: unknown) {
    return { url: null, localPath, error: 'Upload error: ' + (err instanceof Error ? err.message : String(err)) };
  }
}

// ---------------------------------------------------------------------------
// Article row payload builder (16 public columns only)
// ---------------------------------------------------------------------------

function buildArticlePayload(params: {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  readingTime: number;
  tags: string;
  seo: SeoResult;
}): ArticleInsertPayload {
  const now = new Date().toISOString();
  const { package: pkg, validation } = params.seo;
  const content_hash = crypto.createHash('sha256').update(params.content).digest('hex');
  return {
    id: crypto.randomUUID(),
    title: params.title,
    slug: params.slug,
    content: params.content,
    excerpt: params.excerpt,
    image_url: null,
    reading_time: params.readingTime,
    likes_count: 0,
    views_count: 0,
    tags: params.tags,
    is_published: false,
    is_sample: false,
    created_date: now,
    updated_date: now,
    created_by_id: null,
    created_by: CREATED_BY_AGENT,
    // SEO
    meta_title: pkg.meta_title,
    meta_description: pkg.meta_description,
    focus_keyword: pkg.focus_keyword,
    secondary_keywords: pkg.secondary_keywords,
    seo_score: validation.score,
    canonical_url: pkg.canonical_url,
    faq: pkg.faq_json,
    internal_links: pkg.internal_links,
    schema_json: pkg.schema_json,
    seo_package: {
      og_title: pkg.og_title,
      og_description: pkg.og_description,
      image_alt: pkg.image_alt,
      image_prompt: pkg.image_prompt,
      metrics: validation.metrics,
      findings: validation.findings,
      generated_at: now,
    },
    status: 'draft',
    optimized_at: now,
    imported_at: now,
    content_hash,
  };
}

// ---------------------------------------------------------------------------
// Insert image prompt metadata into article_draft_metadata
// ---------------------------------------------------------------------------

async function insertDraftMetadata(
  supabase: any,
  params: {
    articleId: string;
    queueId: string;
    slug: string;
    imagePrompt: ImagePromptData;
  },
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('article_draft_metadata')
    .insert({
      article_id: params.articleId,
      queue_id: params.queueId,
      slug: params.slug,
      image_concept: params.imagePrompt.concept,
      image_prompt: params.imagePrompt.prompt,
      negative_prompt: params.imagePrompt.negative_prompt,
      image_alt: params.imagePrompt.alt,
      image_status: 'prompt_ready',
      source: 'article_import_pipeline',
    });

  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}

// ---------------------------------------------------------------------------
// Result file writer
// ---------------------------------------------------------------------------

function writeResult(result: PipelineRunResult): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Process one queue item
// ---------------------------------------------------------------------------

async function processQueueItem(
  supabase: any,
  item: QueueItem,
  runResult: PipelineRunResult,
  existingArticles: ExistingArticleRef[],
): Promise<PipelineItemResult> {
  const itemResult: PipelineItemResult = {
    queue_id: item.id,
    source_url_private: item.source_url,
    source_title: item.source_title,
    status_before: item.status,
    article_id: null,
    slug: null,
    title: null,
    is_published: null,
    image_url: null,
    image_prompt_saved: null,
    duplicate_content_risk: null,
    seo_score: null,
    seo_passed: null,
    seo_errors: [],
    seo_warnings_count: null,
    queue_status: null,
    reconciliation: false,
    warnings: [],
    error: null,
  };

  console.log('-'.repeat(60));
  console.log('Queue ID:     ', item.id);
  console.log('Source title: ', item.source_title ?? '(none)');
  if (REWRITE_SOURCE_MAP[item.id]) {
    console.log('Rewrite:      ', 'pre-written (Claude Code)');
  }
  console.log('');

  try {
    // Preview slug from source_title
    const previewSlug = generateSlug(item.source_title ?? '', '');
    console.log('Preview slug: ', previewSlug);

    // Check for existing article by preview slug
    const { data: existingBySlug } = await supabase
      .from('articles')
      .select('id, title, slug, is_published, image_url')
      .eq('slug', previewSlug)
      .maybeSingle();

    if (existingBySlug) {
      console.log('');
      console.log('RECONCILIATION: Slug "' + previewSlug + '" already exists in public.articles.');
      console.log('  Existing ID:    ', existingBySlug.id);
      console.log('  Existing title: ', existingBySlug.title);
      console.log('  is_published:   ', existingBySlug.is_published);
      console.log('');

      itemResult.reconciliation = true;
      itemResult.article_id = existingBySlug.id;
      itemResult.slug = previewSlug;
      itemResult.title = existingBySlug.title;
      itemResult.is_published = existingBySlug.is_published;
      itemResult.queue_status = 'draft_created';

      if (!DRY_RUN && DO_MARK_QUEUE) {
        const queueStatus = existingBySlug.is_published ? 'draft_created' : 'draft_created';
        const { error: queueUpdateError } = await supabase
          .from('article_import_queue')
          .update({
            status: queueStatus,
            imported_article_id: existingBySlug.id,
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        if (queueUpdateError) {
          itemResult.warnings.push('Queue reconciliation update failed: ' + queueUpdateError.message);
          console.log('[!] Queue update failed:', queueUpdateError.message);
        } else {
          runResult.queue_updated = true;
          console.log('Queue: pending -> ' + queueStatus + ' (reconciliation)');
        }
      } else if (DRY_RUN) {
        itemResult.queue_status = 'would be: draft_created';
        console.log('[DRY-RUN] Would mark queue as draft_created (requires --insert --mark-queue)');
      } else {
        itemResult.warnings.push('Queue NOT updated. Pass --mark-queue to set draft_created.');
      }

      return itemResult;
    }

    // --- Dry-run report ---
    if (DRY_RUN) {
      const imagePrompt = generateImagePromptData(item.source_title ?? '', '');
      console.log('');
      console.log('DRY-RUN: No existing article found for slug "' + previewSlug + '".');
      console.log('Full pipeline would run:');
      console.log('  1. Fetch source page:', item.source_url.replace(/[^/]+$/, '***'));
      console.log('  2. Extract and clean content');
      console.log('  3. Generate slug, tags');
      if (REWRITE_SOURCE_MAP[item.id]) {
        console.log('  4. Rewrite: pre-written by Claude Code (queue_id found in --rewrite-source)');
      } else if (SKIP_AI_REWRITE) {
        console.log('  4. Rewrite: SKIPPED (--skip-ai-rewrite)');
      } else if (process.env.OPENAI_API_KEY) {
        console.log('  4. Rewrite: OpenAI gpt-4o-mini');
      } else {
        console.log('  4. Rewrite: NONE - no OPENAI_API_KEY and no --rewrite-source');
        console.log('             -> duplicate_content_risk will be HIGH');
        console.log('             -> recommend: provide Claude Code rewrite via --rewrite-source');
      }
      console.log('  5. Generate + validate SEO package (blocks insert on hard errors)');
      console.log('  6. Safety gates (is_published=false, image_url=null)');
      console.log('  7. Insert into public.articles (public + SEO columns)');
      console.log('  8. Insert image prompt into article_draft_metadata');
      console.log('  9. Mark queue as draft_created');
      console.log('');
      console.log('Planned slug:          ', previewSlug);
      console.log('Image concept:         ', imagePrompt.concept);
      console.log('Image prompt status:   ', 'would be: prompt_ready');
      console.log('Would publish:         ', 'NO - always is_published=false');
      console.log('Would generate image:  ', DO_GENERATE_IMAGE ? 'YES' : 'NO');
      console.log('');
      console.log('No changes made. Run with --insert --mark-queue --skip-images to process.');

      itemResult.slug = previewSlug;
      itemResult.queue_status = 'would be: draft_created';
      itemResult.is_published = false;
      itemResult.image_prompt_saved = null; // dry-run
      return itemResult;
    }

    // --- Insert mode: full pipeline ---

    if (DO_MARK_QUEUE) {
      const { error: markErr } = await supabase
        .from('article_import_queue')
        .update({
          status: 'processing',
          attempts: (item.attempts ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      if (markErr) throw new Error('Failed to mark queue as processing: ' + markErr.message);
      console.log('Queue: pending -> processing');
    }

    // Fetch source article
    console.log('Fetching source page...');
    const html = await fetchPage(item.source_url);
    if (!html) throw new Error('Failed to fetch source page');

    const rawText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    if (isSoft404(rawText)) throw new Error('Soft 404 detected on source page');
    console.log('Fetched:', html.length, 'bytes');

    // Extract content
    console.log('Extracting...');
    const extracted = extractContent(html, item.source_url);
    if (!extracted.contentText || extracted.contentText.length < 200) {
      throw new Error('Content too short: ' + (extracted.contentText?.length ?? 0) + ' chars');
    }

    const title = extracted.title ?? item.source_title ?? '';
    if (!title) throw new Error('Could not determine article title');

    const cleanedHtml = cleanContentHtml(extracted.contentHtml);
    const contentText = htmlToPlainText(cleanedHtml);
    const excerpt = generateExcerpt(extracted.excerpt, contentText);
    const slug = generateSlug(title, extracted.contentText);
    const tags = generateTags(title, extracted.contentText);
    const readingTime = estimateReadingTime(contentText);

    console.log('Title:    ', title);
    console.log('Slug:     ', slug);
    console.log('Content:  ', contentText.length, 'chars,', readingTime, 'min read');

    if (!validateSlug(slug)) {
      throw new Error('Generated slug is not valid ASCII-hyphenated: "' + slug + '"');
    }

    // Exact slug collision check
    const { data: slugCollision } = await supabase
      .from('articles')
      .select('id, title, slug')
      .eq('slug', slug)
      .maybeSingle();

    if (slugCollision) {
      console.log('[!] Slug "' + slug + '" already exists. Treating as reconciliation.');
      itemResult.reconciliation = true;
      itemResult.article_id = slugCollision.id;
      itemResult.slug = slug;
      itemResult.title = slugCollision.title;
      itemResult.warnings.push('Duplicate slug - no insert performed');

      if (DO_MARK_QUEUE) {
        await supabase
          .from('article_import_queue')
          .update({
            status: 'draft_created',
            imported_article_id: slugCollision.id,
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
        itemResult.queue_status = 'draft_created';
        runResult.queue_updated = true;
      }
      return itemResult;
    }

    // AI editorial rewrite (Claude Code pre-written > OpenAI > fallback)
    console.log('Running editorial rewrite...');
    const rewrite = await aiEditorialRewrite(item.id, title, cleanedHtml, SKIP_AI_REWRITE);

    if (rewrite.skipped) {
      itemResult.warnings.push('Rewrite skipped: ' + rewrite.risk.notes);
      console.log('[!] Rewrite skipped:', rewrite.risk.notes);
    } else {
      console.log('Rewrite complete:', rewrite.content.length, 'chars');
    }

    itemResult.duplicate_content_risk = rewrite.risk;

    // Normalise the rewritten content to Markdown so it renders correctly
    // (the article page uses react-markdown) and its heading structure is real.
    const contentMarkdown = htmlToMarkdown(rewrite.content);

    // Image prompt (also fed into the SEO package for the image alt text).
    const imagePromptData = generateImagePromptData(title, extracted.contentText);

    // ---- SEO: generate the full package and validate before saving ----
    console.log('Generating + validating SEO package...');
    const seo = generateAndValidateSeo({
      title,
      content: contentMarkdown,
      // Derive excerpt/meta_description from the REWRITE, not the source - the
      // source og/meta description can carry claims the rewrite intentionally
      // removed (e.g. unsubstantiated "research shows" phrasing).
      excerpt: null,
      tags,
      slug,
      createdDate: new Date().toISOString(),
      imagePrompt: imagePromptData.prompt,
      imageAlt: imagePromptData.alt,
      imageConcept: imagePromptData.concept,
      existingArticles,
    });

    itemResult.seo_score = seo.validation.score;
    itemResult.seo_passed = seo.validation.passed;
    const seoErrors = seo.validation.findings.filter((f) => f.severity === 'error');
    const seoWarnings = seo.validation.findings.filter((f) => f.severity === 'warn');
    itemResult.seo_errors = seoErrors.map((f) => f.message);
    itemResult.seo_warnings_count = seoWarnings.length;

    console.log('SEO score:', seo.validation.score + '/100',
      '| errors:', seoErrors.length, '| warnings:', seoWarnings.length);
    for (const f of seoErrors) console.log('  [SEO ERROR]', f.message);
    for (const f of seoWarnings) console.log('  [SEO warn] ', f.message);

    if (!seo.validation.passed) {
      if (SKIP_SEO_VALIDATION) {
        itemResult.warnings.push('SEO validation failed but bypassed via --skip-seo-validation');
        console.log('[!] SEO errors bypassed via --skip-seo-validation');
      } else if (CONTINUE_ON_ERROR) {
        itemResult.warnings.push('SEO validation failed (continued via --continue-on-error): ' + itemResult.seo_errors.join('; '));
      } else {
        throw new Error('SEO validation failed: ' + itemResult.seo_errors.join('; ') +
          ' (fix the article, or pass --skip-seo-validation to override)');
      }
    }

    // Build article payload (public columns + validated SEO columns)
    const payload = buildArticlePayload({
      title, slug, content: contentMarkdown, excerpt: seo.package.excerpt, readingTime, tags, seo,
    });

    itemResult.article_id = payload.id;
    itemResult.slug = payload.slug;
    itemResult.title = payload.title;

    // Safety gates
    if (payload.is_published !== false) throw new Error('CRITICAL: is_published is not false');
    if (payload.image_url !== null) throw new Error('CRITICAL: image_url is not null');
    if (containsEmDash(payload)) {
      const msg = 'Em dash character found in article payload';
      if (!CONTINUE_ON_ERROR) throw new Error(msg);
      itemResult.warnings.push(msg);
    }
    if (JSON.stringify(payload).includes('m-y-net')) {
      throw new Error('CRITICAL: Old source URL found in article payload - refusing to insert');
    }

    console.log('Safety gates passed: is_published=false, image_url=null');

    // Build the exact insert row (16 allowed columns only)
    const rowToInsert: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
      if (ALLOWED_COLUMNS.has(k)) rowToInsert[k] = v;
    }

    // Insert into public.articles
    console.log('Inserting into public.articles...');
    const { error: insertError } = await supabase
      .from('articles')
      .insert(rowToInsert);

    if (insertError) throw new Error('Insert failed: ' + insertError.message);

    // Verify insert
    const { data: verified, error: verifyError } = await supabase
      .from('articles')
      .select('id, slug, is_published, image_url')
      .eq('id', payload.id)
      .single();

    if (verifyError || !verified) {
      throw new Error('Insert verification failed: ' + (verifyError?.message ?? 'row not found after insert'));
    }

    const idOk = verified.id === payload.id;
    const slugOk = verified.slug === payload.slug;
    const pubOk = verified.is_published === false;
    const imgOk = verified.image_url === null;

    console.log('Verified: id=' + idOk + ' slug=' + slugOk + ' is_published=' + verified.is_published + ' image_url=' + verified.image_url);

    if (!idOk || !slugOk || !pubOk || !imgOk) {
      throw new Error('Insert verification failed: safety checks did not pass');
    }

    itemResult.is_published = false;
    itemResult.image_url = null;

    // Insert image prompt metadata into article_draft_metadata
    console.log('Saving image prompt metadata...');
    const metaResult = await insertDraftMetadata(supabase, {
      articleId: payload.id,
      queueId: item.id,
      slug: payload.slug,
      imagePrompt: imagePromptData,
    });

    if (metaResult.error) {
      itemResult.warnings.push('Image metadata insert failed (non-fatal): ' + metaResult.error);
      itemResult.image_prompt_saved = false;
      console.log('[!] Image metadata insert failed:', metaResult.error);
    } else {
      itemResult.image_prompt_saved = true;
      console.log('Image prompt metadata saved.');
      console.log('  Concept:', imagePromptData.concept);
    }

    // Optional: generate actual image (requires --generate-image)
    if (DO_GENERATE_IMAGE) {
      console.log('Generating hero image...');
      const imgResult = await generateAndUploadArticleImage(payload.slug, imagePromptData.prompt, supabase);

      if (imgResult.error) {
        itemResult.warnings.push('Image generation failed (non-fatal): ' + imgResult.error);
        console.log('[!] Image generation failed:', imgResult.error);
      } else if (imgResult.url) {
        const { error: imgUpdateErr } = await supabase
          .from('articles')
          .update({ image_url: imgResult.url, updated_date: new Date().toISOString() })
          .eq('id', payload.id);

        if (imgUpdateErr) {
          itemResult.warnings.push('image_url DB update failed: ' + imgUpdateErr.message);
        } else {
          itemResult.image_url = imgResult.url;
          console.log('image_url set:', imgResult.url);
        }
      }
    }

    // Update queue - only after article insert AND metadata insert (or metadata warning accepted)
    if (DO_MARK_QUEUE) {
      const { error: queueErr } = await supabase
        .from('article_import_queue')
        .update({
          status: 'draft_created',
          imported_article_id: payload.id,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', item.id);

      if (queueErr) {
        itemResult.warnings.push('Queue update failed after successful insert: ' + queueErr.message);
        console.log('[!] Queue update failed:', queueErr.message);
        itemResult.queue_status = 'update_failed';
      } else {
        itemResult.queue_status = 'draft_created';
        runResult.queue_updated = true;
        console.log('Queue: processing -> draft_created');
        console.log('imported_article_id:', payload.id);
      }
    } else {
      itemResult.queue_status = item.status;
      itemResult.warnings.push('Queue NOT updated. Pass --mark-queue to update queue status.');
      console.log('[!] Queue NOT updated. Pass --mark-queue to update it.');
    }

    console.log('');
    console.log('SUCCESS');
    console.log('  Article ID:  ', payload.id);
    console.log('  Slug:        ', payload.slug);
    console.log('  is_published:', false);
    console.log('  image_url:   ', null);

    return itemResult;

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('');
    console.error('ERROR:', msg);

    itemResult.error = msg;

    if (!DRY_RUN && DO_MARK_QUEUE) {
      try {
        await supabase
          .from('article_import_queue')
          .update({
            status: 'failed',
            last_error: msg.slice(0, 500),
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
        itemResult.queue_status = 'failed';
        console.error('Queue marked as: failed');
      } catch { /* ignore secondary error */ }
    }

    if (!CONTINUE_ON_ERROR) throw err;
    return itemResult;
  }
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

async function runPipeline(): Promise<void> {
  const startedAt = new Date().toISOString();

  console.log('='.repeat(60));
  console.log('Article Import Pipeline Runner');
  console.log('='.repeat(60));
  console.log('Mode:             ', DRY_RUN ? 'DRY-RUN (no writes)' : 'INSERT');
  console.log('Limit:            ', LIMIT);
  console.log('Mark queue:       ', DO_MARK_QUEUE);
  console.log('Skip AI rewrite:  ', SKIP_AI_REWRITE);
  console.log('Generate image:   ', DO_GENERATE_IMAGE);
  console.log('Skip images:      ', !DO_GENERATE_IMAGE);
  console.log('Continue on error:', CONTINUE_ON_ERROR);
  console.log('Expected status:  ', EXPECTED_STATUS);
  console.log('Rewrite source:   ', Object.keys(REWRITE_SOURCE_MAP).length > 0
    ? Object.keys(REWRITE_SOURCE_MAP).length + ' pre-written rewrite(s) loaded'
    : 'none');
  console.log('');

  if (DRY_RUN) {
    console.log('[DRY-RUN] No Supabase writes will occur.');
    console.log('[DRY-RUN] Run with --insert --mark-queue --skip-images to process for real.');
    console.log('');
  }

  const result: PipelineRunResult = {
    mode: DRY_RUN ? 'dry_run' : 'insert',
    limit: LIMIT,
    started_at: startedAt,
    finished_at: null,
    articles_attempted: 0,
    articles_inserted: 0,
    articles_failed: 0,
    articles_skipped: 0,
    queue_updated: false,
    items: [],
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('MISSING: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
    process.exit(1);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: queueItems, error: queueError } = await supabase
    .from('article_import_queue')
    .select('id, source_url, source_title, source_site, status, attempts, imported_article_id')
    .eq('status', EXPECTED_STATUS)
    .order('created_at', { ascending: true })
    .limit(LIMIT);

  if (queueError || !queueItems || queueItems.length === 0) {
    console.log('No ' + EXPECTED_STATUS + ' items found in article_import_queue.');
    if (queueError) console.error('Queue error:', queueError.message);
    result.finished_at = new Date().toISOString();
    writeResult(result);
    return;
  }

  console.log('Found', queueItems.length, EXPECTED_STATUS, 'queue item(s).');
  console.log('');

  // Dry-run: report selected articles table
  if (DRY_RUN) {
    console.log('Selected articles for dry-run:');
    console.log('  #  | source_title                                  | planned_slug');
    console.log('  ---|-----------------------------------------------|----------------');
    for (let i = 0; i < queueItems.length; i++) {
      const q = queueItems[i] as QueueItem;
      const planSlug = generateSlug(q.source_title ?? '', '');
      const num = String(i + 1).padStart(3);
      const titleTrunc = (q.source_title ?? '').slice(0, 45).padEnd(45);
      console.log('  ' + num + '| ' + titleTrunc + ' | ' + planSlug);
    }
    console.log('');
    console.log('Confirmations:');
    console.log('  Publishing:       NO - all inserts use is_published=false');
    console.log('  Image generation: NO - images skipped');
    console.log('  Image prompts:    YES - saved to article_draft_metadata');
    console.log('  Queue updates:    NO - requires --mark-queue');
    console.log('');
  }

  // Existing articles (published + drafts) for SEO cannibalization checks and
  // internal-link suggestions.
  const { data: existingRows } = await supabase
    .from('articles')
    .select('slug, title, tags, focus_keyword');
  const existingArticles: ExistingArticleRef[] = (existingRows || []).map((r: any) => ({
    slug: r.slug,
    title: r.title ?? '',
    tags: r.tags ?? '',
    focus_keyword: r.focus_keyword ?? null,
  }));

  for (const item of queueItems as QueueItem[]) {
    const itemResult = await processQueueItem(supabase, item, result, existingArticles).catch((err: unknown) => {
      if (CONTINUE_ON_ERROR) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          queue_id: item.id,
          source_url_private: item.source_url,
          source_title: item.source_title,
          status_before: item.status,
          article_id: null,
          slug: null,
          title: null,
          is_published: null as false | null,
          image_url: null as null,
          image_prompt_saved: null as boolean | null,
          duplicate_content_risk: null,
          seo_score: null as number | null,
          seo_passed: null as boolean | null,
          seo_errors: [] as string[],
          seo_warnings_count: null as number | null,
          queue_status: 'failed',
          reconciliation: false,
          warnings: [],
          error: msg,
        };
      }
      throw err;
    });

    result.items.push(itemResult);
    result.articles_attempted++;

    if (itemResult.error) {
      result.articles_failed++;
    } else if (itemResult.reconciliation) {
      result.articles_skipped++;
    } else if (!DRY_RUN && itemResult.article_id) {
      result.articles_inserted++;
    }
  }

  result.finished_at = new Date().toISOString();
  writeResult(result);

  // Summary table
  console.log('');
  console.log('='.repeat(60));
  console.log('Run Summary');
  console.log('='.repeat(60));
  console.log('Mode:              ', result.mode);
  console.log('Attempted:         ', result.articles_attempted);
  console.log('Inserted:          ', result.articles_inserted);
  console.log('Skipped/reconciled:', result.articles_skipped);
  console.log('Failed:            ', result.articles_failed);
  console.log('Queue updated:     ', result.queue_updated);
  console.log('');
  console.log('queue_id | source_title | article_id | slug | is_published | seo_score | seo_ok | image_prompt_saved | queue_status | error');
  console.log('-'.repeat(130));
  for (const it of result.items) {
    const row = [
      it.queue_id.slice(0, 8) + '...',
      (it.source_title ?? '').slice(0, 20),
      it.article_id ? it.article_id.slice(0, 8) + '...' : 'null',
      it.slug ?? 'null',
      String(it.is_published),
      it.seo_score === null ? 'n/a' : it.seo_score + '/100',
      it.seo_passed === null ? 'n/a' : String(it.seo_passed),
      String(it.image_prompt_saved),
      it.queue_status ?? 'null',
      it.error ? it.error.slice(0, 30) : 'none',
    ].join(' | ');
    console.log(row);
  }
  console.log('');
  console.log('Result file:', RESULT_FILE);
  console.log('='.repeat(60));
}

runPipeline().catch((err: unknown) => {
  console.error('Fatal:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
