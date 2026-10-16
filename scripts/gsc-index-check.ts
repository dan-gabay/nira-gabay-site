#!/usr/bin/env tsx
/**
 * Index status of every URL in the sitemap, via the Search Console URL
 * Inspection API (read-only). Run weekly as part of the Weekly Growth Report.
 *
 * Usage:
 *   npx tsx scripts/gsc-index-check.ts [--sitemap-file path] [--json out.json]
 *
 *   --sitemap-file  read the sitemap XML from a file instead of fetching
 *                   https://www.niragabay.com/sitemap.xml. Cloud sessions cannot
 *                   reach niragabay.com directly: fetch it with the Vercel MCP
 *                   (web_fetch_vercel_url), save the text, pass the file here.
 *   --json          also write every URL's result to this file, so next week's
 *                   run can be compared with it.
 *
 * Prints one summary line per index state, then only the URLs that need a look:
 * not indexed, or indexed but not crawled for STALE_DAYS. The inspection quota
 * is 2,000 URLs a day per property; the site has ~60.
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { accessTokenFor } from './google-token';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:niragabay.com';
const SITEMAP_URL = 'https://www.niragabay.com/sitemap.xml';
const STALE_DAYS = 90;
const CONCURRENCY = 4;

type Result = { url: string; coverage: string; lastCrawl: string | null; googleCanonical: string | null; error?: string };

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function sitemapUrls(): Promise<string[]> {
  const file = flag('sitemap-file');
  const xml = file ? fs.readFileSync(file, 'utf8') : await (await fetch(SITEMAP_URL)).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (urls.length === 0) throw new Error('no <loc> entries found in the sitemap');
  return urls;
}

async function inspect(token: string, url: string): Promise<Result> {
  const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE_URL }),
  });
  if (!res.ok) return { url, coverage: 'API error', lastCrawl: null, googleCanonical: null, error: `${res.status} ${await res.text()}` };
  const s = ((await res.json()) as { inspectionResult?: { indexStatusResult?: Record<string, string> } }).inspectionResult?.indexStatusResult ?? {};
  return { url, coverage: s.coverageState || 'unknown', lastCrawl: s.lastCrawlTime || null, googleCanonical: s.googleCanonical || null };
}

async function main() {
  const urls = await sitemapUrls();
  const token = await accessTokenFor('gsc');

  const results: Result[] = [];
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    results.push(...(await Promise.all(urls.slice(i, i + CONCURRENCY).map((u) => inspect(token, u)))));
  }

  const today = new Date().toISOString().slice(0, 10);
  console.log(`${SITE_URL} | ${urls.length} sitemap URLs | inspected ${today}`);
  const counts = new Map<string, number>();
  for (const r of results) counts.set(r.coverage, (counts.get(r.coverage) || 0) + 1);
  for (const [state, n] of [...counts].sort((a, b) => b[1] - a[1])) console.log(`${n}\t${state}`);

  const staleBefore = Date.now() - STALE_DAYS * 86_400_000;
  const flagged = results.filter(
    (r) =>
      r.coverage !== 'Submitted and indexed' ||
      (r.lastCrawl && Date.parse(r.lastCrawl) < staleBefore) ||
      (r.googleCanonical && r.googleCanonical !== r.url),
  );
  console.log('');
  if (flagged.length === 0) {
    console.log('Every sitemap URL is indexed, recently crawled and canonical to itself.');
  } else {
    console.log('url\tstate\tlast crawl\tnote');
    for (const r of flagged) {
      const note = [
        r.googleCanonical && r.googleCanonical !== r.url ? `Google canonical: ${r.googleCanonical}` : '',
        r.coverage === 'Submitted and indexed' ? `not crawled for ${STALE_DAYS}+ days` : '',
        r.error || '',
      ].filter(Boolean).join('; ');
      console.log(`${r.url}\t${r.coverage}\t${r.lastCrawl?.slice(0, 10) || '-'}\t${note}`);
    }
  }

  const out = flag('json');
  if (out) fs.writeFileSync(out, JSON.stringify({ site: SITE_URL, inspected: today, results }, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
