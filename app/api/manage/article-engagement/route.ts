import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { MANAGE_COOKIE, isManageAuthorized } from '@/lib/manageAuth';

export const runtime = 'nodejs';

// Reader behaviour inside the articles, aggregated in Postgres by
// manage_article_engagement - see db/2026-09-22-article-engagement.sql.
//
// A call of its own rather than more keys on /api/manage/analytics. That
// function is already 17KB of SQL that every card on the page depends on, and
// the two answer different questions over different units: one counts visits,
// this one counts readings. The page fetches both at once, so the extra round
// trip costs nothing it would not have waited for anyway, and a failure here
// leaves the rest of the dashboard standing.

const ALLOWED_RANGES = [1, 7, 30, 90];

export async function GET(req: NextRequest) {
  if (!(await isManageAuthorized(req.cookies.get(MANAGE_COOKIE)?.value))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const asked = Number(req.nextUrl.searchParams.get('range') || 30);
  const days = ALLOWED_RANGES.includes(asked) ? asked : 30;

  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase.rpc('manage_article_engagement', { p_days: days });
    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (e) {
    console.error('manage article engagement failed:', e);
    return NextResponse.json({ error: 'load failed' }, { status: 500 });
  }
}
