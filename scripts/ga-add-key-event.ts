#!/usr/bin/env tsx
/**
 * Marks an event as a GA4 key event by name.
 *
 * This exists because the GA4 interface cannot do it. Its key-event picker
 * only lists events that have already fired at least once, so a conversion
 * that has never happened yet - contact_email, the footer mail link - is
 * unreachable through the UI entirely. The Admin API has no such restriction.
 *
 * Needs the analytics.edit scope: re-run
 *   npx tsx scripts/google-auth-paste.ts url --edit
 * if the token is readonly.
 *
 *   npx tsx scripts/ga-add-key-event.ts contact_email
 */
import { accessToken } from './google-check';

const PROP = process.env.GA_PROPERTY_ID;

async function main() {
  const name = process.argv[2];
  if (!name) throw new Error('Usage: ga-add-key-event.ts <event_name>');
  if (!PROP) throw new Error('GA_PROPERTY_ID not set');

  const token = await accessToken();
  const res = await fetch(
    `https://analyticsadmin.googleapis.com/v1beta/properties/${PROP}/keyEvents`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName: name, countingMethod: 'ONCE_PER_EVENT' }),
    },
  );

  const body = (await res.json()) as { name?: string; error?: { message?: string; status?: string } };
  if (!res.ok) {
    if (body.error?.status === 'ALREADY_EXISTS' || /already/i.test(body.error?.message || '')) {
      console.log(`${name}: already a key event, nothing to do`);
      return;
    }
    throw new Error(`${res.status}: ${body.error?.message || ''}`);
  }
  console.log(`${name}: created as a key event`);
}

main().catch((e) => {
  console.error(String(e instanceof Error ? e.message : e));
  process.exit(1);
});
