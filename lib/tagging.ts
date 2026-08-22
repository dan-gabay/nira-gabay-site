// Which measurement stack is live, decided by env vars alone.
//
// Two mutually exclusive modes:
//
//   GTM mode    - NEXT_PUBLIC_GTM_ID is set. The container loads GA4, Google
//                 Ads and the Meta Pixel, and the site only pushes semantic
//                 events to dataLayer. New tags become a change in the GTM UI
//                 instead of a deploy.
//
//   Direct mode - no GTM id. gtag.js and the Meta Pixel are embedded by the
//                 site itself, exactly as before GTM existed.
//
// The exclusivity is the whole point. If GTM loaded GA4 while the site also
// embedded gtag.js, every pageview and every event would be counted twice, and
// the numbers would look like the site had doubled its traffic overnight.

export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || '';
export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-5HBTQFQL05';
// Owner's pixel, created 2026-08 under the Meta Business account. Hardcoded
// as the default for the same reason as the GA4 id above: a pixel id is public
// (it is readable in any page's source), and making it a required env var only
// adds a dashboard step between a working deploy and working measurement.
export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || '2294471474637160';
export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '';

/** True when GTM owns the tags and the site must not embed them itself. */
export const usingGtm = Boolean(GTM_ID);
