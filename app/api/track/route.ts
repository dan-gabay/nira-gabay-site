import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import {
  isTrackedEvent,
  isConversion,
  isClickKind,
  type SiteEventPayload,
} from '@/lib/siteEvents';

export const runtime = 'nodejs';

// Ingest for first-party analytics. Public by necessity - the browser calls it
// on every page view - so it trusts nothing it is handed:
//
// - the event name must be on the allowlist in lib/siteEvents.ts
// - is_conversion is decided here, never sent by the client, so a crafted
//   request cannot inflate the one number the ad budget is judged against
// - click_kind is allowlisted too: it decides the paid/organic split, and
//   the ad-click identifier itself is never accepted or stored
// - every string is clipped, so a large body cannot fill the table
// - no IP and no user agent string are stored; the user agent is read only to
//   reduce it to "mobile" or "desktop" and is then discarded
//
// Failures are swallowed and answered 204. Analytics must never be the reason
// a visitor sees an error, and the WhatsApp button must never wait on it.

const MAX = 300;
const clip = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, MAX) : null;

function deviceFrom(ua: string | null): string {
  if (!ua) return 'unknown';
  return /mobile|android|iphone|ipad|ipod/i.test(ua) ? 'mobile' : 'desktop';
}

export async function POST(req: NextRequest) {
  try {
    let body: SiteEventPayload;
    try {
      body = (await req.json()) as SiteEventPayload;
    } catch {
      return new NextResponse(null, { status: 204 });
    }

    const name = clip(body.event_name);
    if (!name || !isTrackedEvent(name)) {
      return new NextResponse(null, { status: 204 });
    }

    const rawKind = clip(body.click_kind);
    const clickKind = rawKind && isClickKind(rawKind) ? rawKind : null;

    const supabase = supabaseServer();
    const { error } = await supabase.from('site_events').insert({
      event_name: name,
      path: clip(body.path),
      page_type: clip(body.page_type),
      entity: clip(body.entity),
      source: clip(body.source),
      session_id: clip(body.session_id),
      device: deviceFrom(req.headers.get('user-agent')),
      referrer_host: clip(body.referrer_host),
      utm_source: clip(body.utm_source),
      utm_medium: clip(body.utm_medium),
      utm_campaign: clip(body.utm_campaign),
      utm_term: clip(body.utm_term),
      utm_content: clip(body.utm_content),
      // Allowlisted like the event name, so the paid/organic split cannot be
      // written to by anyone who can POST here.
      click_kind: clickKind,
      is_conversion: isConversion(name),
    });

    if (error) console.error('track insert failed:', error.message);
  } catch (e) {
    console.error('track failed:', e);
  }

  return new NextResponse(null, { status: 204 });
}
