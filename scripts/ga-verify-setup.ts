#!/usr/bin/env tsx
/**
 * Confirms the GA4 side of the paid setup is actually done: which events are
 * marked as key events, and whether Google Ads is linked to the property.
 *
 * Checking rather than trusting matters here because both are silent failures.
 * A key event that was never created and a link that was never confirmed both
 * present as "the campaign has no conversions", weeks later, after the money
 * is spent.
 *
 *   npx tsx scripts/ga-verify-setup.ts
 */
import { accessToken } from './google-check';

const PROP = process.env.GA_PROPERTY_ID;

// The events this site actually fires and that mean "someone reached out".
const WANTED = [
  'contact_whatsapp',
  'contact_phone',
  'contact_email',
  'contact_form_submit',
  'generate_lead',
];

async function get<T>(url: string, token: string): Promise<T | { __error: string }> {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) {
    const b = (await r.json()) as { error?: { message?: string } };
    return { __error: `${r.status}: ${b.error?.message || ''}` };
  }
  return (await r.json()) as T;
}

async function main() {
  if (!PROP) throw new Error('GA_PROPERTY_ID not set');
  const token = await accessToken();
  const base = `https://analyticsadmin.googleapis.com/v1beta/properties/${PROP}`;

  // ── key events ────────────────────────────────────────────────────
  const ke = await get<{ keyEvents?: Array<{ eventName: string; countingMethod?: string }> }>(
    `${base}/keyEvents?pageSize=200`,
    token,
  );
  console.log('\nKEY EVENTS');
  console.log('-'.repeat(52));
  if ('__error' in ke) {
    console.log('  could not read:', ke.__error);
  } else {
    const names = new Set((ke.keyEvents || []).map((k) => k.eventName));
    for (const w of WANTED) {
      console.log(`  ${names.has(w) ? 'OK     ' : 'MISSING'}  ${w}`);
    }
    const extra = [...names].filter((n) => !WANTED.includes(n));
    if (extra.length) console.log(`\n  also marked (ignore, GA4 defaults): ${extra.join(', ')}`);
  }

  // ── Google Ads link ───────────────────────────────────────────────
  const links = await get<{
    googleAdsLinks?: Array<{ customerId?: string; adsPersonalizationEnabled?: boolean }>;
  }>(`https://analyticsadmin.googleapis.com/v1alpha/properties/${PROP}/googleAdsLinks`, token);
  console.log('\nGOOGLE ADS LINK');
  console.log('-'.repeat(52));
  if ('__error' in links) {
    console.log('  could not read:', links.__error);
  } else if (!links.googleAdsLinks?.length) {
    console.log('  NOT LINKED - no Google Ads account is linked to this property');
  } else {
    for (const l of links.googleAdsLinks) {
      console.log(`  LINKED   customer ${l.customerId}`);
    }
  }
  console.log('');
}

main().catch((e) => {
  console.error(String(e instanceof Error ? e.message : e));
  process.exit(1);
});
