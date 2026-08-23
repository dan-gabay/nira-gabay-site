#!/usr/bin/env tsx
/**
 * Paid traffic only, from GA4.
 *
 * ga-report.ts groups by sessionSource/sessionCampaignName, which buries paid
 * among the organic rows and cannot show whether a "(not set)" campaign name
 * means the Ads link has not imported yet or that nothing has run. This filters
 * to the Paid Search channel and prints every campaign dimension GA4 holds.
 *
 *   npx tsx scripts/ads-check.ts [days]
 */
import { accessToken } from './google-check';

const DAYS = Number(process.argv[2] || 7);
const PROP = process.env.GA_PROPERTY_ID;

async function run(token: string, dimensions: string[], metrics: string[]) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROP}:runReport`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: `${DAYS}daysAgo`, endDate: 'today' }],
        dimensions: dimensions.map((name) => ({ name })),
        metrics: metrics.map((name) => ({ name })),
        dimensionFilter: {
          filter: {
            fieldName: 'sessionDefaultChannelGroup',
            stringFilter: { value: 'Paid Search' },
          },
        },
        limit: 25,
      }),
    },
  );
  const j = (await res.json()) as {
    rows?: Array<{ dimensionValues?: Array<{ value: string }>; metricValues?: Array<{ value: string }> }>;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(`${res.status}: ${j.error?.message || ''}`);
  return (j.rows || []).map((r) => ({
    dims: (r.dimensionValues || []).map((d) => d.value),
    vals: (r.metricValues || []).map((m) => Number(m.value)),
  }));
}

async function main() {
  if (!PROP) throw new Error('GA_PROPERTY_ID not set in .env.local');
  const token = await accessToken();
  console.log(`\nPaid Search only · property ${PROP} · last ${DAYS} days\n`);

  const groups: Array<[string, string[], string[]]> = [
    ['CAMPAIGN', ['sessionCampaignName', 'sessionCampaignId'], ['sessions', 'advertiserAdCost', 'advertiserAdClicks']],
    ['AD GROUP / KEYWORD', ['sessionGoogleAdsAdGroupName', 'sessionGoogleAdsKeyword'], ['sessions']],
    ['LANDING PAGE', ['landingPage'], ['sessions', 'bounceRate']],
    ['WHAT THEY DID', ['eventName'], ['eventCount']],
  ];

  for (const [title, dims, mets] of groups) {
    console.log(title);
    console.log('-'.repeat(74));
    let rows;
    try {
      rows = await run(token, dims, mets);
    } catch (e) {
      console.log(`  unavailable: ${e instanceof Error ? e.message : e}\n`);
      continue;
    }
    if (!rows.length) {
      console.log('  (no paid sessions in this window)\n');
      continue;
    }
    for (const r of rows) {
      const label = r.dims.join(' · ').slice(0, 46).padEnd(48);
      console.log(`  ${label}${r.vals.map((v) => (Number.isInteger(v) ? String(v) : v.toFixed(2)).padStart(9)).join('')}`);
    }
    console.log('');
  }
}

main().catch((e) => {
  console.error(String(e instanceof Error ? e.message : e));
  process.exit(1);
});
