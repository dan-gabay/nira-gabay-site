import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { MANAGE_COOKIE, isManageAuthorized } from '@/lib/manageAuth';
import { addDays, buildWeeks, channelOfEnquiry, israelDay, type Trends } from '@/lib/trends';

export const runtime = 'nodejs';

// Week by week, whatever range the page is set to: visits, page views, taps
// on contact, and the enquiries Nira logged with what became of them. The
// range control answers "what happened lately"; this answers "is it getting
// better", which no single range can.
//
// By channel too (ads, organic search, everything else): visits and visits
// with a tap from the traffic groups, enquiries from their gclid / UTM /
// referrer. Only the channel name leaves the route.
//
// The site figures are the 90-day daily series of manage_analytics, folded
// into weeks here rather than in a new SQL function (no migration). The
// enquiries are counts only - a status and the day it arrived, never a name,
// phone, message or anything else of a single lead (CLAUDE.md, growth rules).

const WINDOW_DAYS = 90;

export async function GET(req: NextRequest) {
  if (!(await isManageAuthorized(req.cookies.get(MANAGE_COOKIE)?.value))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const supabase = supabaseServer();
    const today = israelDay(new Date());
    const windowStart = addDays(today, -(WINDOW_DAYS - 1));

    const [analytics, messages] = await Promise.all([
      supabase.rpc('manage_analytics', { p_days: WINDOW_DAYS }),
      supabase
        .from('contact_messages')
        .select('status, created_date, gclid, utm_source, utm_medium, referrer')
        .gte('created_date', new Date(Date.now() - (WINDOW_DAYS + 1) * 86_400_000).toISOString()),
    ]);
    if (analytics.error) throw new Error(analytics.error.message);
    if (messages.error) throw new Error(messages.error.message);

    const payload = analytics.data as {
      daily?: Array<{ day: string; visits: number; views: number; conversions: number }>;
      traffic_daily?: Array<{ day: string; grp: string; visits: number; conversions: number }>;
      first_event?: string | null;
    };
    const firstEvent = payload.first_event ?? null;
    // The attribution columns are read only to name the channel, and do not
    // leave this route.
    type Message = {
      status: string | null;
      created_date: string;
      gclid: string | null;
      utm_source: string | null;
      utm_medium: string | null;
      referrer: string | null;
    };
    const enquiries = ((messages.data || []) as Message[]).map((m) => ({
      day: israelDay(new Date(m.created_date)),
      status: m.status,
      channel: channelOfEnquiry(m),
    }));

    const body: Trends = {
      weeks: buildWeeks({
        daily: payload.daily || [],
        traffic: payload.traffic_daily || [],
        enquiries,
        today,
        windowStart,
        firstEvent,
      }),
      first_event: firstEvent,
    };
    return NextResponse.json(body);
  } catch (e) {
    console.error('manage trends failed:', e);
    return NextResponse.json({ error: 'load failed' }, { status: 500 });
  }
}
