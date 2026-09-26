import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { MANAGE_COOKIE, isManageAuthorized } from '@/lib/manageAuth';

export const runtime = 'nodejs';

// Organic search visits - where they landed and what they did next -
// aggregated in Postgres by manage_organic_search, see
// db/2026-09-26-organic-search.sql. Its own call for the same reasons as
// /api/manage/article-engagement: a failure here leaves the rest of the
// dashboard standing.

const ALLOWED_RANGES = [1, 7, 30, 90];

export async function GET(req: NextRequest) {
  if (!(await isManageAuthorized(req.cookies.get(MANAGE_COOKIE)?.value))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const asked = Number(req.nextUrl.searchParams.get('range') || 30);
  const days = ALLOWED_RANGES.includes(asked) ? asked : 30;

  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase.rpc('manage_organic_search', { p_days: days });
    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (e) {
    console.error('manage organic search failed:', e);
    return NextResponse.json({ error: 'load failed' }, { status: 500 });
  }
}
