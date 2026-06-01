#!/usr/bin/env tsx
/**
 * discover-source-articles.ts
 *
 * Discovery / import-to-queue layer for source articles from m-y-net.co.il.
 * Default mode: dry-run — reads and writes local JSON/CSV only, never touches Supabase.
 * With --insert: upserts into public.article_import_queue.
 *
 * Usage:
 *   npm run discover:source-articles
 *   npm run discover:source-articles -- --insert
 */

import { createHash } from 'crypto';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SITE_HOST = 'm-y-net.co.il';

// Hebrew strings as Unicode escape sequences -- no literal Hebrew in source
const AUTHOR_NAME = 'נירה גבאי';

const NOISE_PREFIXES: string[] = [
  'הורים וילדים',
  'מטה יהודה',
  'בקיצור מטה יהודה',
];

const SEARCH_URL =
  'https://www.m-y-net.co.il/search/?q=' + encodeURIComponent(AUTHOR_NAME);

const INSERT_MODE = process.argv.includes('--insert');
const TRUST_SEEDS = process.argv.includes('--trust-seeds');

// URL-encoded path segment identifying the "Parents and Children" column -- ASCII safe
const PARENTS_COLUMN_SEGMENT = '%D7%94%D7%95%D7%A8%D7%99%D7%9D-%D7%95%D7%99%D7%9C%D7%93%D7%99%D7%9D';

// Soft 404 signal strings (lowercase comparison). Hebrew string patched in below.
const SOFT_404_STRINGS: string[] = [
  'page not found',
  'not found',
];

const DATA_DIR = path.join(process.cwd(), 'data');
const MAX_SEARCH_PAGES = 5;
const DELAY_MS = 400;
const MAX_CHILD_SITEMAPS = 10;

const SITEMAP_URL = 'https://www.m-y-net.co.il/sitemap.xml';
const RSS_FEEDS: string[] = [
  'https://www.m-y-net.co.il/local/parentsandchildren/feed/',
  'https://www.m-y-net.co.il/feed/',
];

// All-ASCII regex patterns for non-article URL paths
const NON_ARTICLE_PATTERNS: RegExp[] = [
  /\/search(\/|\?|$)/i,
  /\/category\//i,
  /\/tag\//i,
  /\/author\//i,
  /\/page\/\d/i,
  /\/archive\//i,
  /\/feed(\/|$)/i,
  /\/wp-(admin|content|includes)/i,
  /\.(xml|rss|json|css|js|png|jpg|gif|svg|ico)$/i,
  /\/cdn-cgi\//i,
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SourceArticle {
  source_url: string;
  source_url_normalized: string;
  source_url_hash: string;
  source_site: string;
  source_title: string | null;
  source_published_at: string | null;
  discovered_at: string;
  verification_mode: 'author_match' | 'trusted_seed';
  content_length: number;
}

interface SkippedUrl {
  url: string;
  url_normalized: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function md5(input: string): string {
  return createHash('md5').update(input, 'utf8').digest('hex');
}

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hostname = u.hostname.toLowerCase();
    u.search = '';
    u.hash = '';
    if (!u.pathname.endsWith('/')) u.pathname += '/';
    return u.href;
  } catch {
    return raw;
  }
}

function isMYNetUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(SITE_HOST);
  } catch {
    return false;
  }
}

function isArticleLike(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    if (NON_ARTICLE_PATTERNS.some((re) => re.test(pathname))) return false;
    return pathname.split('/').filter(Boolean).length >= 2;
  } catch {
    return false;
  }
}

function cleanTitle(raw: string): string {
  let title = raw.trim();
  for (const prefix of NOISE_PREFIXES) {
    if (!title.startsWith(prefix)) continue;
    const rest = title.slice(prefix.length).trimStart();
    // separator: colon, hyphen, en-dash (U+2013), em-dash (U+2014)
    if (
      rest[0] === ':' ||
      rest[0] === '-' ||
      rest[0] === '–' ||
      rest[0] === '—'
    ) {
      return rest.slice(1).trimStart();
    }
  }
  return title;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; NiraGabayBot/1.0; +https://www.niragabay.com)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  $('a[href]').each((_: number, el: any) => {
    const href = $(el).attr('href');
    if (!href) return;
    try {
      const abs = new URL(href, baseUrl).href;
      if (isMYNetUrl(abs)) seen.add(abs);
    } catch {
      // skip unparseable href
    }
  });
  return [...seen];
}

function extractMetadata(html: string): {
  title: string | null;
  publishedAt: string | null;
  containsAuthor: boolean;
  bodyText: string;
  contentLength: number;
} {
  const $ = cheerio.load(html);

  // Strip site chrome to avoid false positives and inflated content length
  $('header, footer, nav, aside').remove();
  $('.related, .recommended, .breadcrumb, .ad, .widget, .comments, .social').remove();

  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const containsAuthor = bodyText.includes(AUTHOR_NAME);
  const contentLength = bodyText.length;

  // Title — prefer structured selectors, fall back to meta/title tag
  let title: string | null = null;
  const titleCandidates = [
    $('h1.entry-title').first().text(),
    $('h1.article-title').first().text(),
    $('h1.post-title').first().text(),
    $('article h1').first().text(),
    $('h1').first().text(),
    $('meta[property="og:title"]').attr('content') ?? '',
    $('meta[name="twitter:title"]').attr('content') ?? '',
    ($('title').text() ?? '').split('|')[0].split('-')[0],
  ];
  for (const candidate of titleCandidates) {
    const cleaned = cleanTitle(candidate);
    if (cleaned.length > 4) {
      title = cleaned;
      break;
    }
  }

  // Published date — prefer machine-readable meta/datetime attributes
  let publishedAt: string | null = null;
  const dateCandidates: Array<string | undefined> = [
    $('meta[property="article:published_time"]').attr('content'),
    $('meta[name="pubdate"]').attr('content'),
    $('time[datetime]').first().attr('datetime'),
  ];
  for (const candidate of dateCandidates) {
    if (candidate?.trim()) {
      publishedAt = candidate.trim();
      break;
    }
  }

  return { title, publishedAt, containsAuthor, bodyText, contentLength };
}

function isSoft404(bodyText: string): boolean {
  const lower = bodyText.toLowerCase();
  return SOFT_404_STRINGS.some((s) => lower.includes(s.toLowerCase()));
}

function buildCsv(articles: SourceArticle[]): string {
  const HEADER =
    'source_url_hash,source_url,source_url_normalized,source_site,source_title,source_published_at,discovered_at,verification_mode,content_length';
  const rows = articles.map((a) =>
    [
      a.source_url_hash,
      a.source_url,
      a.source_url_normalized,
      a.source_site,
      (a.source_title ?? '').replace(/"/g, '""'),
      a.source_published_at ?? '',
      a.discovered_at,
      a.verification_mode,
      String(a.content_length),
    ]
      .map((v) => '"' + v + '"')
      .join(','),
  );
  return [HEADER, ...rows].join('\n');
}

// ---------------------------------------------------------------------------
// Discovery sources
// ---------------------------------------------------------------------------

async function discoverFromSitemap(url: string, depth = 0): Promise<string[]> {
  if (depth > 1) return [];
  const xml = await fetchPage(url);
  if (!xml) return [];
  const $ = cheerio.load(xml, { xmlMode: true });

  // Sitemapindex: recurse into child sitemaps
  const childLocs: string[] = $('sitemapindex sitemap loc')
    .map((_: number, el: any) => $(el).text().trim())
    .get()
    .slice(0, MAX_CHILD_SITEMAPS);

  if (childLocs.length > 0) {
    const all: string[] = [];
    for (const loc of childLocs) {
      await sleep(DELAY_MS);
      const found = await discoverFromSitemap(loc, depth + 1);
      all.push(...found);
    }
    return all;
  }

  // Regular urlset: extract <loc> values
  return ($('urlset url loc')
    .map((_: number, el: any) => $(el).text().trim())
    .get() as string[])
    .filter((u) => isMYNetUrl(u) && isArticleLike(u));
}

async function discoverFromRss(feedUrl: string): Promise<string[]> {
  const xml = await fetchPage(feedUrl);
  if (!xml) return [];
  const $ = cheerio.load(xml, { xmlMode: true });
  const urls: string[] = [];

  // RSS 2.0: <item><link>...</link>
  $('item link').each((_: number, el: any) => {
    const text = $(el).text().trim();
    if (text) urls.push(text);
  });

  // Atom: <entry><link href="...">
  $('entry link[href]').each((_: number, el: any) => {
    const href = $(el).attr('href') ?? '';
    if (href) urls.push(href);
  });

  return urls.filter((u) => isMYNetUrl(u) && isArticleLike(u));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Starting source article discovery -- m-y-net.co.il');
  console.log('='.repeat(60));
  console.log(
    'Mode:',
    INSERT_MODE ? 'INSERT (writing to Supabase)' : 'Dry run (no Supabase writes)',
  );
  console.log();

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  // Step 1: Read manually-seeded URLs
  const seedsFile = path.join(DATA_DIR, 'source-article-seeds.txt');
  const seedUrls: string[] = fs.existsSync(seedsFile)
    ? fs
        .readFileSync(seedsFile, 'utf-8')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#') && l.startsWith('http'))
    : [];
  console.log('Seed URLs loaded:', seedUrls.length);
  if (TRUST_SEEDS) console.log('Trust-seeds mode: seed URLs bypass author-name check');
  const seedUrlSet = new Set<string>(seedUrls);

  // Step 2: Discover from sitemap.xml
  const candidateSet = new Set<string>(seedUrls);
  console.log('Trying sitemap.xml...');
  const sitemapUrls = await discoverFromSitemap(SITEMAP_URL);
  sitemapUrls.forEach((u) => candidateSet.add(u));
  console.log('  Sitemap article-like URLs found: ' + sitemapUrls.length);
  await sleep(DELAY_MS);

  // Step 3: Discover from RSS feeds
  console.log('Trying RSS feeds...');
  for (const feedUrl of RSS_FEEDS) {
    const feedUrls = await discoverFromRss(feedUrl);
    const before = candidateSet.size;
    feedUrls.forEach((u) => candidateSet.add(u));
    console.log('  ' + feedUrl + ': ' + feedUrls.length + ' URLs (' + (candidateSet.size - before) + ' new)');
    await sleep(DELAY_MS);
  }

  // Step 4: Crawl search result pages
  console.log('Crawling m-y-net.co.il search pages...');

  for (let page = 1; page <= MAX_SEARCH_PAGES; page++) {
    const url = page === 1 ? SEARCH_URL : SEARCH_URL + '&page=' + page;
    const html = await fetchPage(url);
    if (!html) {
      console.log('  Page ' + page + ' -- not accessible, stopping search crawl');
      break;
    }
    const links = extractLinks(html, url);
    const articleLinks = links.filter(isArticleLike);
    const before = candidateSet.size;
    articleLinks.forEach((u) => candidateSet.add(u));
    const added = candidateSet.size - before;
    console.log(
      '  Page ' + page + ' -- ' + links.length + ' links, ' +
      articleLinks.length + ' article-like (' + added + ' new)',
    );
    if (articleLinks.length === 0) break;
    await sleep(DELAY_MS);
  }

  const totalCandidates = candidateSet.size;
  console.log('\nCandidate URLs found: ' + totalCandidates);

  // Step 5: Fetch and verify each candidate
  const verified: SourceArticle[] = [];
  const skipped: SkippedUrl[] = [];
  const discoveredAt = new Date().toISOString();
  let idx = 0;

  for (const rawUrl of candidateSet) {
    idx++;
    const normalized = normalizeUrl(rawUrl);
    const hash = md5(normalized);
    const isSeed = seedUrlSet.has(rawUrl);

    process.stdout.write('\r  Checking ' + idx + '/' + totalCandidates + '...');

    if (!isArticleLike(normalized)) {
      skipped.push({ url: rawUrl, url_normalized: normalized, reason: 'non-article URL pattern' });
      continue;
    }

    await sleep(DELAY_MS);
    const html = await fetchPage(rawUrl);

    if (!html) {
      skipped.push({ url: rawUrl, url_normalized: normalized, reason: 'fetch failed or timed out' });
      continue;
    }

    const { title, publishedAt, containsAuthor, bodyText, contentLength } = extractMetadata(html);

    // Soft 404 check — applies to all URLs regardless of trust mode
    if (isSoft404(bodyText)) {
      skipped.push({ url: rawUrl, url_normalized: normalized, reason: 'soft 404 detected' });
      continue;
    }

    // Content length check — applies to all URLs
    if (contentLength < 800) {
      skipped.push({ url: rawUrl, url_normalized: normalized, reason: 'content too short (' + contentLength + ' chars)' });
      continue;
    }

    // Title check — applies to all URLs
    if (!title || title.length < 5) {
      skipped.push({ url: rawUrl, url_normalized: normalized, reason: 'title missing or too short' });
      continue;
    }

    // Trusted seed bypass: skip author check for manually seeded URLs when --trust-seeds is set
    if (TRUST_SEEDS && isSeed) {
      // Extra preference: column URL pattern makes this a stronger match
      const isColumnUrl = rawUrl.includes(PARENTS_COLUMN_SEGMENT);
      if (!isColumnUrl) {
        // Still accept, but note it doesn't match the expected column pattern
      }
      verified.push({
        source_url: rawUrl,
        source_url_normalized: normalized,
        source_url_hash: hash,
        source_site: SITE_HOST,
        source_title: title,
        source_published_at: publishedAt,
        discovered_at: discoveredAt,
        verification_mode: 'trusted_seed',
        content_length: contentLength,
      });
      continue;
    }

    // Standard verification: require author name
    if (!containsAuthor) {
      skipped.push({ url: rawUrl, url_normalized: normalized, reason: 'author name not found on page' });
      continue;
    }

    verified.push({
      source_url: rawUrl,
      source_url_normalized: normalized,
      source_url_hash: hash,
      source_site: SITE_HOST,
      source_title: title,
      source_published_at: publishedAt,
      discovered_at: discoveredAt,
      verification_mode: 'author_match',
      content_length: contentLength,
    });
  }

  console.log('\n');

  // Step 4: Write output files
  const articlesFile = path.join(DATA_DIR, 'source-articles.json');
  const skippedFile = path.join(DATA_DIR, 'source-articles-skipped.json');
  const csvFile = path.join(DATA_DIR, 'source-articles.csv');

  fs.writeFileSync(articlesFile, JSON.stringify(verified, null, 2), 'utf-8');
  fs.writeFileSync(skippedFile, JSON.stringify(skipped, null, 2), 'utf-8');
  fs.writeFileSync(csvFile, buildCsv(verified), 'utf-8');

  // Step 5: Supabase upsert (only when --insert is passed)
  let insertedCount = 0;

  if (INSERT_MODE) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error(
        'Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --insert mode',
      );
    } else {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      const now = new Date().toISOString();

      for (const article of verified) {
        const { error } = await supabase.from('article_import_queue').upsert(
          {
            id: article.source_url_hash,
            source_url: article.source_url,
            source_url_normalized: article.source_url_normalized,
            source_url_hash: article.source_url_hash,
            source_site: article.source_site,
            source_title: article.source_title,
            source_published_at: article.source_published_at,
            status: 'pending',
            attempts: 0,
            created_at: now,
            updated_at: now,
          },
          { onConflict: 'id', ignoreDuplicates: true },
        );

        if (error) {
          console.error('Insert error for', article.source_url, ':', error.message);
        } else {
          insertedCount++;
        }
      }
    }
  }

  // Summary
  const authorMatchCount = verified.filter((a) => a.verification_mode === 'author_match').length;
  const trustedSeedCount = verified.filter((a) => a.verification_mode === 'trusted_seed').length;
  const skipReasons = skipped.reduce<Record<string, number>>((acc, s) => {
    acc[s.reason] = (acc[s.reason] ?? 0) + 1;
    return acc;
  }, {});

  console.log('='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log('Candidate URLs found:          ', totalCandidates);
  console.log('Verified article URLs:         ', verified.length);
  console.log('  -- by author_match:          ', authorMatchCount);
  console.log('  -- by trusted_seed:          ', trustedSeedCount);
  console.log('Skipped URLs:                  ', skipped.length);
  Object.entries(skipReasons).forEach(([reason, count]) => {
    console.log('  -- ' + reason + ': ' + count);
  });
  if (INSERT_MODE) {
    console.log('Inserted to Supabase:         ', insertedCount);
  }
  console.log();
  console.log('Output files:');
  console.log('  ' + articlesFile);
  console.log('  ' + csvFile);
  console.log('  ' + skippedFile);
  console.log('='.repeat(60));
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
