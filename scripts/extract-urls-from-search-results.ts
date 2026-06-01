#!/usr/bin/env tsx
/**
 * extract-urls-from-search-results.ts
 *
 * Extracts m-y-net.co.il article URLs from pasted Google search result
 * text or saved HTML in data/google-search-results.txt.
 *
 * Usage:
 *   npm run extract:search-urls
 *
 * Output:
 *   data/extracted-search-urls.txt  -- new URLs not yet in seeds
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), 'data');
const INPUT_FILE = path.join(DATA_DIR, 'google-search-results.txt');
const OUTPUT_FILE = path.join(DATA_DIR, 'extracted-search-urls.txt');
const SEEDS_FILE = path.join(DATA_DIR, 'source-article-seeds.txt');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// URL-encoded form of the mandatory section prefix "מטה-" (the first path segment of all articles)
const MATEH_ENCODED = '%D7%9E%D7%98%D7%94-';

// These substrings disqualify a URL from being an article
const EXCLUDE_SUBSTRINGS = ['/search', '/cdn-cgi/', '/local/'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function decodeGoogleRedirect(raw: string): string {
  try {
    const u = new URL(raw);
    if (u.hostname.includes('google.') && u.pathname === '/url') {
      const q = u.searchParams.get('q');
      if (q) return q;
    }
  } catch {
    // not a URL
  }
  return raw;
}

function normalizeUrl(raw: string): string {
  try {
    raw = decodeGoogleRedirect(raw.trim());
    // Strip trailing punctuation that may have been captured by the regex
    raw = raw.replace(/[.,;!?()\]]+$/, '');
    const u = new URL(raw);
    if (!u.hostname.endsWith('m-y-net.co.il')) return '';
    u.hostname = u.hostname.toLowerCase();
    u.search = '';
    u.hash = '';
    if (!u.pathname.endsWith('/')) u.pathname += '/';
    return u.href;
  } catch {
    return '';
  }
}

function isArticleLike(normalizedUrl: string): boolean {
  // Must include the URL-encoded מטה- section prefix
  if (!normalizedUrl.includes(MATEH_ENCODED)) return false;
  // Must not match any exclusion pattern
  for (const excl of EXCLUDE_SUBSTRINGS) {
    if (normalizedUrl.includes(excl)) return false;
  }
  // Must have at least 2 non-empty path segments (section + article slug)
  try {
    const segments = new URL(normalizedUrl).pathname.split('/').filter(Boolean);
    return segments.length >= 2;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Google breadcrumb parser
// ---------------------------------------------------------------------------

// Google plain-text results show display URLs in this format (U+203A as separator):
//   https://www.m-y-net.co.il › מטה-יהודה › הורים-וילדים-slug...
// These are NOT actual hrefs; slugs are often truncated with "...".
// This parser reconstructs what it can and flags truncated entries.

interface BreadcrumbResult {
  reconstructed: string;   // best-effort URL (may be prefix-only if truncated)
  truncated: boolean;      // true when slug ended with "..."
  slugPrefix: string;      // the raw (possibly partial) slug text
}

function parseGoogleBreadcrumbs(text: string): BreadcrumbResult[] {
  const SEPARATOR = '›'; // ›
  const results: BreadcrumbResult[] = [];

  // Each breadcrumb line: "https://www.m-y-net.co.il › seg1 › seg2..."
  const lineRe = new RegExp(
    'https?:\\/\\/(?:www\\.)?m-y-net\\.co\\.il(?:\\s*' +
    SEPARATOR +
    '\\s*[^\\n' +
    SEPARATOR +
    ']+){1,}',
    'g',
  );

  for (const m of text.matchAll(lineRe)) {
    const raw = m[0];
    const parts = raw.split(SEPARATOR).map((p) => p.trim());
    // parts[0] = domain, parts[1..] = path segments
    const segments = parts.slice(1);
    if (segments.length < 2) continue;

    const truncated = raw.trimEnd().endsWith('...');

    // URL-encode each segment, stripping the trailing "..." from the last one
    const encodedSegments = segments.map((seg, i) => {
      if (i === segments.length - 1) seg = seg.replace(/\s*\.\.\.\s*$/, '').trim();
      return encodeURIComponent(seg).replace(/%2D/g, '-'); // keep hyphens readable
    });

    const reconstructed =
      'https://www.m-y-net.co.il/' + encodedSegments.join('/') + '/';
    const slugPrefix = segments[segments.length - 1].replace(/\s*\.\.\.\s*$/, '').trim();

    results.push({ reconstructed, truncated, slugPrefix });
  }

  return results;
}

function extractRawUrls(text: string): string[] {
  const found = new Set<string>();

  // Pattern 1: bare m-y-net.co.il URLs in plain text
  const directRe = /https?:\/\/(?:www\.)?m-y-net\.co\.il\/[^\s"'<>()[\]]+/gi;
  for (const m of text.matchAll(directRe)) found.add(m[0]);

  // Pattern 2: Google redirect wrapper — extract the inner URL
  const googleRe = /https?:\/\/www\.google\.[a-z.]+\/url\?[^\s"'<>]+m-y-net\.co\.il[^\s"'<>]*/gi;
  for (const m of text.matchAll(googleRe)) {
    const inner = decodeGoogleRedirect(m[0]);
    if (inner !== m[0]) found.add(inner);
  }

  // Pattern 3: href attributes in HTML (saved page or copy-paste of page source)
  const hrefRe = /href=["']([^"']*m-y-net\.co\.il[^"']*)["']/gi;
  for (const m of text.matchAll(hrefRe)) found.add(m[1]);

  return [...found];
}

function loadSeeds(): Set<string> {
  const seeds = new Set<string>();
  if (!fs.existsSync(SEEDS_FILE)) return seeds;
  fs.readFileSync(SEEDS_FILE, 'utf-8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && l.startsWith('http'))
    .forEach((url) => {
      const norm = normalizeUrl(url);
      if (norm) seeds.add(norm);
    });
  return seeds;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error('Input file not found: ' + INPUT_FILE);
    console.error('Create it and paste Google search results into it, then re-run.');
    process.exit(1);
  }

  const input = fs.readFileSync(INPUT_FILE, 'utf-8');
  const nonCommentContent = input
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('#'))
    .join('\n');

  if (!nonCommentContent.trim()) {
    console.log('Input file has no content. Paste search results into: ' + INPUT_FILE);
    process.exit(0);
  }

  // Step 1: Extract raw URLs from input
  const rawUrls = extractRawUrls(nonCommentContent);
  const totalFound = rawUrls.length;

  // Step 2: Normalize and filter to article-like URLs
  const articleUrls = new Set<string>();
  for (const raw of rawUrls) {
    const norm = normalizeUrl(raw);
    if (norm && isArticleLike(norm)) articleUrls.add(norm);
  }
  const articleLikeCount = articleUrls.size;

  // Step 3: Compare against existing seeds
  const existingSeeds = loadSeeds();
  const newUrls: string[] = [];
  let alreadyInSeeds = 0;

  for (const url of articleUrls) {
    if (existingSeeds.has(url)) {
      alreadyInSeeds++;
    } else {
      newUrls.push(url);
    }
  }

  // Step 4: Write output
  const outputLines = newUrls.length > 0
    ? ['# Extracted new article URLs -- copy into data/source-article-seeds.txt', ...newUrls]
    : ['# No new URLs found'];
  fs.writeFileSync(OUTPUT_FILE, outputLines.join('\n') + '\n', 'utf-8');

  // Step 5a: Google breadcrumb analysis (runs even when direct URL count is 0)
  const breadcrumbs = parseGoogleBreadcrumbs(nonCommentContent);
  const bcInSeeds: string[] = [];
  const bcNew: BreadcrumbResult[] = [];

  for (const bc of breadcrumbs) {
    // Check if any seed URL starts with the reconstructed prefix (handles truncation)
    const norm = normalizeUrl(bc.reconstructed);
    const matchedSeed = norm && existingSeeds.has(norm)
      ? norm
      : [...existingSeeds].find((s) => s.startsWith(bc.reconstructed.replace(/\/$/, '')));
    if (matchedSeed) {
      bcInSeeds.push(matchedSeed);
    } else {
      bcNew.push(bc);
    }
  }

  // Step 5: Print summary
  console.log('='.repeat(60));
  console.log('URL Extraction Summary');
  console.log('='.repeat(60));
  console.log('Direct URLs found in input:   ', totalFound);
  console.log('Article-like direct URLs:     ', articleLikeCount);
  console.log('Already in seeds (direct):    ', alreadyInSeeds);
  console.log('New URLs (direct, complete):  ', newUrls.length);
  console.log();
  console.log('Google breadcrumbs parsed:    ', breadcrumbs.length);
  console.log('  Already in seeds:           ', bcInSeeds.length);
  console.log('  Potentially new:            ', bcNew.length);
  console.log();
  console.log('Output file:', OUTPUT_FILE);
  console.log('='.repeat(60));

  if (newUrls.length > 0) {
    console.log('\nNew complete URLs ready to add to seeds:');
    newUrls.forEach((u, i) => console.log('  ' + (i + 1) + '. ' + u));
  }

  if (bcNew.length > 0) {
    console.log('\nPotentially new articles from breadcrumbs (click to get full URL):');
    bcNew.forEach((bc, i) => {
      const flag = bc.truncated ? '[TRUNCATED - need full URL]' : '[complete]';
      console.log('  ' + (i + 1) + '. ' + flag);
      console.log('     slug prefix: ' + bc.slugPrefix);
      console.log('     best-effort: ' + bc.reconstructed);
    });
  } else if (breadcrumbs.length > 0) {
    console.log('\nAll breadcrumb results are already in seeds.');
  }
}

main();
