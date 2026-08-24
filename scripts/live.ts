#!/usr/bin/env tsx
/**
 * Who is on the site right now.
 *
 * GA4's standard reports lag by hours, and its Ads-imported cost and campaign
 * columns by up to a day, which makes them useless for "is the ad running".
 * The Realtime API has no such lag - it covers the last 30 minutes.
 *
 * Note what this cannot see: anyone blocking Google Analytics. For the number
 * that is not missing a share of visitors, read site_events in Supabase, which
 * is first-party and answers instantly. This is the second opinion, not the
 * first.
 *
 *   npx tsx scripts/live.ts
 */
import { accessToken } from './google-check';

const PROP = process.env.GA_PROPERTY_ID;

type Row = { d: string[]; m: number[] };

async function realtime(token: string, dimensions: string[], metrics: string[], limit = 20): Promise<Row[]> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROP}:runRealtimeReport`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dimensions: dimensions.map((name) => ({ name })),
        metrics: metrics.map((name) => ({ name })),
        limit,
      }),
    },
  );
  const j = (await res.json()) as {
    rows?: Array<{ dimensionValues?: Array<{ value: string }>; metricValues?: Array<{ value: string }> }>;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(`${res.status}: ${j.error?.message || ''}`);
  return (j.rows || []).map((r) => ({
    d: (r.dimensionValues || []).map((v) => v.value),
    m: (r.metricValues || []).map((v) => Number(v.value)),
  }));
}

function table(title: string, rows: Row[], width = 46) {
  console.log(`\n${title}`);
  console.log('-'.repeat(width + 10));
  if (!rows.length) {
    console.log('  (nobody)');
    return;
  }
  for (const r of rows) {
    const label = r.d.join(' · ');
    console.log(`  ${(label.length > width ? label.slice(0, width - 1) + '…' : label).padEnd(width)}${String(r.m[0]).padStart(6)}`);
  }
}

async function main() {
  if (!PROP) throw new Error('GA_PROPERTY_ID not set in .env.local');
  const token = await accessToken();

  const total = await realtime(token, [], ['activeUsers'], 1);
  console.log(`\nGA4 realtime · last 30 minutes · ${total[0]?.m[0] ?? 0} active users`);

  table('PAGES', await realtime(token, ['unifiedScreenName'], ['activeUsers']));
  // The realtime schema is much narrower than the standard one - no
  // sessionSource, no sessionMedium, no campaign. Events are what it does
  // carry, and they are the more useful answer anyway: a contact_whatsapp
  // appearing here is someone reaching out this minute.
  table('EVENTS', await realtime(token, ['eventName'], ['eventCount'], 15), 34);
  table('CITY', await realtime(token, ['city'], ['activeUsers'], 8), 24);
  table('DEVICE', await realtime(token, ['deviceCategory'], ['activeUsers'], 5), 20);

  // A minute-by-minute shape, so a spike is visible rather than averaged away.
  const perMinute = await realtime(token, ['minutesAgo'], ['activeUsers'], 30);
  const by = new Map(perMinute.map((r) => [Number(r.d[0]), r.m[0]]));
  const bars = [];
  for (let i = 29; i >= 0; i--) bars.push(by.get(i) ? String(Math.min(9, by.get(i)!)) : '.');
  console.log(`\nLAST 30 MINUTES (oldest first)\n  ${bars.join('')}`);
  console.log('');
}

main().catch((e) => {
  console.error(String(e instanceof Error ? e.message : e));
  process.exit(1);
});
