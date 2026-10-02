import { NextRequest, NextResponse } from 'next/server';
import { MANAGE_COOKIE, isManageAuthorized } from '@/lib/manageAuth';
import { supabaseServer } from '@/lib/supabaseServer';
import { googleConfigured } from '@/lib/google/auth';
import { runReport, type Ga4Row } from '@/lib/google/ga4';
import { searchAnalytics } from '@/lib/google/gsc';
import { daysAgo, googleDays, windows } from '@/lib/google/dates';
import type { GoogleAds, GoogleSearchQuery, LeadOutcomes } from '@/lib/google/types';

export const runtime = 'nodejs';

// The "גוגל" section: what the ads cost against what they brought. Cost per
// campaign, keyword and search term from GA4 (the Ads account is linked to
// it), outcomes from our own enquiries (manage_paid_keyword_outcomes, see
// db/2026-10-02-paid-keyword-outcomes.sql), and Search Console to set each
// paid keyword beside the site's organic position for the same words.
//
// Both sides cover the same days. Enquiries carry utm_term only from 18.9.2026,
// so a range reaching further back starts there instead: cost from before
// that date divided by enquiries counted only after it would flatter nothing
// and mean nothing.

const ALLOWED_RANGES = [1, 7, 30, 90];
const TRACKED_FROM = '2026-09-18';
const ORGANIC_NOT_PAID = 15;
const ORGANIC_MIN_IMPRESSIONS = 5;
// Queries about Nira herself: free to win organically, nothing to buy.
const BRAND = /נירה|גבאי|gabay/i;

const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10) / 10;
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const named = (v: string) => v !== '' && v !== '(not set)' && v !== '(not provided)';

const ZERO: LeadOutcomes = { leads: 0, spoke: 0, clients: 0, irrelevant: 0, open: 0 };
const add = (a: LeadOutcomes, b: LeadOutcomes): LeadOutcomes => ({
  leads: a.leads + b.leads,
  spoke: a.spoke + b.spoke,
  clients: a.clients + b.clients,
  irrelevant: a.irrelevant + b.irrelevant,
  open: a.open + b.open,
});

type Outcomes = {
  totals: LeadOutcomes;
  terms: Array<LeadOutcomes & { term: string | null }>;
};

function israelToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
}

export async function GET(req: NextRequest) {
  if (!(await isManageAuthorized(req.cookies.get(MANAGE_COOKIE)?.value))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!googleConfigured('ga')) return NextResponse.json({ configured: false });

  const asked = Number(req.nextUrl.searchParams.get('range') || 30);
  const range = ALLOWED_RANGES.includes(asked) ? asked : 30;
  const wanted = daysAgo(range);
  const since = wanted < TRACKED_FROM ? TRACKED_FROM : wanted;
  const until = israelToday();
  const ga = { startDate: since, endDate: until };
  // Search terms are judged by GA4's own key events, not by our enquiries,
  // so they keep the whole range asked for.
  const termsWindow = { startDate: wanted, endDate: until };

  try {
    const [campaigns, termsCampaigns, keywords, terms, termEvents, outcomes] = await Promise.all([
      runReport({
        ...ga,
        dimensions: ['sessionGoogleAdsCampaignName'],
        metrics: ['advertiserAdCost', 'advertiserAdClicks'],
      }),
      runReport({
        ...termsWindow,
        dimensions: ['sessionGoogleAdsCampaignName'],
        metrics: ['advertiserAdCost', 'advertiserAdClicks'],
      }),
      runReport({
        ...ga,
        dimensions: ['sessionGoogleAdsKeyword'],
        metrics: ['advertiserAdCost', 'advertiserAdClicks'],
      }),
      runReport({
        ...termsWindow,
        dimensions: ['sessionGoogleAdsQuery'],
        metrics: ['advertiserAdCost', 'advertiserAdClicks'],
      }),
      runReport({ ...termsWindow, dimensions: ['sessionGoogleAdsQuery'], metrics: ['sessions', 'keyEvents'] }),
      supabaseServer()
        .rpc('manage_paid_keyword_outcomes', { p_since: since })
        .then(({ data, error }) => {
          if (error) throw new Error(error.message);
          return data as Outcomes;
        }),
    ]);

    // Organic is the optional half: Search Console lags and may fail on its
    // own, and the cost figures stand without it. Its window is the GSC one
    // (ending two days back), the closest it can come to the same days.
    let organic: GoogleSearchQuery[] | null = null;
    try {
      const rows = await searchAnalytics({ ...windows(googleDays(range)).current, dimensions: ['query'] });
      organic = rows.map((r) => ({
        query: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        position: round1(r.position),
      }));
    } catch (e) {
      console.error('manage google ads: organic half failed:', e);
    }
    const organicBy = new Map((organic || []).map((q) => [norm(q.query), q]));

    const withCost = (rows: Ga4Row[]) => rows.filter((r) => named(r.dims[0]) && (r.values[0] > 0 || r.values[1] > 0));

    const leadsBy = new Map<string, LeadOutcomes>();
    for (const t of outcomes.terms) {
      if (!t.term) continue;
      const k = norm(t.term);
      leadsBy.set(k, add(leadsBy.get(k) || ZERO, t));
    }

    const keywordRows = withCost(keywords)
      .map((r) => {
        const k = norm(r.dims[0]);
        const o = organicBy.get(k);
        return {
          keyword: r.dims[0],
          cost: round2(r.values[0]),
          clicks: r.values[1],
          ...(leadsBy.get(k) || ZERO),
          organicPosition: o ? o.position : null,
          organicImpressions: o ? o.impressions : 0,
        };
      })
      .sort((a, b) => b.cost - a.cost);

    const keywordSet = new Set(keywordRows.map((k) => norm(k.keyword)));
    const unmatchedTerms = outcomes.terms.filter((t) => !t.term || !keywordSet.has(norm(t.term)));

    const events = new Map(termEvents.map((r) => [r.dims[0], { sessions: r.values[0], keyEvents: r.values[1] }]));
    const termRows = withCost(terms)
      .map((r) => ({
        term: r.dims[0],
        cost: round2(r.values[0]),
        clicks: r.values[1],
        sessions: events.get(r.dims[0])?.sessions ?? 0,
        keyEvents: events.get(r.dims[0])?.keyEvents ?? 0,
      }))
      .sort((a, b) => b.cost - a.cost);

    const campaignRows = withCost(campaigns)
      .map((r) => ({ name: r.dims[0], cost: round2(r.values[0]), clicks: r.values[1] }))
      .sort((a, b) => b.cost - a.cost);

    const body: GoogleAds = {
      configured: true,
      since,
      until,
      clipped: wanted < TRACKED_FROM,
      trackedFrom: TRACKED_FROM,
      termsSince: wanted,
      cost: round2(campaignRows.reduce((a, c) => a + c.cost, 0)),
      clicks: campaignRows.reduce((a, c) => a + c.clicks, 0),
      campaigns: campaignRows,
      leads: outcomes.totals,
      keywords: keywordRows,
      unmatched: {
        ...unmatchedTerms.reduce((a, t) => add(a, t), ZERO),
        terms: unmatchedTerms.map((t) => t.term || 'ללא מילת מפתח'),
      },
      organicNotPaid: (organic || [])
        .filter(
          (q) => q.impressions >= ORGANIC_MIN_IMPRESSIONS && !BRAND.test(q.query) && !keywordSet.has(norm(q.query)),
        )
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, ORGANIC_NOT_PAID),
      searchTerms: termRows,
      visibleTermsCost: round2(termRows.reduce((a, t) => a + t.cost, 0)),
      termsCost: round2(withCost(termsCampaigns).reduce((a, c) => a + c.values[0], 0)),
      organicLoaded: organic !== null,
    };
    return NextResponse.json(body);
  } catch (e) {
    console.error('manage google ads failed:', e);
    return NextResponse.json({ error: 'load failed' }, { status: 502 });
  }
}
