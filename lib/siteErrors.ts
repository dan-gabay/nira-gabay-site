// Server side of the failure log described in lib/siteEvents.ts
// (SITE_ERROR_ACTIONS): one site_events row per failed visitor action, so a
// failure outlives Vercel's one-hour log retention.
//
// recordSiteError never throws and never rejects. It is called from the error
// paths of public routes, and the visitor's answer must not depend on whether
// the failure itself could be written down.

import { supabaseServer } from './supabaseServer';
import { entityFor, pageTypeFor, siteErrorSource, type SiteErrorAction } from './siteEvents';
import { botKindFromUserAgent } from './botDetect';

export async function recordSiteError(opts: {
  action: SiteErrorAction;
  /** A short code of ours, e.g. 'db_insert_failed'. Never error text. */
  reason: string;
  /** The page the visitor was on, when the request says. */
  path?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  // The runtime log still gets it, for anyone looking within the hour.
  console.error(`site_error ${opts.action}: ${opts.reason}`);
  try {
    const source = siteErrorSource(opts.action, opts.reason);
    if (!source) return;
    const path =
      typeof opts.path === 'string' && opts.path.startsWith('/') ? opts.path.slice(0, 300) : null;
    const { error } = await supabaseServer()
      .from('site_events')
      .insert({
        event_name: 'site_error',
        source,
        path,
        page_type: path ? pageTypeFor(path) : null,
        entity: path ? entityFor(path) : null,
        // A crawler POSTing junk at the form is labelled like any other bot,
        // so the weekly check can leave it out.
        bot_kind: botKindFromUserAgent(opts.userAgent ?? null),
        is_conversion: false,
      });
    if (error) console.error('site_error insert failed:', error.message);
  } catch (e) {
    console.error('site_error record failed:', e);
  }
}
