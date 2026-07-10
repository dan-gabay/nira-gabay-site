import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

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

  const supabase = supabaseServer();
  const { error } = await supabase.from('contact_messages').insert([
    {
      id: crypto.randomUUID(),
      name,
      email,
      phone,
      message,
      is_read: false,
      created_date: new Date().toISOString(),
      ...sanitizeAttribution(body.attribution),
    },
  ]);

  if (error) {
    console.error('contact insert failed:', error.message);
    return NextResponse.json(
      { error: 'שליחה נכשלה, נסו שוב או פנו בטלפון/WhatsApp' },
      { status: 500 },
    );
  }

  // Notify Nira by email. Failure here must not fail the lead itself.
  const resendKey = process.env.RESEND_API_KEY;
  const notifyTo = process.env.CONTACT_NOTIFY_EMAIL || 'niraga1123@gmail.com';
  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.CONTACT_NOTIFY_FROM || 'onboarding@resend.dev',
          to: [notifyTo],
          subject: `פנייה חדשה מהאתר: ${name}`,
          html: [
            '<div dir="rtl" style="font-family:Arial,sans-serif">',
            '<h2>פנייה חדשה מטופס יצירת הקשר</h2>',
            `<p><strong>שם:</strong> ${escapeHtml(name)}</p>`,
            `<p><strong>טלפון:</strong> ${escapeHtml(phone)}</p>`,
            email ? `<p><strong>אימייל:</strong> ${escapeHtml(email)}</p>` : '',
            `<p><strong>הודעה:</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>`,
            '<hr/><p>ניתן לצפות בכל הפניות באזור הניהול באתר.</p>',
            '</div>',
          ].join(''),
        }),
      });
    } catch (e) {
      console.error('lead email notification failed:', e);
    }
  }

  return NextResponse.json({ ok: true });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
