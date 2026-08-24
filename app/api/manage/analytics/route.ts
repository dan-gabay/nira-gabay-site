import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { MANAGE_COOKIE, isManageAuthorized } from '@/lib/manageAuth';

export const runtime = 'nodejs';

// Everything the analytics dashboard needs, in one call.
//
// The aggregation itself lives in the Postgres function manage_analytics:
// pulling every row into Node to count it would work fine at a few hundred
// events a month and then quietly stop working. One round trip, already
// grouped.
//
// Every figure comes back beside the same figure for the preceding window of
// equal length. A number with nothing to compare it to cannot tell the admin
// the only thing she wants to know, which is whether it is going up.

// 1 means the last 24 hours; the SQL switches to hourly buckets at that
// range, because a day plotted in daily buckets is a single point.
const ALLOWED_RANGES = [1, 7, 30, 90];

export async function GET(req: NextRequest) {
  if (!(await isManageAuthorized(req.cookies.get(MANAGE_COOKIE)?.value))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const asked = Number(req.nextUrl.searchParams.get('range') || 30);
  const days = ALLOWED_RANGES.includes(asked) ? asked : 30;

  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase.rpc('manage_analytics', { p_days: days });
    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (e) {
    console.error('manage analytics failed:', e);
    return NextResponse.json({ error: 'load failed' }, { status: 500 });
  }
}
