#!/usr/bin/env tsx
/**
 * Query the Google Search Console API (searchanalytics.query) for
 * niragabay.com using the OAuth refresh token from scripts/gsc-auth.ts.
 *
 * Usage:
 *   npx tsx scripts/gsc-query.ts [days] [dimensions] [--data-state all|final] [--limit N]
 *   npx tsx scripts/gsc-query.ts --start YYYY-MM-DD --end YYYY-MM-DD [dimensions]
 *
 *   days         last N complete days ending yesterday, Asia/Jerusalem (default 28)
 *   --start/--end  explicit inclusive window (use these for weekly/monthly reports)
 *   dimensions   comma-separated: query,page,date,device,country (default: query,page)
 *   --data-state "all" (default) includes fresh data from the last ~2-3 days;
 *                "final" returns only finalized days, so recent days read as 0
 *   --limit      max rows (default 100)
 *
 * Search Console dates are Pacific Time and the last ~3 days are provisional;
 * the script says when the window touches them. It also prints the window
 * TOTAL from a separate no-dimension request, because query rows never add up
 * to it (Google withholds rare queries).
 *
 * Examples:
 *   npx tsx scripts/gsc-query.ts                # last 28 days, by query+page
 *   npx tsx scripts/gsc-query.ts 90 query        # last 90 days, by query only
 *   npx tsx scripts/gsc-query.ts --start 2026-09-28 --end 2026-10-04 page
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { accessTokenFor } from './google-token';
import { addDays, parseWindowArgs, todayInReportTz } from './google-dates';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SITE_URL = process.env.GSC_SITE_URL || 'https://www.niragabay.com/';

// Local .env.local or cloud network secrets - see scripts/google-token.ts.
async function getAccessToken(): Promise<string> {
  return accessTokenFor('gsc');
}

// Search Console finalizes data with a ~2-3 day lag.
const PROVISIONAL_DAYS = 3;

type GscRow = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number };

async function main() {
  const { window, positionals, flags } = parseWindowArgs(process.argv.slice(2));
  const dimensions = (positionals[0] || 'query,page').split(',').map((d) => d.trim());
  const dataState = flags['data-state'] || 'all';
  if (dataState !== 'all' && dataState !== 'final') throw new Error(`--data-state must be all or final, got ${dataState}`);
  const rowLimit = Number(flags.limit) || 100;

  const accessToken = await getAccessToken();
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`;

  async function query(dims: string[]): Promise<GscRow[]> {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: window.start,
        endDate: window.end,
        dimensions: dims,
        dataState,
        rowLimit,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GSC API error ${res.status}: ${text}`);
    }
    return ((await res.json()) as { rows?: GscRow[] }).rows ?? [];
  }

  const [rows, totalRows] = await Promise.all([query(dimensions), query([])]);
  const label = `${window.start} to ${window.end} (${window.days} days, Pacific Time dates, dataState ${dataState})`;

  if (rows.length === 0) {
    console.log(`No data for ${SITE_URL}, ${label} (dimensions: ${dimensions.join(', ')}).`);
    console.log('This is expected if the property was verified very recently - GSC needs a few days to accumulate data.');
    return;
  }

  console.log(`${SITE_URL} | ${label} | dimensions: ${dimensions.join(', ')}`);
  const firstProvisional = addDays(todayInReportTz(), -PROVISIONAL_DAYS);
  if (window.end >= firstProvisional) {
    const from = window.start > firstProvisional ? window.start : firstProvisional;
    console.log(`NOTE: ${from} to ${window.end} is PROVISIONAL (Search Console lag); ${dataState === 'final' ? 'those days may read as 0' : 'figures may still rise'}.`);
  }
  if (rows.length === rowLimit) console.log(`NOTE: row limit ${rowLimit} reached; raise --limit for more.`);
  console.log('');

  const fmt = (r: GscRow) => `${r.clicks}\t${r.impressions}\t${(r.ctr * 100).toFixed(1)}%\t${r.position.toFixed(1)}`;
  console.log(dimensions.join('\t') + '\tclicks\timpressions\tctr\tposition');
  for (const row of rows) console.log(`${(row.keys ?? []).join('\t')}\t${fmt(row)}`);

  const total = totalRows[0];
  if (total) {
    console.log(`${dimensions.map((_, i) => (i === 0 ? 'TOTAL' : '')).join('\t')}\t${fmt(total)}`);
    if (dimensions.includes('query')) console.log('(Query rows do not add up to TOTAL: Google withholds rare queries.)');
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
