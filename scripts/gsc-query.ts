#!/usr/bin/env tsx
/**
 * Query the Google Search Console API (searchanalytics.query) for
 * niragabay.com using the OAuth refresh token from scripts/gsc-auth.ts.
 *
 * Usage:
 *   npx tsx scripts/gsc-query.ts [days] [dimensions]
 *
 *   days       lookback window, default 28
 *   dimensions comma-separated: query,page,date,device,country (default: query,page)
 *
 * Examples:
 *   npx tsx scripts/gsc-query.ts                # last 28 days, by query+page
 *   npx tsx scripts/gsc-query.ts 90 query        # last 90 days, by query only
 *   npx tsx scripts/gsc-query.ts 28 page         # last 28 days, by page only
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const CLIENT_ID = process.env.GSC_CLIENT_ID;
const CLIENT_SECRET = process.env.GSC_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GSC_REFRESH_TOKEN;
const SITE_URL = process.env.GSC_SITE_URL || 'https://www.niragabay.com/';

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  throw new Error('Missing GSC_CLIENT_ID / GSC_CLIENT_SECRET / GSC_REFRESH_TOKEN in .env.local - run scripts/gsc-auth.ts first');
}

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      refresh_token: REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });
  const data = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!data.access_token) throw new Error(`Token refresh failed: ${data.error} ${data.error_description || ''}`);
  return data.access_token;
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const days = Number(process.argv[2]) || 28;
  const dimensions = (process.argv[3] || 'query,page').split(',').map((d) => d.trim());

  const accessToken = await getAccessToken();

  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate: isoDaysAgo(days),
      endDate: isoDaysAgo(1), // GSC data has ~1-2 day lag
      dimensions,
      rowLimit: 100,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GSC API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }>;
  };

  if (!data.rows || data.rows.length === 0) {
    console.log(`No data for ${SITE_URL} in the last ${days} days (dimensions: ${dimensions.join(', ')}).`);
    console.log('This is expected if the property was verified very recently - GSC needs a few days to accumulate data.');
    return;
  }

  console.log(`${SITE_URL} | last ${days} days | dimensions: ${dimensions.join(', ')}\n`);
  console.log(dimensions.join('\t') + '\tclicks\timpressions\tctr\tposition');
  for (const row of data.rows) {
    const ctr = (row.ctr * 100).toFixed(1) + '%';
    const pos = row.position.toFixed(1);
    console.log(`${row.keys.join('\t')}\t${row.clicks}\t${row.impressions}\t${ctr}\t${pos}`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
