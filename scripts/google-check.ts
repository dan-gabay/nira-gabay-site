#!/usr/bin/env tsx
/**
 * Verifies the Google connection and reports what it can actually see.
 *
 * Run this first whenever something looks wrong: it separates "the token is
 * broken" from "the property is not verified" from "there is genuinely no
 * data", which otherwise all present as an empty report.
 *
 *   npx tsx scripts/google-check.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

export async function accessToken(): Promise<string> {
  const { GSC_CLIENT_ID, GSC_CLIENT_SECRET, GSC_REFRESH_TOKEN } = process.env;
  if (!GSC_CLIENT_ID || !GSC_CLIENT_SECRET || !GSC_REFRESH_TOKEN) {
    throw new Error('Missing GSC_CLIENT_ID / GSC_CLIENT_SECRET / GSC_REFRESH_TOKEN in .env.local');
  }
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GSC_CLIENT_ID,
      client_secret: GSC_CLIENT_SECRET,
      refresh_token: GSC_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const j = (await r.json()) as { access_token?: string; error_description?: string; error?: string };
  if (!j.access_token) {
    throw new Error(`token refresh failed: ${j.error_description || j.error || r.status}`);
  }
  return j.access_token;
}

async function main() {
  const token = await accessToken();
  console.log('token refresh          OK');

  // ── Search Console ────────────────────────────────────────────────
  const sitesRes = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!sitesRes.ok) {
    console.log(`search console         FAILED (${sitesRes.status}) - is the Search Console API enabled on the Cloud project?`);
  } else {
    const j = (await sitesRes.json()) as {
      siteEntry?: Array<{ siteUrl: string; permissionLevel: string }>;
    };
    const sites = j.siteEntry || [];
    console.log(`search console         OK - ${sites.length} propert${sites.length === 1 ? 'y' : 'ies'}`);
    for (const s of sites) console.log(`                         ${s.siteUrl}  [${s.permissionLevel}]`);
    if (sites.length === 0) {
      console.log('                         nothing verified under this Google account yet');
    }
  }

  // ── GA4 ───────────────────────────────────────────────────────────
  const prop = process.env.GA_PROPERTY_ID;
  if (!prop) {
    console.log('ga4                    SKIPPED - GA_PROPERTY_ID not set in .env.local');
    return;
  }
  const gaRes = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${prop}:runReport`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
        metrics: [{ name: 'sessions' }],
      }),
    },
  );
  if (!gaRes.ok) {
    const body = (await gaRes.json()) as { error?: { message?: string } };
    console.log(`ga4                    FAILED (${gaRes.status}) - ${body.error?.message || ''}`);
    return;
  }
  const ga = (await gaRes.json()) as { rows?: Array<{ metricValues: Array<{ value: string }> }> };
  console.log(`ga4                    OK - ${ga.rows?.[0]?.metricValues?.[0]?.value ?? 0} sessions in 28 days`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(String(e instanceof Error ? e.message : e));
    process.exit(1);
  });
}
