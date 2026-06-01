#!/usr/bin/env tsx
/**
 * extract-one-source-article.ts
 *
 * Dry-run extractor: reads one pending row from article_import_queue,
 * fetches the source page from m-y-net.co.il, extracts clean article
 * content, and writes a local preview JSON file.
 *
 * Default mode: dry-run -- no Supabase writes, no status changes.
 *
 * Usage:
 *   npm run extract:source-article
 *   npm run extract:source-article -- --source-url <url>
 *   npm run extract:source-article -- --mark-processing   (reserved, not active)
 */

import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), 'data');
const PREVIEW_FILE = path.join(DATA_DIR, 'extracted-source-article-preview.json');

// Hebrew noise prefixes to strip from titles (literal strings, RTL-safe as simple constants)
const NOISE_PREFIXES: string[] = [
  'הורים וילדים', // הורים וילדים
  'מטה יהודה',                   // מטה יהודה
  'בקיצור מטה יהודה', // בקיצור מטה יהודה
];

// Site name tokens to strip from the end of titles
const TITLE_SUFFIX_TOKENS: string[] = [
  '| m-y-net',
  '- m-y-net',
  'm-y-net |',
  'm-y-net -',
  '| מטה יהודה', // | מטה יהודה
  '- מטה יהודה', // - מטה יהודה
];

// Strings that signal a soft 404 (lowercase comparison)
const SOFT_404_STRINGS: string[] = [
  'page not found',
  'הדף לא נמצא', // הדף לא נמצא
  'לא נמצא',                    // לא נמצא
];

// Content container selectors -- tried in order, first match with enough text wins
const CONTENT_SELECTORS: string[] = [
  // m-y-net.co.il uses id="content" with a <section> inside
  '#content section',
  '#content',
  // WordPress-style class names (other sites)
  '.entry-content',
  '.post-content',
  '.td-post-content',
  '.article-content',
  '.article-body',
  '[itemprop="articleBody"]',
  '.post-body',
  '.single-content',
  'article .content',
  // Column-layout fallback
  '.col-main',
];

// Boilerplate selectors removed from the page and from within the content container
const BOILERPLATE_SELECTORS: string[] = [
  'header', 'footer', 'nav', 'aside',
  '.related-articles', '.related-posts', '[class*="related"]',
  '.recommended-articles', '.recommended-posts', '[class*="recommend"]',
  '.widget', '.widget-area', '.sidebar',
  '.breadcrumbs', '.breadcrumb', '.crumbs',
  '.ad', '.ads', '.advertisement', '.adsbygoogle', '[class*="advertisement"]',
  '.comments', '#comments', '.comment-respond', '.comments-area', '.comment-section',
  '.social-share', '.social-buttons', '.social-links', '[class*="social-share"]',
  '.newsletter', '.subscribe', '.newsletter-widget', '[class*="newsletter"]',
  '.cookie-notice', '.cookie-bar', '.cookie-banner', '[class*="cookie"]',
  '.tags', '.tagcloud', '.post-tags',
  '.read-more', '.more-link', '.more-articles', '[class*="read-more"]',
  '.author-box', '.author-bio', '[class*="author-box"]',
  '.sponsor', '.sponsored', '[class*="sponsor"]',
  'script', 'style', 'noscript', 'iframe',
  '.nav-menu', '.main-menu', '.site-menu',
  '.post-navigation', '.page-navigation', '.pagination', '.pager',
  '.share-bar', '.sharing', '[class*="sharing"]',
  '.attachment',
  // m-y-net.co.il specific
  '.tools',             // print/share buttons row
  '.left-side',         // sidebar column
  '.fb-comments',       // Facebook comments block
  '#fb-root',
  '.pirsomet',          // ad/promo blocks ("pirsomet" = advertisement in Hebrew)
];

// Title candidates -- tried in order, first with enough text wins
const TITLE_SELECTORS: string[] = [
  'h1.entry-title',
  'h1.article-title',
  'h1.post-title',
  'h1.td-page-title',
  '.single-article h1',
  'article h1',
  '.entry h1',
  'h1',
];

// Hebrew reading speed used for reading time estimate (words per minute)
const HEBREW_WPM = 200;

// ---------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------

const sourceUrlFlagIdx = process.argv.indexOf('--source-url');
const OVERRIDE_URL: string | null =
  sourceUrlFlagIdx !== -1 ? (process.argv[sourceUrlFlagIdx + 1] ?? null) : null;

const MARK_PROCESSING = process.argv.includes('--mark-processing');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExtractedArticle {
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
// Helpers
// ---------------------------------------------------------------------------

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; NiraGabayBot/1.0; +https://www.niragabay.com)',
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

function stripTitleSuffix(title: string): string {
  for (const token of TITLE_SUFFIX_TOKENS) {
    const idx = title.indexOf(token);
    if (idx !== -1) {
      title = title.slice(0, idx).trim();
    }
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
  t = stripTitleSuffix(t);
  // Also strip from pipe/dash splits common in <title> tags
  for (const sep of [' | ', ' - ', ' – ', ' — ']) {
    const parts = t.split(sep);
    if (parts.length > 1) {
      // Keep the longest part (usually the actual title)
      const longest = parts.reduce((a, b) => (a.length >= b.length ? a : b));
      t = longest.trim();
      break;
    }
  }
  t = stripNoisePrefix(t);
  return t;
}

function isSoft404(bodyText: string): boolean {
  const lower = bodyText.toLowerCase();
  return SOFT_404_STRINGS.some((s) => lower.includes(s.toLowerCase()));
}

function estimateReadingTime(text: string): number {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / HEBREW_WPM));
}

function resolveRelativeUrls(html: string, pageUrl: string): string {
  try {
    const origin = new URL(pageUrl).origin;
    // m-y-net.co.il uses "./" to mean root-relative (origin-relative), not page-relative.
    // Both "./" and "/" patterns are resolved against the origin.
    return html
      .replace(/src="\.\/([^"]*)"/g, `src="${origin}/$1"`)
      .replace(/src="\/([^"]*)"/g, `src="${origin}/$1"`)
      .replace(/href="\.\/([^"]*)"/g, `href="${origin}/$1"`)
      .replace(/href="\/([^"]*)"/g, `href="${origin}/$1"`);
  } catch {
    return html;
  }
}

function extractContent(html: string, pageUrl: string): {
  title: string | null;
  excerpt: string | null;
  contentHtml: string;
  contentText: string;
  imageUrl: string | null;
} {
  const $ = cheerio.load(html);

  // --- Meta fields (read before removing elements) ---
  const ogTitle = ($('meta[property="og:title"]').attr('content') ?? '').trim();
  const ogDescription = ($('meta[property="og:description"]').attr('content') ?? '').trim();
  const metaDescription = ($('meta[name="description"]').attr('content') ?? '').trim();
  const ogImage = $('meta[property="og:image"]').attr('content') ?? null;
  const twitterImage = $('meta[name="twitter:image"]').attr('content') ?? null;
  const rawPageTitle = ($('title').text() ?? '').trim();

  // --- Title ---
  let rawTitle: string | null = null;
  for (const sel of TITLE_SELECTORS) {
    const text = $(sel).first().text().trim();
    if (text.length > 4) {
      rawTitle = text;
      break;
    }
  }
  // Fallback to og:title, then <title> tag
  if (!rawTitle && ogTitle.length > 4) rawTitle = ogTitle;
  if (!rawTitle && rawPageTitle.length > 4) rawTitle = rawPageTitle;

  const title = rawTitle ? cleanTitle(rawTitle) : null;

  // --- Image (resolve relative URLs using pageUrl) ---
  let imageUrl: string | null = null;
  if (ogImage && ogImage.startsWith('http')) {
    imageUrl = ogImage;
  } else if (twitterImage && twitterImage.startsWith('http')) {
    imageUrl = twitterImage;
  } else {
    const firstSrc =
      $('article img, #content img, .entry-content img, .post-content img')
        .first()
        .attr('src') ?? null;
    if (firstSrc) {
      try { imageUrl = new URL(firstSrc, pageUrl).href; } catch { imageUrl = null; }
    }
  }

  // --- Remove global boilerplate before looking for content container ---
  for (const sel of BOILERPLATE_SELECTORS) {
    $(sel).remove();
  }

  // --- Find content container ---
  let $container: ReturnType<typeof $> | null = null;
  for (const sel of CONTENT_SELECTORS) {
    const found = $(sel).first();
    if (found.length > 0 && found.text().trim().length > 150) {
      $container = found;
      break;
    }
  }
  // Fallback to <article>, then <main>
  if (!$container) {
    const $article = $('article').first();
    if ($article.length > 0 && $article.text().trim().length > 150) {
      $container = $article;
    }
  }
  if (!$container) {
    const $main = $('main').first();
    if ($main.length > 0 && $main.text().trim().length > 150) {
      $container = $main;
    }
  }

  if (!$container) {
    return {
      title,
      excerpt: ogDescription || metaDescription || null,
      contentHtml: '',
      contentText: '',
      imageUrl,
    };
  }

  // --- Clean boilerplate from within the container ---
  for (const sel of BOILERPLATE_SELECTORS) {
    $container.find(sel).remove();
  }

  // Remove empty paragraphs and divs
  $container.find('p, div').each((_: number, el: any) => {
    if ($(el).text().trim() === '' && $(el).find('img').length === 0) {
      $(el).remove();
    }
  });

  const rawContentHtml = ($container.html() ?? '').trim();
  const contentHtml = resolveRelativeUrls(rawContentHtml, pageUrl);
  const contentText = $container.text().replace(/\s+/g, ' ').trim();

  const excerpt =
    ogDescription ||
    metaDescription ||
    (contentText.length > 0 ? contentText.slice(0, 250).trim() : null);

  return { title, excerpt, contentHtml, contentText, imageUrl };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Source article extractor -- dry-run mode');
  console.log('='.repeat(60));

  if (MARK_PROCESSING) {
    console.log('Note: --mark-processing flag is reserved and not active yet.');
  }

  let queueId: string | null = null;
  let sourceUrl: string;
  let sourceTitle: string | null = null;

  // --- Resolve source URL ---
  if (OVERRIDE_URL) {
    sourceUrl = OVERRIDE_URL;
    console.log('Source: --source-url flag');
    console.log('URL:', sourceUrl);
  } else {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error(
        'Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.',
      );
      process.exit(1);
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('article_import_queue')
      .select('id, source_url, source_title')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error || !data) {
      console.error(
        'Failed to read from article_import_queue:',
        error?.message ?? 'no pending rows found',
      );
      process.exit(1);
    }

    queueId = data.id as string;
    sourceUrl = data.source_url as string;
    sourceTitle = (data.source_title as string | null) ?? null;

    console.log('Source: Supabase article_import_queue (read-only)');
    console.log('Queue ID:    ', queueId);
    console.log('Source URL:  ', sourceUrl);
    console.log('Source title:', sourceTitle ?? '(none)');
  }

  // --- Fetch ---
  console.log('\nFetching source page...');
  const html = await fetchPage(sourceUrl);

  if (!html) {
    console.error('Failed to fetch page. Cannot proceed.');
    process.exit(1);
  }

  console.log('Page fetched -- ' + html.length + ' bytes');

  // --- Soft 404 check on raw text ---
  const rawText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  if (isSoft404(rawText)) {
    console.error('Soft 404 detected -- page does not appear to be a real article.');
    process.exit(1);
  }

  // --- Extract ---
  console.log('Extracting content...');
  const { title, excerpt, contentHtml, contentText, imageUrl } = extractContent(html, sourceUrl);

  if (!contentText || contentText.length < 200) {
    console.error(
      'Content extraction failed or content too short (' +
        (contentText?.length ?? 0) +
        ' chars). May not be a real article.',
    );
    process.exit(1);
  }

  const readingTime = estimateReadingTime(contentText);
  const contentLength = contentText.length;

  const result: ExtractedArticle = {
    queue_id: queueId,
    source_url: sourceUrl,
    source_title: sourceTitle,
    extracted_title: title,
    extracted_excerpt: excerpt ?? null,
    extracted_content: contentHtml,
    extracted_text: contentText,
    image_url: imageUrl,
    reading_time: readingTime,
    content_length: contentLength,
    extracted_at: new Date().toISOString(),
  };

  // --- Write preview file ---
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(PREVIEW_FILE, JSON.stringify(result, null, 2), 'utf-8');

  // --- Summary ---
  console.log('\n' + '='.repeat(60));
  console.log('Extraction complete');
  console.log('='.repeat(60));
  console.log('Source URL:      ', sourceUrl);
  console.log('Source title:    ', sourceTitle ?? '(none)');
  console.log('Extracted title: ', title ?? '(none)');
  console.log('Content length:  ', contentLength, 'chars');
  console.log('Reading time:    ', readingTime, 'min');
  console.log('Image URL:       ', imageUrl ?? '(none)');
  console.log('\nFirst 800 chars of extracted_text:');
  console.log('-'.repeat(40));
  console.log(contentText.slice(0, 800));
  console.log('-'.repeat(40));
  console.log('\nOutput file:', PREVIEW_FILE);
  console.log('='.repeat(60));
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
