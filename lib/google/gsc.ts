import { unstable_cache } from 'next/cache';
import { googleToken } from './auth';

// Search Console, read-only: Search Analytics rows and URL Inspection.
// Cached so opening the admin repeatedly does not spend quota; the data
// itself only changes once a day.

export const GSC_SITE = process.env.GSC_SITE_URL || 'https://www.niragabay.com/';

export type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

type Query = { startDate: string; endDate: string; dimensions: string[]; rowLimit?: number };

async function fetchSearchAnalytics(q: Query): Promise<GscRow[]> {
  const token = await googleToken('gsc');
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...q, rowLimit: q.rowLimit ?? 5000 }),
      cache: 'no-store',
    },
  );
  const j = (await res.json()) as { rows?: GscRow[]; error?: { message?: string } };
  if (!res.ok) throw new Error(`Search Console ${res.status}: ${j.error?.message || ''}`);
  return j.rows || [];
}

export const searchAnalytics = unstable_cache(fetchSearchAnalytics, ['gsc-search-analytics'], {
  revalidate: 6 * 3600,
});

export type IndexStatus = {
  verdict: string | null;
  coverageState: string | null;
  lastCrawlTime: string | null;
  googleCanonical: string | null;
  userCanonical: string | null;
  robotsTxtState: string | null;
  indexingState: string | null;
  pageFetchState: string | null;
};

async function fetchInspection(url: string): Promise<IndexStatus> {
  const token = await googleToken('gsc');
  const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: GSC_SITE }),
    cache: 'no-store',
  });
  const j = (await res.json()) as {
    inspectionResult?: { indexStatusResult?: Partial<IndexStatus> };
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(`URL Inspection ${res.status}: ${j.error?.message || ''}`);
  const s = j.inspectionResult?.indexStatusResult || {};
  return {
    verdict: s.verdict ?? null,
    coverageState: s.coverageState ?? null,
    lastCrawlTime: s.lastCrawlTime ?? null,
    googleCanonical: s.googleCanonical ?? null,
    userCanonical: s.userCanonical ?? null,
    robotsTxtState: s.robotsTxtState ?? null,
    indexingState: s.indexingState ?? null,
    pageFetchState: s.pageFetchState ?? null,
  };
}

// URL Inspection has a 2,000/day quota per property, and a page's index
// state rarely changes within a day.
export const inspectUrl = unstable_cache(fetchInspection, ['gsc-url-inspection'], { revalidate: 24 * 3600 });

/** Site-relative path of a Search Console page URL, decoded. */
export function sitePath(url: string): string {
  try {
    const u = new URL(url);
    return decodeURIComponent(u.pathname + u.search) || '/';
  } catch {
    return url;
  }
}
