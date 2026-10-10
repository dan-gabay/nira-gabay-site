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
import { googleToken, SCOPES, type GoogleApi } from './google-token';

// Kept for the scripts that import it. Default stays Search Console, as before;
// GA4 readers pass 'ga'. Works locally (.env.local) and in cloud sessions
// (network secrets), see scripts/google-token.ts.
export async function accessToken(api: GoogleApi = 'gsc'): Promise<string> {
  return (await googleToken(api)).token;
}

async function main() {
  const { token, scopes, mode } = await googleToken('gsc', { requireScope: false });
  console.log(`token refresh          OK (${mode})`);
  // Scope names only - never the token.
  for (const [name, scope] of Object.entries(SCOPES)) {
    console.log(`  scope ${name.padEnd(16)} ${scopes.includes(scope) ? 'yes' : 'no'}`);
  }

  // ── Search Console ────────────────────────────────────────────────
  const sitesRes = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!sitesRes.ok) {
    console.log(`search console         FAILED (${sitesRes.status}) - token lacks the Search Console scope, or the API is not enabled on the Cloud project`);
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
    console.log('ga4                    SKIPPED - GA_PROPERTY_ID not set (.env.local or environment)');
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
