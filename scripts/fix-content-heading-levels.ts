#!/usr/bin/env tsx
/**
 * Demote markdown H1 headings (`# `) in article bodies to H2 (`## `).
 *
 * Why: app/articles/[slug]/page.tsx renders the body under
 * `components={{ h1: 'h2' }}`, so a stored `# ` already reaches the reader as
 * an <h2> - the HTML surface is fine and this migration changes nothing a
 * visitor sees. The two surfaces without that remap are not fine:
 *
 *   - lib/agent/markdown.ts emits `# {title}` and passes the body through
 *     untouched, so on the Markdown representation served to OAI-SearchBot,
 *     PerplexityBot and /api/md/* the body's sections sit at the same level as
 *     the article title.
 *   - splitAtThirdH2() searches for the literal "\n## " to place the in-body
 *     "מומלץ לקרוא גם" aside, so an all-H1 article silently loses its
 *     contextual internal links.
 *
 * This is the "עדיף לתקן במקור" the `content_has_h1` warn in
 * lib/seo/validate.ts has been asking for.
 *
 * Touches NOTHING except `content`. seo_score is left as stored - rerun
 * scripts/rescore-published.ts afterwards to pick up the improvement.
 *
 * Refuses to write any row whose rendered heading sequence would change, so a
 * surprise in the stored markdown aborts that row instead of altering the page.
 *
 * Default is dry-run. Pass --apply to write.
 *
 *   npx tsx scripts/fix-content-heading-levels.ts            # dry-run
 *   npx tsx scripts/fix-content-heading-levels.ts --apply    # write
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  demoteH1ToH2,
  renderedOutputUnchanged,
  hasInBodyAside,
} from '../lib/seo/headingLevels';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const APPLY = process.argv.includes('--apply');

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  return createClient(url, key, { auth: { persistSession: false } });
}

const count = (s: string, re: RegExp) => s.match(re)?.length ?? 0;

async function main() {
  const supabase = client();
  const { data, error } = await supabase
    .from('articles')
    .select('id, slug, content, is_published')
    .neq('status', 'superseded')
    .neq('status', 'redirected')
    .order('slug', { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as Array<{ id: string; slug: string; content: string | null; is_published: boolean }>;

  console.log(`Mode: ${APPLY ? 'APPLY (writing)' : 'DRY-RUN (no writes)'} | ${rows.length} articles scanned\n`);

  const header = ['slug', 'pub', 'H1', 'H2 before', 'H2 after', 'rendered h2', 'aside'];
  console.log(header.join(' | '));
  console.log('-'.repeat(96));

  let changed = 0;
  let written = 0;
  let asideGained = 0;
  const refused: string[] = [];

  for (const row of rows) {
    const before = row.content ?? '';
    if (!before || count(before, /^# /gm) === 0) continue;

    const after = demoteH1ToH2(before);

    // The safety gate. Rendered headings must be byte-identical, and the only
    // permitted length change is one '#' added per demoted heading.
    const h1s = count(before, /^# /gm);
    if (!renderedOutputUnchanged(before, after) || after.length !== before.length + h1s) {
      refused.push(row.slug);
      continue;
    }

    changed++;
    const asideBefore = hasInBodyAside(before);
    const asideAfter = hasInBodyAside(after);
    if (!asideBefore && asideAfter) asideGained++;

    const renderedH2 = count(before, /^#{1,2} /gm);
    console.log(
      [
        row.slug.padEnd(52),
        row.is_published ? 'yes' : 'no ',
        String(h1s).padStart(2),
        String(count(before, /^## /gm)).padStart(9),
        String(count(after, /^## /gm)).padStart(8),
        `${renderedH2} -> ${count(after, /^#{1,2} /gm)}`.padStart(11),
        asideBefore === asideAfter ? '=' : `${asideBefore} -> ${asideAfter}`,
      ].join(' | '),
    );

    if (APPLY) {
      const { error: updateError } = await supabase
        .from('articles')
        .update({ content: after })
        .eq('id', row.id);
      if (updateError) throw new Error(`${row.slug}: ${updateError.message}`);
      written++;
    }
  }

  console.log('');
  console.log(`Articles with H1 in body: ${changed}`);
  console.log(`Articles that gain the in-body internal-link aside: ${asideGained}`);
  if (refused.length) {
    console.log(`REFUSED (rendered output would change): ${refused.join(', ')}`);
  }
  console.log(APPLY ? `Rows written: ${written}` : 'Dry-run - nothing written. Re-run with --apply.');
  if (APPLY) console.log('Next: npx tsx scripts/rescore-published.ts --apply to refresh seo_score.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
