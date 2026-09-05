// Works out which URLs actually changed, submits those, and remembers what it
// sent.
//
// This is the part that decides whether the IndexNow integration is useful or
// just noise. The protocol's guidance is explicit that a URL should be
// submitted when its content changed; a site that posts its whole sitemap on
// every deploy gets rate-limited and, worse, teaches the engines to ignore it.
// So every run is a diff against public.indexnow_urls, and a deploy that
// changed nothing sends nothing at all.

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSiteUrls } from './siteUrls';
import { submitToIndexNow, explainStatus, type IndexNowResult } from './indexnow';

export type IndexNowSyncReport = {
  total: number;
  changed: string[];
  /** Set when nothing was sent, saying why. */
  reason?: string;
  result?: IndexNowResult;
  recorded: number;
  errors: string[];
};

const TABLE = 'indexnow_urls';

export async function syncIndexNow(
  supabase: SupabaseClient,
  { dryRun = false, limit }: { dryRun?: boolean; limit?: number } = {},
): Promise<IndexNowSyncReport> {
  const errors: string[] = [];
  const entries = await getSiteUrls(supabase);

  const { data: known, error: readError } = await supabase
    .from(TABLE)
    .select('url, content_key');

  if (readError) {
    // Failing open here would submit the entire site, which is worse than
    // submitting nothing: it is the one outcome the protocol penalises.
    return {
      total: entries.length,
      changed: [],
      reason: `could not read ${TABLE}: ${readError.message}`,
      recorded: 0,
      errors: [readError.message],
    };
  }

  const seen = new Map((known || []).map((r) => [r.url as string, r.content_key as string]));
  let changed = entries.filter((e) => seen.get(e.url) !== e.contentKey);

  if (limit && changed.length > limit) changed = changed.slice(0, limit);

  if (changed.length === 0) {
    return { total: entries.length, changed: [], reason: 'nothing changed', recorded: 0, errors };
  }

  const result = await submitToIndexNow(changed.map((e) => e.url), { dryRun });

  const failed = result.batches.filter((b) => !b.ok);
  for (const b of failed) errors.push(`${b.status}: ${explainStatus(b.status)} ${b.body}`.trim());

  // Only remember what was actually accepted. A batch that failed must stay
  // "changed" so the next run retries it rather than silently dropping it.
  if (dryRun || failed.length > 0) {
    return {
      total: entries.length,
      changed: changed.map((e) => e.url),
      reason: dryRun ? 'dry run - nothing sent, nothing recorded' : undefined,
      result,
      recorded: 0,
      errors,
    };
  }

  const now = new Date().toISOString();
  const { error: writeError } = await supabase.from(TABLE).upsert(
    changed.map((e) => ({ url: e.url, content_key: e.contentKey, submitted_at: now })),
    { onConflict: 'url' },
  );
  if (writeError) errors.push(`could not record submission: ${writeError.message}`);

  return {
    total: entries.length,
    changed: changed.map((e) => e.url),
    result,
    recorded: writeError ? 0 : changed.length,
    errors,
  };
}
