// Server-side record of automated requests, written from proxy.ts.
//
// Why this exists at all: `site_events` is written by the page's own
// JavaScript POSTing to /api/track. An assistant that fetches the HTML and
// reads it never runs that JavaScript, so it never appears there - which is
// why `site_events.bot_kind` could only ever label the small minority of
// automated clients that happen to execute scripts. Over one 12-hour window
// the edge saw 325 requests and `site_events` held 27 page views. Everything
// in between was invisible.
//
// proxy.ts already runs on every request that is not Next's own build output
// and already has the user agent in hand. This is the line that writes it down.
//
// Privacy: nothing is written for a person. botKindFromUserAgent() returns
// null for a browser and the caller skips the write entirely. No IP, no user
// agent, no session id, no referrer - only the bucket and the path, which is
// the same bargain site_events.bot_kind already makes.

/**
 * Inserts one row into public.bot_hits. Never throws and never blocks: the
 * caller hands this to event.waitUntil(), so a slow or failed log line costs
 * the response nothing.
 *
 * Uses plain fetch against PostgREST rather than @supabase/supabase-js, to
 * keep the edge bundle small - this runs on every single request.
 */
export async function recordBotHit(kind: string, path: string): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  try {
    await fetch(`${url}/rest/v1/bot_hits`, {
      method: 'POST',
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
        // Do not send the inserted row back; we have no use for it.
        prefer: 'return=minimal',
      },
      // `path` is truncated because a malformed or hostile URL is still a URL
      // and there is no reason to store an arbitrarily long one.
      body: JSON.stringify({ bot_kind: kind, path: path.slice(0, 512) }),
    });
  } catch {
    // A log line is never worth breaking a page for.
  }
}
