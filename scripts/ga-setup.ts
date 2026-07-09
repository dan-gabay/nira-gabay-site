#!/usr/bin/env tsx
/**
 * One-time (idempotent) GA4 property configuration for niragabay.com,
 * implementing docs/ga4-measurement-plan.md via the Admin API:
 *
 *   - key events (conversions): generate_lead, contact_whatsapp,
 *     contact_phone, sign_up
 *   - custom dimensions so event params show up in reports
 *   - data retention 14 months (GA4 default is 2)
 *
 * Requires a token with the edit scope: npx tsx scripts/ga-auth.ts --edit
 * Safe to re-run - existing key events / dimensions are skipped.
 *
 *   npx tsx scripts/ga-setup.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const CLIENT_ID = process.env.GSC_CLIENT_ID;
const CLIENT_SECRET = process.env.GSC_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GA_REFRESH_TOKEN;
const PROPERTY_ID = process.env.GA_PROPERTY_ID;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !PROPERTY_ID) {
  throw new Error('Missing GSC_CLIENT_ID / GSC_CLIENT_SECRET / GA_REFRESH_TOKEN / GA_PROPERTY_ID in .env.local');
}

const KEY_EVENTS = ['generate_lead', 'contact_whatsapp', 'contact_phone', 'sign_up'];

const CUSTOM_DIMENSIONS: Array<{ parameterName: string; displayName: string; scope: 'EVENT' | 'USER' }> = [
  { parameterName: 'lead_source', displayName: 'Lead source', scope: 'EVENT' },
  { parameterName: 'page_type', displayName: 'Page type', scope: 'EVENT' },
  { parameterName: 'page_id', displayName: 'Page ID', scope: 'EVENT' },
  { parameterName: 'article_id', displayName: 'Article ID', scope: 'EVENT' },
  { parameterName: 'funnel_stage', displayName: 'Funnel stage', scope: 'EVENT' },
  { parameterName: 'percent_scrolled', displayName: 'Percent scrolled', scope: 'EVENT' },
  { parameterName: 'event_label', displayName: 'Event label', scope: 'EVENT' },
  { parameterName: 'visitor_type', displayName: 'Visitor type', scope: 'USER' },
  { parameterName: 'engagement_level', displayName: 'Engagement level', scope: 'USER' },
];

const BASE = `https://analyticsadmin.googleapis.com/v1beta/properties/${PROPERTY_ID}`;

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
  if (!data.access_token) throw new Error(`Token refresh failed: ${data.error} ${data.error_description || ''} - did you run ga-auth.ts --edit?`);
  return data.access_token;
}

async function api(token: string, method: string, url: string, body?: unknown): Promise<any> {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

async function main() {
  const token = await getAccessToken();

  // --- Key events ---
  const existingKe = await api(token, 'GET', `${BASE}/keyEvents`);
  const haveKe = new Set<string>((existingKe.keyEvents || []).map((k: { eventName: string }) => k.eventName));
  for (const eventName of KEY_EVENTS) {
    if (haveKe.has(eventName)) {
      console.log(`key event exists:   ${eventName}`);
      continue;
    }
    await api(token, 'POST', `${BASE}/keyEvents`, { eventName, countingMethod: 'ONCE_PER_EVENT' });
    console.log(`key event created:  ${eventName}`);
  }

  // --- Custom dimensions ---
  const existingCd = await api(token, 'GET', `${BASE}/customDimensions?pageSize=200`);
  const haveCd = new Set<string>((existingCd.customDimensions || []).map((d: { parameterName: string }) => d.parameterName));
  for (const dim of CUSTOM_DIMENSIONS) {
    if (haveCd.has(dim.parameterName)) {
      console.log(`dimension exists:   ${dim.parameterName}`);
      continue;
    }
    await api(token, 'POST', `${BASE}/customDimensions`, dim);
    console.log(`dimension created:  ${dim.parameterName} (${dim.scope})`);
  }

  // --- Data retention: 14 months ---
  const retention = await api(token, 'GET', `${BASE}/dataRetentionSettings`);
  if (retention.eventDataRetention === 'FOURTEEN_MONTHS') {
    console.log('data retention:     already 14 months');
  } else {
    await api(
      token,
      'PATCH',
      `${BASE}/dataRetentionSettings?updateMask=eventDataRetention,resetUserDataOnNewActivity`,
      { eventDataRetention: 'FOURTEEN_MONTHS', resetUserDataOnNewActivity: true }
    );
    console.log(`data retention:     ${retention.eventDataRetention || 'default'} -> FOURTEEN_MONTHS`);
  }

  console.log('\nDone. Manual UI steps that cannot be scripted:');
  console.log('  - Admin > Product links > Search Console: link the GSC property');
  console.log('  - Keep Google Signals OFF (sensitive-audience site - see docs/ga4-measurement-plan.md)');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
