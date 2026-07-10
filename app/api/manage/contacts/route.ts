import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { MANAGE_COOKIE, isManageAuthorized } from '@/lib/manageAuth';

export const runtime = 'nodejs';

// contact_messages is RLS-locked (lead PII); all admin access goes through
// here with the service-role key. The proxy already gates /api/manage/*,
// the extra check below is defense in depth.
async function unauthorized(req: NextRequest): Promise<boolean> {
  return !(await isManageAuthorized(req.cookies.get(MANAGE_COOKIE)?.value));
}

export async function GET(req: NextRequest) {
  if (await unauthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_date', { ascending: false });

  if (error) {
    console.error('manage contacts list failed:', error.message);
    return NextResponse.json({ error: 'load failed' }, { status: 500 });
  }
  return NextResponse.json({ messages: data || [] });
}

const LEAD_STATUSES = ['new', 'spoke', 'started_therapy', 'ongoing', 'irrelevant'] as const;
const LEAD_CHANNELS = ['form', 'whatsapp', 'phone', 'email', 'other'] as const;

export async function PATCH(req: NextRequest) {
  if (await unauthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    id?: string;
    is_read?: boolean;
    status?: string;
    heard_from?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.is_read === 'boolean') update.is_read = body.is_read;
  if (typeof body.status === 'string') {
    if (!(LEAD_STATUSES as readonly string[]).includes(body.status)) {
      return NextResponse.json({ error: 'bad status' }, { status: 400 });
    }
    update.status = body.status;
    update.status_updated_at = new Date().toISOString();
  }
  if (typeof body.heard_from === 'string') {
    update.heard_from = body.heard_from.slice(0, 200);
  }
  if (!body.id || Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase
    .from('contact_messages')
    .update(update)
    .eq('id', body.id);

  if (error) {
    console.error('manage contacts update failed:', error.message);
    return NextResponse.json({ error: 'update failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Manual lead entry - most inquiries arrive by WhatsApp/phone and never
// touch the form; without this they'd be invisible to quality tracking.
export async function POST(req: NextRequest) {
  if (await unauthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    name?: string;
    phone?: string;
    email?: string;
    message?: string;
    heard_from?: string;
    channel?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const name = (body.name || '').trim();
  const phone = (body.phone || '').trim();
  if (!name || !phone) {
    return NextResponse.json({ error: 'נא למלא שם וטלפון' }, { status: 400 });
  }
  const channel =
    body.channel && (LEAD_CHANNELS as readonly string[]).includes(body.channel)
      ? body.channel
      : 'other';

  const supabase = supabaseServer();
  const { error } = await supabase.from('contact_messages').insert([
    {
      id: crypto.randomUUID(),
      name: name.slice(0, 200),
      phone: phone.slice(0, 50),
      email: (body.email || '').trim().slice(0, 200),
      message: (body.message || '').trim().slice(0, 5000),
      heard_from: (body.heard_from || '').trim().slice(0, 200) || null,
      channel,
      is_read: true, // Nira logs it herself - it's already "read"
      created_date: new Date().toISOString(),
    },
  ]);

  if (error) {
    console.error('manage contacts manual insert failed:', error.message);
    return NextResponse.json({ error: 'insert failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (await unauthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase
    .from('contact_messages')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('manage contacts delete failed:', error.message);
    return NextResponse.json({ error: 'delete failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
