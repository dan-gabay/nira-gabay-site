#!/usr/bin/env tsx
/**
 * What people do once they arrive. Search Console stops at the click; this
 * picks up from there.
 *
 * Reports channels, landing pages, the events that matter, and - once Google
 * Ads is linked - campaign and cost data, which is how paid performance gets
 * read without the Ads API and its developer-token approval.
 *
 *   npx tsx scripts/ga-report.ts [days]
 */
import { accessToken } from './google-check';

const DAYS = Number(process.argv[2] || 28);
const PROP = process.env.GA_PROPERTY_ID;

type Report = {
  rows?: Array<{
    dimensionValues?: Array<{ value: string }>;
    metricValues?: Array<{ value: string }>;
  }>;
};

async function run(
  token: string,
  dimensions: string[],
  metrics: string[],
  limit = 20,
  orderByMetric?: string,
): Promise<Array<{ dims: string[]; vals: number[] }>> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROP}:runReport`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: `${DAYS}daysAgo`, endDate: 'today' }],
        dimensions: dimensions.map((name) => ({ name })),
        metrics: metrics.map((name) => ({ name })),
        limit,
        ...(orderByMetric
          ? { orderBys: [{ metric: { metricName: orderByMetric }, desc: true }] }
          : {}),
      }),
    },
  );
  if (!res.ok) {
    const b = (await res.json()) as { error?: { message?: string } };
    throw new Error(`${res.status}: ${b.error?.message || ''}`);
  }
  const j = (await res.json()) as Report;
  // A dimensionless request (the totals row) comes back with no
  // dimensionValues key at all, not an empty array.
  return (j.rows || []).map((r) => ({
    dims: (r.dimensionValues || []).map((d) => d.value),
    vals: (r.metricValues || []).map((m) => Number(m.value)),
  }));
}

const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n));

function table(
  title: string,
  rows: Array<{ dims: string[]; vals: number[] }>,
  headers: string[],
  labelWidth = 44,
) {
  console.log(`\n${title}`);
  console.log('-'.repeat(labelWidth + headers.length * 9));
  if (!rows.length) {
    console.log('  (no data)');
    return;
  }
  console.log(`  ${pad('', labelWidth)}${headers.map((h) => h.padStart(9)).join('')}`);
  for (const r of rows) {
    console.log(
      `  ${pad(r.dims.join(' · '), labelWidth)}${r.vals
        .map((v) => (Number.isInteger(v) ? String(v) : v.toFixed(1)).padStart(9))
        .join('')}`,
    );
  }
}

async function main() {
  if (!PROP) throw new Error('GA_PROPERTY_ID not set in .env.local');
  const token = await accessToken();
  console.log(`\nGA4 · property ${PROP} · last ${DAYS} days`);

  const totals = await run(token, [], ['sessions', 'totalUsers', 'screenPageViews', 'averageSessionDuration'], 1);
  if (totals[0]) {
    const [s, u, v, d] = totals[0].vals;
    console.log(
      `\nTOTAL   ${s} sessions · ${u} users · ${v} pageviews · ` +
        `avg ${Math.round(d)}s per session`,
    );
  }

  table(
    'CHANNELS',
    await run(token, ['sessionDefaultChannelGroup'], ['sessions', 'totalUsers'], 10, 'sessions'),
    ['sessions', 'users'],
    28,
  );

  table(
    'LANDING PAGES',
    await run(token, ['landingPage'], ['sessions', 'bounceRate'], 15, 'sessions'),
    ['sessions', 'bounce%'],
  );

  table(
    'EVENTS',
    await run(token, ['eventName'], ['eventCount'], 25, 'eventCount'),
    ['count'],
    34,
  );

  // Empty until Google Ads is linked to this property. Once it is, this is
  // where paid performance shows up - no Ads API, no developer token.
  try {
    const campaigns = await run(
      token,
      ['sessionSource', 'sessionCampaignName'],
      ['sessions', 'advertiserAdCost', 'advertiserAdClicks'],
      15,
      'sessions',
    );
    table('SOURCE / CAMPAIGN', campaigns, ['sessions', 'cost', 'clicks']);
  } catch (e) {
    console.log('\nSOURCE / CAMPAIGN\n  unavailable: ' + String(e instanceof Error ? e.message : e));
  }

  table(
    'DEVICES',
    await run(token, ['deviceCategory'], ['sessions'], 5, 'sessions'),
    ['sessions'],
    20,
  );
  console.log('');
}

main().catch((e) => {
  console.error(String(e instanceof Error ? e.message : e));
  process.exit(1);
});
