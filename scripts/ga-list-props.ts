#!/usr/bin/env tsx
/**
 * Lists the GA4 accounts and properties this token can read, with their
 * numeric property IDs.
 *
 * The property ID is a 9-digit number and is easy to confuse with the
 * measurement ID (G-XXXXXXX) or a Cloud project id. The analytics.readonly
 * scope already covers the Admin API, so there is no reason to make anyone
 * hunt for it in the UI.
 *
 *   npx tsx scripts/ga-list-props.ts
 */
import { accessToken } from './google-check';

type Summary = {
  account: string;
  displayName: string;
  propertySummaries?: Array<{ property: string; displayName: string; propertyType?: string }>;
};

async function main() {
  const token = await accessToken();
  const res = await fetch(
    'https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200',
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    const b = (await res.json()) as { error?: { message?: string } };
    throw new Error(`${res.status}: ${b.error?.message || ''}`);
  }
  const j = (await res.json()) as { accountSummaries?: Summary[] };
  const accounts = j.accountSummaries || [];
  if (!accounts.length) {
    console.log('No GA4 accounts visible to this token.');
    return;
  }
  for (const a of accounts) {
    console.log(`\n${a.displayName}   (${a.account})`);
    for (const p of a.propertySummaries || []) {
      const id = p.property.replace('properties/', '');
      console.log(`   ${id}   ${p.displayName}${p.propertyType ? '  [' + p.propertyType + ']' : ''}`);
    }
  }
  console.log('');
}

main().catch((e) => {
  console.error(String(e instanceof Error ? e.message : e));
  process.exit(1);
});
