// First-party analytics: the shared vocabulary between the browser, the
// ingest route and the admin dashboard.
//
// Why this exists alongside GA4 and the Meta pixel: both of those are blocked
// for a meaningful share of visitors by ad blockers and tracking prevention,
// and the events most worth having - someone reached out - are exactly the
// ones a blocker stops. A POST to our own origin is not blocked, so this store
// sees traffic the other two never will.
//
// It is also the only source that can answer "how did this change over time",
// because articles.views_count is a running counter with no timestamps.
//
// Privacy, on a therapist's site, is not a footnote. Nothing here identifies a
// person: no IP, no user agent string, no email. session_id is a random
// per-visit value that exists only to separate one visit from another.

/** Events worth storing. lib/analytics.ts fires ~50; most are UI telemetry. */
export const TRACKED_EVENTS = [
  // reach
  'page_view',
  // engagement
  'article_read',
  'article_completed',
  'article_like',
  'share',
  'search',
  'service_interest',
  'cta_click',
  // conversions
  'contact_whatsapp',
  'contact_phone',
  'contact_email',
  'contact_form_submit',
  'sign_up',
] as const;

export type TrackedEvent = (typeof TRACKED_EVENTS)[number];

/**
 * The events that count as "someone reached out". Derived on the server, never
 * taken from the client, so a stray call cannot inflate the number the whole
 * budget is judged against.
 *
 * sign_up is deliberately not here. Joining a mailing list is real but it is
 * not an enquiry, and folding the two together is how a lead metric stops
 * meaning anything.
 */
export const CONVERSION_EVENTS: readonly string[] = [
  'contact_whatsapp',
  'contact_phone',
  'contact_email',
  'contact_form_submit',
];

const TRACKED = new Set<string>(TRACKED_EVENTS);
export const isTrackedEvent = (name: string): boolean => TRACKED.has(name);
export const isConversion = (name: string): boolean =>
  CONVERSION_EVENTS.includes(name);

/** Hebrew labels for the admin. */
export const EVENT_LABELS: Record<string, string> = {
  page_view: 'צפיות בעמודים',
  article_read: 'קריאת מאמר',
  article_completed: 'סיום קריאה',
  article_like: 'לייק',
  share: 'שיתוף',
  search: 'חיפוש באתר',
  service_interest: 'עניין בשירות',
  cta_click: 'לחיצה על קריאה לפעולה',
  contact_whatsapp: 'ווטסאפ',
  contact_phone: 'טלפון',
  contact_email: 'אימייל',
  contact_form_submit: 'טופס יצירת קשר',
  sign_up: 'הרשמה לרשימה',
};

export const PAGE_TYPE_LABELS: Record<string, string> = {
  homepage: 'דף הבית',
  article: 'מאמר',
  articles_list: 'רשימת מאמרים',
  topic: 'עמוד נושא',
  service: 'עמוד שירות',
  services_list: 'תחומי טיפול',
  clinic: 'הקליניקה',
  about: 'קצת עליי',
  contact: 'צרו קשר',
  other: 'אחר',
};

/** One classifier, so the browser and the dashboard never disagree. */
export function pageTypeFor(pathname: string): string {
  if (pathname === '/') return 'homepage';
  if (pathname === '/about') return 'about';
  if (pathname === '/contact') return 'contact';
  if (pathname === '/clinic') return 'clinic';
  if (pathname === '/articles') return 'articles_list';
  if (pathname === '/services') return 'services_list';
  if (pathname.startsWith('/articles/topic/')) return 'topic';
  if (pathname.startsWith('/articles/')) return 'article';
  if (pathname.startsWith('/services/')) return 'service';
  return 'other';
}

/** The slug a page is about, when it is about one. */
export function entityFor(pathname: string): string | null {
  if (pathname.startsWith('/articles/topic/')) {
    return pathname.replace('/articles/topic/', '') || null;
  }
  if (pathname.startsWith('/articles/')) {
    return pathname.replace('/articles/', '') || null;
  }
  if (pathname.startsWith('/services/')) {
    return pathname.replace('/services/', '') || null;
  }
  return null;
}

export type SiteEventPayload = {
  event_name: string;
  path?: string | null;
  page_type?: string | null;
  entity?: string | null;
  source?: string | null;
  session_id?: string | null;
  referrer_host?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  /**
   * Which ad platform's click id was on the landing URL, not the id itself.
   *
   * Google auto-tagging sends gclid (or wbraid/gbraid from iOS) and no utm at
   * all, which is why every paid visit has been landing in the dashboard as
   * "organic / direct". The id is a per-click identifier and this table
   * deliberately stores no identifiers - IP and user agent are already thrown
   * away - so only which platform it came from is kept.
   */
  click_kind?: string | null;
};

/** The ad platforms we recognise a click id from. */
export const CLICK_KINDS = ['google', 'meta'] as const;
export type ClickKind = (typeof CLICK_KINDS)[number];
export const isClickKind = (v: string): v is ClickKind =>
  (CLICK_KINDS as readonly string[]).includes(v);
