/**
 * The one Vary value this site emits on negotiable responses.
 *
 * It has to be a single shared constant because three layers set it and, in
 * production, which of them wins depends on the response - measured against
 * the live site, not assumed:
 *
 *   /api/md/*        route handler + next.config -> combined, Accept present
 *   /llms.txt        next.config wins            -> Accept present
 *   /404 (HTML)      proxy.ts wins, REPLACING    -> whatever proxy.ts says
 *   /privacy (HTML)  Next wins, replacing        -> Accept absent
 *
 * The third line is why the value is a superset rather than plain `Accept`.
 * proxy.ts used to append `Accept` alone; on the 404 that won outright and
 * wiped Next's four RSC routing entries, which are what keep client-side
 * navigation from being served a document response and vice versa. Any layer
 * that wins with this constant loses nothing.
 *
 * The RSC names mirror Next's own setVaryHeader (base-server). If a Next
 * upgrade changes that list, this has to follow it.
 *
 * The fourth line is a known gap: Next replaces Vary on prerendered page
 * responses and nothing set outside it survives there. Vercel's own cache is
 * not affected - proxy.ts rewrites a Markdown request to /api/md before the
 * cache is consulted, so the two variants never share a cache entry - but a
 * shared cache between a client and Vercel could still hold the wrong one.
 */
export const VARY_VALUE =
  'RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Accept, Accept-Encoding';
