import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { normalizeIsraeliPhone, PHONE_ERROR } from '@/lib/phone';
import { notifyNewLead } from '@/lib/leadNotify';

export const runtime = 'nodejs';

// Server-side contact submission:
// - keeps the write off the client (anon key no longer needs insert access)
// - honeypot + minimal validation for spam
// - emails Nira on every new lead via Resend (if RESEND_API_KEY is set)
// Attribution fields captured client-side (lib/attribution.ts) and stored on
// the lead row so campaign performance can be judged by lead quality later.
// All optional; unknown/oversized values are dropped, never rejected - the
// lead itself always matters more than its attribution.
const ATTRIBUTION_FIELDS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'landing_page',
  'referrer',
  'source_page',
] as const;

function sanitizeAttribution(
  raw: unknown,
): Partial<Record<(typeof ATTRIBUTION_FIELDS)[number], string>> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Partial<Record<(typeof ATTRIBUTION_FIELDS)[number], string>> = {};
  for (const field of ATTRIBUTION_FIELDS) {
    const value = (raw as Record<string, unknown>)[field];
    if (typeof value === 'string' && value.length > 0) {
      out[field] = value.slice(0, 500);
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  let body: {
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
    website?: string; // honeypot - real users never fill this
    attribution?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  // Honeypot: silently accept so bots don't learn they were caught.
  if (body.website) {
    return NextResponse.json({ ok: true });
  }

  const name = (body.name || '').trim();
  const phone = (body.phone || '').trim();
  const email = (body.email || '').trim();
  const message = (body.message || '').trim();

  if (!name || !message || !phone) {
    return NextResponse.json(
      { error: 'נא למלא שם, טלפון והודעה' },
      { status: 400 },
    );
  }
  if (name.length > 200 || email.length > 200 || phone.length > 50 || message.length > 5000) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  // The phone number is the lead. Checked here and not only in the form,
  // because this route is public and the browser is not the authority on what
  // reaches the table - a lead arrived on 2026-09-18 with eight digits and no
  // way to call the person back. Stored normalised, so /manage can dial and
  // open WhatsApp without re-parsing what someone typed.
  const normalizedPhone = normalizeIsraeliPhone(phone);
  if (!normalizedPhone) {
    return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
  }

  const attribution = sanitizeAttribution(body.attribution);

  const supabase = supabaseServer();
  const { error } = await supabase.from('contact_messages').insert([
    {
      id: crypto.randomUUID(),
      name,
      email,
      phone: normalizedPhone,
      message,
      is_read: false,
      created_date: new Date().toISOString(),
      ...attribution,
    },
  ]);

  if (error) {
    console.error('contact insert failed:', error.message);
    return NextResponse.json(
      { error: 'שליחה נכשלה, נסו שוב או פנו בטלפון/WhatsApp' },
      { status: 500 },
    );
  }

  // Notify Nira on every configured channel. Failure here must never fail the
  // lead itself - it is already in the database, which is the part that
  // matters - but it IS logged with the reason, so a notification path that
  // has quietly stopped working can be found in the runtime logs.
  const notified = await notifyNewLead({
    name,
    phone: normalizedPhone,
    email,
    message,
    source: attribution.utm_term
      ? `Google Ads · ${attribution.utm_term}`
      : attribution.gclid
        ? 'Google Ads'
        : attribution.utm_source || null,
  });
  for (const [channel, r] of Object.entries(notified)) {
    // 'not_configured' is a choice, not a fault: a channel nobody has set up
    // should not fill the log with the news every time a lead arrives.
    if (!r.ok && r.reason !== 'not_configured') {
      console.error(`lead ${channel} not sent (${r.reason}): ${r.detail}`);
    }
  }

  return NextResponse.json({ ok: true });
}
