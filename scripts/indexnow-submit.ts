/**
 * Submits changed URLs to IndexNow. Runs after `next build` on production
 * deploys, and can be run by hand.
 *
 *   npm run indexnow                 # dry run: prints what it would send
 *   npm run indexnow -- --submit     # actually sends
 *
 * Dry-run by default, per this repo's standing rule for anything that writes
 * to the outside world.
 *
 * On Vercel it is invoked from the build script and is deliberately quiet and
 * non-fatal: it exits 0 whatever happens, because a search-engine ping is not
 * a reason to fail a deploy that is otherwise fine. Anything that went wrong
 * is printed, so the build log is where you look.
 */
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { syncIndexNow } from '../lib/indexnowSync';
import { INDEXNOW_KEY_LOCATION } from '../lib/indexnow';

// Local runs read .env.local, per this repo's convention. On Vercel the file
// does not exist and the variables are already in the environment; dotenv
// leaves those alone either way.
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const args = process.argv.slice(2);
const submit = args.includes('--submit');
// Only production deploys ping IndexNow. A preview build submitting the
// production URLs would tell the engines a page changed when it did not.
const onVercelNonProduction = Boolean(process.env.VERCEL) && process.env.VERCEL_ENV !== 'production';

async function main() {
  if (onVercelNonProduction) {
    console.log(`[indexnow] skipped: VERCEL_ENV=${process.env.VERCEL_ENV} (production only)`);
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log('[indexnow] skipped: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
    return;
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const report = await syncIndexNow(supabase, { dryRun: !submit });

  console.log(`[indexnow] key location: ${INDEXNOW_KEY_LOCATION}`);
  console.log(`[indexnow] ${report.total} public URLs, ${report.changed.length} changed`);

  for (const u of report.changed.slice(0, 25)) console.log(`[indexnow]   ${u}`);
  if (report.changed.length > 25) {
    console.log(`[indexnow]   ... and ${report.changed.length - 25} more`);
  }

  if (report.reason) console.log(`[indexnow] ${report.reason}`);
  for (const batch of report.result?.batches || []) {
    console.log(`[indexnow] batch of ${batch.count}: HTTP ${batch.status} ${batch.body}`);
  }
  for (const skipped of report.result?.skipped || []) {
    console.log(`[indexnow] skipped (not an https URL on the site host): ${skipped}`);
  }
  if (report.recorded) console.log(`[indexnow] recorded ${report.recorded} URLs as submitted`);
  for (const err of report.errors) console.error(`[indexnow] error: ${err}`);

  if (!submit && report.changed.length) {
    console.log('[indexnow] dry run. Pass --submit to send.');
  }
}

main()
  .catch((err) => {
    console.error('[indexnow] failed:', err instanceof Error ? err.message : err);
  })
  // Never fail the build over a search-engine ping.
  .finally(() => process.exit(0));
