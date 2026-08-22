// Publication gate for the service pages and the clinic page.
//
// They were built and deployed before Nira reviewed them. Until she has, they
// must not be found by anyone who was not sent the link: no nav entries, no
// sitemap, and noindex on the pages themselves. They still render at their
// URLs, which is exactly what a review needs.
//
// Flipping this to true is the whole "publish" action - one boolean, then a
// deploy. Nothing else has to be remembered or undone.
//
// Note: the closing line added to all 29 published articles links to
// /services/*, so a reader can still reach these pages from an article. The
// links are followed but the destinations are noindex, so they leak no ranking
// signal; if the pages should be unreachable by humans too, those lines come
// out with one statement (see scripts/link-articles-to-services.ts).
export const SERVICES_LIVE = false;

/** Metadata `robots` value for a page that is built but not yet approved. */
export const UNPUBLISHED_ROBOTS = { index: false, follow: false } as const;
