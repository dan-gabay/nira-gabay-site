import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const runtime = 'nodejs';

// Ingest for lead attribution on WhatsApp/phone/email taps. See
// lib/contactIntent.ts for why the row is needed and
// db/2026-09-19-contact-intents.sql for what it is used for.
//
// Public by necessity - the browser calls it the instant a CTA is tapped - so
// it trusts nothing it is handed, on the same terms as app/api/track/route.ts:
//
// - channel must be on the allowlist below, so the split between WhatsApp and
//   phone demand cannot be written to by anyone who can POST here
// - only the attribution field names below are read, and every value is
//   clipped, so a large or unexpected body cannot fill or reshape the table
// - claimed_by is never accepted from the client: whether a tap became a real
//   enquiry is Nira's judgement, made in /manage, and a crafted request must
//   not be able to assert it
// - no IP and no user agent string are stored; the user agent is read only to
//   reduce it to "mobile" or "desktop", then discarded
//
// Failures are swallowed and answered 204. The tap is already navigating to
// WhatsApp; nothing here may delay it and nothing here may fail it.

const CHANNELS = ['whatsapp', 'phone', 'email'] as const;

// Same names as the columns, and as contact_messages, so claiming a tap onto a
// lead is a field-for-field copy.
const ATTRIBUTION_FIELDS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'landing_page',
  'referrer',
] as const;

const MAX = 300;
const clip = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, MAX) : null;

function deviceFrom(ua: string | null): string {
  if (!ua) return 'unknown';
  return /mobile|android|iphone|ipad|ipod/i.test(ua) ? 'mobile' : 'desktop';
}

export async function POST(req: NextRequest) {
  try {
    // sendBeacon sets the Blob's type, but a fallback fetch or a future caller
    // may not, so the body is parsed rather than content-type negotiated.
    let body: { channel?: unknown; source_page?: unknown; attribution?: unknown };
    try {
      body = JSON.parse(await req.text());
    } catch {
      return new NextResponse(null, { status: 204 });
    }

    const channel = clip(body.channel);
    if (!channel || !(CHANNELS as readonly string[]).includes(channel)) {
      return new NextResponse(null, { status: 204 });
    }

    const attribution: Record<string, string | null> = {};
    const raw = (body.attribution ?? {}) as Record<string, unknown>;
    if (raw && typeof raw === 'object') {
      for (const field of ATTRIBUTION_FIELDS) attribution[field] = clip(raw[field]);
    }

    const supabase = supabaseServer();
    const { error } = await supabase.from('contact_intents').insert({
      channel,
      source_page: clip(body.source_page),
      device: deviceFrom(req.headers.get('user-agent')),
      ...attribution,
    });

    if (error) console.error('contact intent insert failed:', error.message);
  } catch (e) {
    console.error('contact intent failed:', e);
  }

  return new NextResponse(null, { status: 204 });
}
