import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  let body: { email?: string; source?: string; website?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  // Honeypot
  if (body.website) {
    return NextResponse.json({ ok: true });
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json({ error: 'כתובת אימייל לא תקינה' }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase.from('newsletter_subscribers').insert([
    { email, source: (body.source || 'article').slice(0, 100) },
  ]);

  // Unique violation = already subscribed; treat as success.
  if (error && error.code !== '23505') {
    console.error('newsletter insert failed:', error.message);
    return NextResponse.json(
      { error: 'ההרשמה נכשלה, נסו שוב מאוחר יותר' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
