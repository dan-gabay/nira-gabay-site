#!/usr/bin/env tsx
/**
 * Query the GA4 Data API (runReport) for niragabay.com using the OAuth
 * refresh token from scripts/ga-auth.ts and the property ID from
 * scripts/ga-list-properties.ts.
 *
 * Usage:
 *   npx tsx scripts/ga-query.ts [days] [dimensions] [metrics] [--limit N]
 *   npx tsx scripts/ga-query.ts --start YYYY-MM-DD --end YYYY-MM-DD [dimensions] [metrics]
 *
 *   days       last N complete days ending yesterday, Asia/Jerusalem (default 28)
 *   --start/--end  explicit inclusive window (use these for weekly/monthly reports)
 *   dimensions comma-separated GA4 dimension names (default: pagePath)
 *   metrics    comma-separated GA4 metric names
 *              (default: screenPageViews,activeUsers,engagementRate)
 *   --limit    max rows (default 100)
 *
 * Prints the exact window and a TOTAL row computed by GA4, so a breakdown can
 * be checked against the total. Windows are complete days only (see
 * scripts/google-dates.ts).
 *
 * Examples:
 *   npx tsx scripts/ga-query.ts                                   # last 28 days, by page
 *   npx tsx scripts/ga-query.ts 90 date sessions,activeUsers       # daily trend, 90 days
 *   npx tsx scripts/ga-query.ts --start 2026-09-28 --end 2026-10-04 sessionDefaultChannelGroup sessions,keyEvents
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { accessTokenFor } from './google-token';
import { parseWindowArgs, todayInReportTz } from './google-dates';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const PROPERTY_ID = process.env.GA_PROPERTY_ID;

if (!PROPERTY_ID) {
  throw new Error('Missing GA_PROPERTY_ID in .env.local - run scripts/ga-list-properties.ts to find it');
}

// Local .env.local or cloud network secrets - see scripts/google-token.ts.
async function getAccessToken(): Promise<string> {
  return accessTokenFor('ga');
}

async function main() {
  const { window, positionals, flags } = parseWindowArgs(process.argv.slice(2));
  const dimensions = (positionals[0] || 'pagePath').split(',').map((d) => d.trim());
  const metrics = (positionals[1] || 'screenPageViews,activeUsers,engagementRate').split(',').map((m) => m.trim());
  const limit = Number(flags.limit) || 100;

  const accessToken = await getAccessToken();

  const endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: window.start, endDate: window.end }],
      dimensions: dimensions.map((name) => ({ name })),
      metrics: metrics.map((name) => ({ name })),
      metricAggregations: ['TOTAL'],
      limit,
      orderBys: [{ metric: { metricName: metrics[0] }, desc: true }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GA4 Data API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    rows?: Array<{ dimensionValues: Array<{ value: string }>; metricValues: Array<{ value: string }> }>;
    totals?: Array<{ metricValues: Array<{ value: string }> }>;
    rowCount?: number;
    metadata?: { samplingMetadatas?: unknown[]; subjectToThresholding?: boolean; timeZone?: string };
  };

  const label = `${window.start} to ${window.end} (${window.days} days)`;
  if (!data.rows || data.rows.length === 0) {
    console.log(`No data for property ${PROPERTY_ID}, ${label} (dimensions: ${dimensions.join(', ')}).`);
    return;
  }

  console.log(`property ${PROPERTY_ID} | ${label}, ${data.metadata?.timeZone ?? 'property time zone'} | dimensions: ${dimensions.join(', ')} | metrics: ${metrics.join(', ')}`);
  if (window.end >= todayInReportTz()) console.log('NOTE: window includes today - partial day, figures will change.');
  if (data.metadata?.samplingMetadatas?.length) console.log('NOTE: GA4 sampled this report.');
  if (data.metadata?.subjectToThresholding) console.log('NOTE: GA4 applied thresholding; small rows may be withheld.');
  if (data.rowCount && data.rowCount > data.rows.length) console.log(`NOTE: showing ${data.rows.length} of ${data.rowCount} rows (raise --limit).`);
  console.log('');
  console.log(dimensions.join('\t') + '\t' + metrics.join('\t'));
  for (const row of data.rows) {
    const dims = row.dimensionValues.map((v) => v.value).join('\t');
    const mets = row.metricValues.map((v) => v.value).join('\t');
    console.log(`${dims}\t${mets}`);
  }
  const totals = data.totals?.[0]?.metricValues;
  if (totals) console.log(`${dimensions.map((_, i) => (i === 0 ? 'TOTAL' : '')).join('\t')}\t${totals.map((v) => v.value).join('\t')}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
