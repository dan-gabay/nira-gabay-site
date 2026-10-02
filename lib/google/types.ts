// Response shapes of the /api/manage/google/* routes, shared with the admin
// components that render them.

export type GoogleSearchQuery = { query: string; clicks: number; impressions: number; position: number };

export type GoogleSearch =
  | { configured: false }
  | {
      configured: true;
      days: number;
      /** True when the asked range was shorter than Search Console can fill. */
      widened: boolean;
      totals: { clicks: number; impressions: number };
      previous: { clicks: number; impressions: number };
      daily: Array<{ day: string; clicks: number; impressions: number }>;
      pages: Array<{
        path: string;
        clicks: number;
        impressions: number;
        position: number;
        queries: GoogleSearchQuery[];
      }>;
      far: Array<GoogleSearchQuery & { path: string | null; competing: Array<{ path: string; position: number }> }>;
    };

export type GoogleIndexStatus = {
  verdict: string | null;
  coverageState: string | null;
  lastCrawlTime: string | null;
  googleCanonical: string | null;
  userCanonical: string | null;
  robotsTxtState: string | null;
  indexingState: string | null;
  pageFetchState: string | null;
};

export type GoogleArticle =
  | { configured: false }
  | {
      configured: true;
      days: number;
      /** Null when the search report failed; zeros when Google never showed the page. */
      totals: { clicks: number; impressions: number; position: number | null } | null;
      queries: GoogleSearchQuery[];
      /** Null when URL Inspection failed. */
      index: GoogleIndexStatus | null;
    };

export type LeadOutcomes = { leads: number; spoke: number; clients: number; irrelevant: number; open: number };

export type GoogleAds =
  | { configured: false }
  | {
      configured: true;
      since: string;
      until: string;
      /** True when the range reached back before enquiries were tracked, so the window starts at that date. */
      clipped: boolean;
      trackedFrom: string;
      cost: number;
      clicks: number;
      campaigns: Array<{ name: string; cost: number; clicks: number }>;
      leads: LeadOutcomes;
      keywords: Array<
        LeadOutcomes & {
          keyword: string;
          cost: number;
          clicks: number;
          /** Organic average position for the same text, null when Google never showed the site for it. */
          organicPosition: number | null;
          organicImpressions: number;
        }
      >;
      /** Paid enquiries whose utm_term matches no keyword with cost in GA4 (or has none). */
      unmatched: LeadOutcomes & { terms: string[] };
      organicNotPaid: GoogleSearchQuery[];
      /** Search terms cover the whole range asked for, from this date: they are judged by GA4 key events, not enquiries. */
      termsSince: string;
      searchTerms: Array<{ term: string; cost: number; clicks: number; sessions: number; keyEvents: number }>;
      /** Cost of the search terms GA4 names; the rest is terms Google hides. */
      visibleTermsCost: number;
      /** All ad cost in the search-terms window, named or hidden. */
      termsCost: number;
      /** False when the organic (Search Console) half failed; the paid half still loads. */
      organicLoaded: boolean;
    };
