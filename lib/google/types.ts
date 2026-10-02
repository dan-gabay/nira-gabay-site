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
