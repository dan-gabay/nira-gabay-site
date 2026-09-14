import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import {
  isTrackedEvent,
  isConversion,
  isClickKind,
  type SiteEventPayload,
} from '@/lib/siteEvents';
import { botKindFromUserAgent } from '@/lib/botDetect';

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
//   reduce it to "mobile" or "desktop" and to one coarse bot_kind word, and is
//   then discarded
// - bots are LABELLED, never turned away: this route is the last step of a
//   request whose content has already been served, so flagging a crawler here
//   costs it nothing and keeps it in the AI indexes. It only decides whether
//   the hit counts as a visit on the dashboard.
//
// Failures are swallowed and answered 204. Analytics must never be the reason
// a visitor sees an error, and the WhatsApp button must never wait on it.

const MAX = 300;
const clip = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, MAX) : null;

const clampInt = (v: unknown, lo: number, hi: number): number | null => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  return n < lo || n > hi ? null : n;
};

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

    const ua = req.headers.get('user-agent');
    const supabase = supabaseServer();
    const { error } = await supabase.from('site_events').insert({
      event_name: name,
      path: clip(body.path),
      page_type: clip(body.page_type),
      entity: clip(body.entity),
      source: clip(body.source),
      session_id: clip(body.session_id),
      device: deviceFrom(ua),
      // null for a person. The client's navigator.webdriver is trusted only to
      // ADD a flag: it can reveal a driven browser behind an ordinary UA, and
      // a forged `false` merely leaves a bot looking like everyone else.
      bot_kind: botKindFromUserAgent(ua) ?? (body.automated === true ? 'automation' : null),
      // Clamped, not trusted: these come from the visitor's own storage, so a
      // crafted body can only describe itself, and cannot describe anyone else.
      visit_number: clampInt(body.visit_number, 1, 10000),
      days_since_first: clampInt(body.days_since_first, 0, 400),
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
