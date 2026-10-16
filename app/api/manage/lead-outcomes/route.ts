import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { MANAGE_COOKIE, isManageAuthorized } from '@/lib/manageAuth';
import type { LeadOutcomes, OutcomeCounts, OutcomeRow } from '@/components/manage/analytics/types';

export const runtime = 'nodejs';

// What became of the enquiries: the outcome Nira records for each one in
// /manage/update or the inbox, counted for the analytics page. Counts only -
// no name, phone, message or date of a single lead leaves this route, and a
// row is never sent to a third party (CLAUDE.md, growth rules).
//
// Two windows: the selected range, for the line under the overview figures,
// and every enquiry logged so far for the per-page clients under עמודים,
// because at a handful of enquiries a month a week's breakdown is one or two
// rows. By source is not here: almost every lead is from the ads, and the
// Google section already carries ad leads to clients.

const ALLOWED_RANGES = [1, 7, 30, 90];

type Row = {
  status: string | null;
  created_date: string;
  landing_page: string | null;
  source_page: string | null;
};

const empty = (): OutcomeCounts => ({ enquiries: 0, open: 0, spoke: 0, clients: 0, irrelevant: 0 });

function add(c: OutcomeCounts, status: string | null) {
  c.enquiries += 1;
  const s = status || 'new';
  if (s === 'started_therapy' || s === 'ongoing') c.clients += 1;
  else if (s === 'irrelevant') c.irrelevant += 1;
  else if (s === 'spoke') c.spoke += 1;
  else c.open += 1;
}

function group(rows: Row[], key: (r: Row) => string): OutcomeRow[] {
  const m = new Map<string, OutcomeCounts>();
  for (const r of rows) {
    const k = key(r);
    if (!m.has(k)) m.set(k, empty());
    add(m.get(k)!, r.status);
  }
  return [...m.entries()]
    .map(([k, c]) => ({ key: k, ...c }))
    .sort((a, b) => b.clients - a.clients || b.enquiries - a.enquiries);
}

export async function GET(req: NextRequest) {
  if (!(await isManageAuthorized(req.cookies.get(MANAGE_COOKIE)?.value))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const asked = Number(req.nextUrl.searchParams.get('range') || 30);
  const days = ALLOWED_RANGES.includes(asked) ? asked : 30;

  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('contact_messages')
      .select('status, created_date, landing_page, source_page')
      .order('created_date', { ascending: true });
    if (error) throw new Error(error.message);

    const rows = (data || []) as Row[];
    const since = Date.now() - days * 86_400_000;
    const range = empty();
    const all = empty();
    for (const r of rows) {
      add(all, r.status);
      if (Date.parse(r.created_date) >= since) add(range, r.status);
    }

    const body: LeadOutcomes = {
      range_days: days,
      range,
      all,
      first: rows[0]?.created_date?.slice(0, 10) ?? null,
      by_page: group(rows, (r) => (r.landing_page || r.source_page || '').split('?')[0]),
    };
    return NextResponse.json(body);
  } catch (e) {
    console.error('manage lead outcomes failed:', e);
    return NextResponse.json({ error: 'load failed' }, { status: 500 });
  }
}
