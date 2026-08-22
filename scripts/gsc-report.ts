#!/usr/bin/env tsx
/**
 * What the site actually does in Google Search: which queries it appears for,
 * which pages earn the impressions, and where it sits.
 *
 * The existing gsc-query.ts prints one flat table. This one asks the questions
 * that decide what to do next - the gap between impressions and clicks, the
 * queries stuck on page two, and whether the new service pages are being seen
 * at all - because a list of numbers sorted by clicks hides all three.
 *
 *   npx tsx scripts/gsc-report.ts [days]
 */
import { accessToken } from './google-check';

const DAYS = Number(process.argv[2] || 28);
const SITE = process.env.GSC_SITE_URL || 'https://www.niragabay.com/';

type Row = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

const iso = (d: Date) => d.toISOString().slice(0, 10);

async function query(
  token: string,
  dimensions: string[],
  rowLimit = 25,
): Promise<Row[]> {
  const end = new Date();
  const start = new Date(Date.now() - DAYS * 86400_000);
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: iso(start),
        endDate: iso(end),
        dimensions,
        rowLimit,
      }),
    },
  );
  if (!res.ok) {
    const b = (await res.json()) as { error?: { message?: string } };
    throw new Error(`${res.status}: ${b.error?.message || ''}`);
  }
  const j = (await res.json()) as { rows?: Row[] };
  return j.rows || [];
}

const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n));
const num = (n: number, d = 0) => n.toFixed(d).padStart(6);

function table(title: string, rows: Row[], labelWidth = 46) {
  console.log(`\n${title}`);
  console.log('-'.repeat(labelWidth + 30));
  if (!rows.length) {
    console.log('  (no data)');
    return;
  }
  console.log(`  ${pad('', labelWidth)}${'clicks'.padStart(7)}${'impr'.padStart(8)}${'ctr'.padStart(7)}${'pos'.padStart(7)}`);
  for (const r of rows) {
    console.log(
      `  ${pad(r.keys.join(' · '), labelWidth)}${num(r.clicks)} ${num(r.impressions)} ${num(r.ctr * 100, 1)}%${num(r.position, 1)}`,
    );
  }
}

async function main() {
  const token = await accessToken();
  console.log(`\nSearch Console · ${SITE} · last ${DAYS} days`);

  const totals = await query(token, [], 1);
  if (totals[0]) {
    const t = totals[0];
    console.log(
      `\nTOTAL   ${t.clicks} clicks · ${t.impressions} impressions · ` +
        `${(t.ctr * 100).toFixed(1)}% ctr · avg position ${t.position.toFixed(1)}`,
    );
  } else {
    console.log('\nTOTAL   no data in this window');
  }

  const queries = await query(token, ['query'], 30);
  table('TOP QUERIES', queries);

  // Impressions without clicks: Google shows the site, nobody picks it. Either
  // the position is too low or the title and description are not earning the
  // click - and those are two very different fixes.
  const missed = queries
    .filter((r) => r.impressions >= 5 && r.clicks === 0)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15);
  table('SEEN BUT NEVER CLICKED  (>=5 impressions, 0 clicks)', missed);

  // Positions 8-20 are the cheapest wins on any site: already ranking, one
  // page short of the traffic.
  const striking = queries
    .filter((r) => r.position >= 8 && r.position <= 20)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15);
  table('ALMOST THERE  (position 8-20)', striking);

  const pages = await query(token, ['page'], 25);
  table('TOP PAGES', pages.map((r) => ({ ...r, keys: [r.keys[0].replace(/^https?:\/\/[^/]+/, '')] })));

  const countries = await query(token, ['country'], 5);
  table('COUNTRIES', countries, 20);

  const devices = await query(token, ['device'], 5);
  table('DEVICES', devices, 20);
  console.log('');
}

main().catch((e) => {
  console.error(String(e instanceof Error ? e.message : e));
  process.exit(1);
});
