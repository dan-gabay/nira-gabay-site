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

export async function PATCH(req: NextRequest) {
  if (await unauthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { id?: string; is_read?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  if (!body.id || typeof body.is_read !== 'boolean') {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase
    .from('contact_messages')
    .update({ is_read: body.is_read })
    .eq('id', body.id);

  if (error) {
    console.error('manage contacts update failed:', error.message);
    return NextResponse.json({ error: 'update failed' }, { status: 500 });
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
