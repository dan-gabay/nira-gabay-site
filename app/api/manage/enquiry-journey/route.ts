import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { MANAGE_COOKIE, isManageAuthorized } from '@/lib/manageAuth';

export const runtime = 'nodejs';

// The whole story of one enquiry: every event of its visit, and the earlier
// visits that are probably the same visitor - see
// db/2026-09-28-enquiry-journey.sql. Loaded only when a row is opened.

// session_id is Math.random().toString(36) + Date.now().toString(36).
const SESSION_RE = /^[a-z0-9]{6,40}$/;

export async function GET(req: NextRequest) {
  if (!(await isManageAuthorized(req.cookies.get(MANAGE_COOKIE)?.value))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const session = req.nextUrl.searchParams.get('session') || '';
  if (!SESSION_RE.test(session)) {
    return NextResponse.json({ error: 'bad session' }, { status: 400 });
  }

  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase.rpc('manage_enquiry_journey', { p_session: session });
    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (e) {
    console.error('manage enquiry journey failed:', e);
    return NextResponse.json({ error: 'load failed' }, { status: 500 });
  }
}
