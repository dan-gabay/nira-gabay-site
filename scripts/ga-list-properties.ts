#!/usr/bin/env tsx
/**
 * List GA4 accounts/properties visible to the authorized Google account, so
 * you can find niragabay.com's numeric GA4 property ID (distinct from the
 * "G-XXXXXXX" measurement ID used in components/GoogleAnalytics.tsx) and
 * save it as GA_PROPERTY_ID in .env.local for scripts/ga-query.ts.
 *
 *   npx tsx scripts/ga-list-properties.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const CLIENT_ID = process.env.GSC_CLIENT_ID;
const CLIENT_SECRET = process.env.GSC_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GA_REFRESH_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  throw new Error('Missing GSC_CLIENT_ID / GSC_CLIENT_SECRET / GA_REFRESH_TOKEN in .env.local - run scripts/ga-auth.ts first');
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

async function main() {
  const accessToken = await getAccessToken();

  const res = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Admin API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    accountSummaries?: Array<{
      displayName: string;
      account: string;
      propertySummaries?: Array<{ property: string; displayName: string }>;
    }>;
  };

  if (!data.accountSummaries || data.accountSummaries.length === 0) {
    console.log('No GA4 accounts/properties visible to this account. Make sure you authorized with the Google account that has access to the niragabay.com GA4 property.');
    return;
  }

  for (const acct of data.accountSummaries) {
    console.log(`Account: ${acct.displayName} (${acct.account})`);
    for (const prop of acct.propertySummaries || []) {
      const propertyId = prop.property.replace('properties/', '');
      console.log(`  Property: ${prop.displayName}  ->  GA_PROPERTY_ID=${propertyId}`);
    }
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
