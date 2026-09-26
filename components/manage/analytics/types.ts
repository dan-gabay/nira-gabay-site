import type { DayPoint } from '@/components/manage/Charts';
import type { TrafficRow } from '@/components/manage/TrafficSources';
import type { ReturningSummary, ReturningBucket } from '@/components/manage/Audience';

// The shape of /api/manage/analytics, shared by the page and its sections.
// Keys added after the first version are optional: a response cached before
// one landed simply has no value for it, and every read is guarded.

export type Totals = { views: number; visits: number; conversions: number; signups: number; events?: number };

export type SourceRow = {
  grp: string;
  visits: number;
  views: number;
  one_page_visits: number;
  deep_visits: number;
  conversions: number;
};

export type Payload = {
  range_days: number;
  totals: Totals;
  previous: Totals;
  granularity?: 'hour' | 'day';
  daily: DayPoint[];
  /** Automated clients that ran the page's JavaScript, kept out of every figure. */
  bots?: Array<{ kind: string; hits: number; sessions: number }>;
  /** Every automated request the edge saw (proxy.ts). `paths` is distinct pages. */
  bot_fetches?: Array<{ kind: string; hits: number; paths: number }>;
  top_articles: Array<{ slug: string; title: string; views: number; readers: number }>;
  by_event: Array<{ name: string; n: number }>;
  by_page_type: Array<{ page_type: string; views: number; conversions: number }>;
  top_pages: Array<{ path: string; page_type: string; views: number }>;
  conversions_by_source: Array<{ name: string; source: string; n: number }>;
  devices: Array<{ device: string; n: number }>;
  traffic?: TrafficRow[];
  traffic_daily?: Array<{ day: string; grp: string; visits: number; conversions: number }>;
  landing_pages?: Array<{ path: string; page_type: string; visits: number; conversions: number }>;
  service_funnel?: Array<{ slug: string; views: number; visits: number; conversions: number }>;
  by_hour?: Array<{ hour: number; visits: number; conversions: number }>;
  by_weekday?: Array<{ dow: number; visits: number; conversions: number }>;
  engagement?: {
    visits: number;
    one_page_visits: number;
    deep_visits: number;
    article_reads: number;
    article_completed: number;
  };
  returning?: ReturningSummary;
  returning_buckets?: ReturningBucket[];
  engagement_by_source?: SourceRow[];
  first_event: string | null;
};

/** One row of /api/manage/enquiry-log - see db/2026-09-26-enquiry-log.sql. */
export type EnquiryRow = {
  ts?: string;
  /** Israel time, 'YYYY-MM-DDTHH:MI'. */
  at: string;
  event_name: string;
  source: string | null;
  /** The page the button was on. */
  path: string | null;
  /** The page the visit started on. */
  landing: string | null;
  grp: string;
  /** Keyword or campaign for paid, engine / network / host otherwise. */
  detail: string | null;
  views: number;
  visit_number: number | null;
  device: string | null;
};
