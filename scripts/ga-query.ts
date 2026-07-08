#!/usr/bin/env tsx
/**
 * Query the GA4 Data API (runReport) for niragabay.com using the OAuth
 * refresh token from scripts/ga-auth.ts and the property ID from
 * scripts/ga-list-properties.ts.
 *
 * Usage:
 *   npx tsx scripts/ga-query.ts [days] [dimensions] [metrics]
 *
 *   days       lookback window, default 28
 *   dimensions comma-separated GA4 dimension names (default: pagePath)
 *   metrics    comma-separated GA4 metric names
 *              (default: screenPageViews,activeUsers,engagementRate)
 *
 * Examples:
 *   npx tsx scripts/ga-query.ts                                   # last 28 days, by page
 *   npx tsx scripts/ga-query.ts 90 date sessions,activeUsers       # daily trend, 90 days
 *   npx tsx scripts/ga-query.ts 28 sessionDefaultChannelGroup sessions,conversions
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const CLIENT_ID = process.env.GSC_CLIENT_ID;
const CLIENT_SECRET = process.env.GSC_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GA_REFRESH_TOKEN;
const PROPERTY_ID = process.env.GA_PROPERTY_ID;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  throw new Error('Missing GSC_CLIENT_ID / GSC_CLIENT_SECRET / GA_REFRESH_TOKEN in .env.local - run scripts/ga-auth.ts first');
}
if (!PROPERTY_ID) {
  throw new Error('Missing GA_PROPERTY_ID in .env.local - run scripts/ga-list-properties.ts to find it');
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
  const dimensions = (process.argv[3] || 'pagePath').split(',').map((d) => d.trim());
  const metrics = (process.argv[4] || 'screenPageViews,activeUsers,engagementRate').split(',').map((m) => m.trim());

  const accessToken = await getAccessToken();

  const endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: isoDaysAgo(days), endDate: 'today' }],
      dimensions: dimensions.map((name) => ({ name })),
      metrics: metrics.map((name) => ({ name })),
      limit: 100,
      orderBys: [{ metric: { metricName: metrics[0] }, desc: true }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GA4 Data API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    rows?: Array<{ dimensionValues: Array<{ value: string }>; metricValues: Array<{ value: string }> }>;
  };

  if (!data.rows || data.rows.length === 0) {
    console.log(`No data for property ${PROPERTY_ID} in the last ${days} days (dimensions: ${dimensions.join(', ')}).`);
    return;
  }

  console.log(`property ${PROPERTY_ID} | last ${days} days | dimensions: ${dimensions.join(', ')} | metrics: ${metrics.join(', ')}\n`);
  console.log(dimensions.join('\t') + '\t' + metrics.join('\t'));
  for (const row of data.rows) {
    const dims = row.dimensionValues.map((v) => v.value).join('\t');
    const mets = row.metricValues.map((v) => v.value).join('\t');
    console.log(`${dims}\t${mets}`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
