import { unstable_cache } from 'next/cache';
import { googleToken } from './auth';

// GA4 Data API, read-only. Note: the advertiser cost metrics are incompatible
// with a sessionDefaultChannelGroup filter, so paid reports use the
// sessionGoogleAds* dimensions instead of filtering to Paid Search.

export type Ga4Row = { dims: string[]; values: number[] };

type Report = { startDate: string; endDate: string; dimensions: string[]; metrics: string[]; limit?: number };

async function fetchReport(r: Report): Promise<Ga4Row[]> {
  const token = await googleToken('ga');
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${process.env.GA_PROPERTY_ID}:runReport`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: r.startDate, endDate: r.endDate }],
        dimensions: r.dimensions.map((name) => ({ name })),
        metrics: r.metrics.map((name) => ({ name })),
        limit: r.limit ?? 1000,
      }),
      cache: 'no-store',
    },
  );
  const j = (await res.json()) as {
    rows?: Array<{ dimensionValues?: Array<{ value: string }>; metricValues?: Array<{ value: string }> }>;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(`GA4 ${res.status}: ${j.error?.message || ''}`);
  return (j.rows || []).map((row) => ({
    dims: (row.dimensionValues || []).map((d) => d.value),
    values: (row.metricValues || []).map((m) => Number(m.value)),
  }));
}

export const runReport = unstable_cache(fetchReport, ['ga4-run-report'], { revalidate: 6 * 3600 });
