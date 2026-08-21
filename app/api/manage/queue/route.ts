import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { MANAGE_COOKIE, isManageAuthorized } from '@/lib/manageAuth';

export const runtime = 'nodejs';

const ALLOWED_STATUS = ['pending', 'duplicate', 'skipped', 'failed'] as const;

async function unauthorized(req: NextRequest): Promise<boolean> {
  return !(await isManageAuthorized(req.cookies.get(MANAGE_COOKIE)?.value));
}

// The import queue drives the content pipeline. Served through the manage API
// so the admin can triage it from a phone without the anon client ever seeing
// the old source URLs.
export async function GET(req: NextRequest) {
  if (await unauthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('article_import_queue')
    .select('id, source_title, source_site, status, attempts, imported_article_id, processed_at, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('manage queue list failed:', error.message);
    return NextResponse.json({ error: 'load failed' }, { status: 500 });
  }
  return NextResponse.json({ items: data || [] });
}

// Triage only: an item can be parked or reopened. Converting a queue item into
// an article stays with the import pipeline, which does the editorial rewrite.
export async function PATCH(req: NextRequest) {
  if (await unauthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { id?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const { id, status } = body;
  if (!id || !status || !ALLOWED_STATUS.includes(status as (typeof ALLOWED_STATUS)[number])) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase
    .from('article_import_queue')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('manage queue update failed:', error.message);
    return NextResponse.json({ error: 'update failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
