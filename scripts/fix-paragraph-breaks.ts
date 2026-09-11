#!/usr/bin/env tsx
/**
 * Restore blank-line paragraph breaks in article bodies.
 *
 * Why: 15 published articles store a single newline between paragraphs. The
 * article page renders the body with `remarkPlugins={[remarkBreaks]}`, so each
 * of those newlines becomes a <br> inside the current <p> instead of starting
 * a new one. `.prose p { margin: 0.875rem 0 }` then applies once per section
 * rather than once per paragraph, and the whole section arrives at any
 * extractor as a single 1,000+ character <p>.
 *
 * Unlike the H1 -> H2 migration this change IS visible. Two gates stand in for
 * that: textUnchanged (only whitespace may differ) and headingsUnchanged (the
 * rendered heading sequence is identical). A row failing either is printed as
 * REFUSED and not written.
 *
 * Touches NOTHING except `content`. seo_score is left as stored - rerun
 * scripts/rescore-published.ts afterwards to pick up the new
 * longest_paragraph_chars.
 *
 * Default is dry-run. Pass --apply to write.
 *
 *   npx tsx scripts/fix-paragraph-breaks.ts                       # dry-run, all
 *   npx tsx scripts/fix-paragraph-breaks.ts --slug some-slug      # dry-run, one
 *   npx tsx scripts/fix-paragraph-breaks.ts --slug some-slug --apply
 *   npx tsx scripts/fix-paragraph-breaks.ts --apply               # write all
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  normalizeParagraphBreaks,
  textUnchanged,
  headingsUnchanged,
  longestRenderedParagraphChars,
  renderedParagraphCount,
} from '../lib/seo/paragraphBreaks';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const APPLY = process.argv.includes('--apply');
const slugArg = process.argv.indexOf('--slug');
const ONLY_SLUG = slugArg !== -1 ? process.argv[slugArg + 1] : null;

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  return createClient(url, key, { auth: { persistSession: false } });
}

const blanks = (s: string) => s.match(/\n\n/g)?.length ?? 0;

async function main() {
  const supabase = client();
  let query = supabase
    .from('articles')
    .select('id, slug, content, is_published')
    .neq('status', 'superseded')
    .neq('status', 'redirected')
    .order('slug', { ascending: true });
  if (ONLY_SLUG) query = query.eq('slug', ONLY_SLUG);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as Array<{ id: string; slug: string; content: string | null; is_published: boolean }>;
  if (ONLY_SLUG && !rows.length) throw new Error(`No article with slug "${ONLY_SLUG}"`);

  console.log(
    `Mode: ${APPLY ? 'APPLY (writing)' : 'DRY-RUN (no writes)'} | ${rows.length} articles scanned` +
      (ONLY_SLUG ? ` | --slug ${ONLY_SLUG}` : '') +
      '\n',
  );
  console.log(['slug', 'pub', 'blank breaks', 'longest <p>', 'paragraphs'].join(' | '));
  console.log('-'.repeat(104));

  let changed = 0;
  let written = 0;
  const refused: string[] = [];

  for (const row of rows) {
    const before = row.content ?? '';
    if (!before) continue;

    const after = normalizeParagraphBreaks(before);
    if (after === before) continue;

    // The write gates. Only whitespace may differ, and the reader must see the
    // identical heading sequence.
    if (!textUnchanged(before, after) || !headingsUnchanged(before, after)) {
      refused.push(row.slug);
      continue;
    }

    changed++;
    console.log(
      [
        row.slug.padEnd(52),
        row.is_published ? 'yes' : 'no ',
        `${blanks(before)} -> ${blanks(after)}`.padStart(12),
        `${longestRenderedParagraphChars(before)} -> ${longestRenderedParagraphChars(after)}`.padStart(11),
        `${renderedParagraphCount(before)} -> ${renderedParagraphCount(after)}`,
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
  console.log(`Articles needing paragraph breaks: ${changed}`);
  if (refused.length) {
    console.log(`REFUSED (a write gate failed): ${refused.join(', ')}`);
  }
  console.log(APPLY ? `Rows written: ${written}` : 'Dry-run - nothing written. Re-run with --apply.');
  if (APPLY) console.log('Next: npx tsx scripts/rescore-published.ts --apply to refresh seo_score.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
