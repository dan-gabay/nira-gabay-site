#!/usr/bin/env tsx
/**
 * Normalize punctuation in article text: en/em dashes to a regular hyphen,
 * curly double quotes to a straight quote.
 *
 * CLAUDE.md bans the em dash outright. The en dash was never named, but it is
 * the same problem one code point over: 14 published articles use " – " as a
 * parenthetical dash and one uses it for numeric ranges ("גילאי 12–14"), while
 * the rest of the site uses a hyphen. Curly double quotes are in 7 articles
 * where the other 28 use a straight quote, and they are mispaired in at least
 * one place (`ה”מגניבים”` opens with a closing quote), so flattening fixes the
 * pairing too.
 *
 * Covers `content` AND the metadata fields, because the same characters appear
 * in three of them: an en dash in the `title` of
 * perfectionism-how-it-holds-us-back (which renders as the H1 and feeds the
 * schema headline), and in two `excerpt`s.
 *
 * Opt-in, off by default - see lib/seo/typography.ts for why each is a
 * judgment call rather than a mechanical one:
 *   --geresh     U+2018/U+2019 to an ASCII apostrophe (טרנסג’נדרים, כיתה י’)
 *   --ellipsis   U+2026 to three ASCII dots
 *
 * Refuses to write any row whose letters and digits would change, so only
 * punctuation can ever move.
 *
 * Default is dry-run. Pass --apply to write.
 *
 *   npx tsx scripts/fix-typography.ts            # dry-run
 *   npx tsx scripts/fix-typography.ts --apply    # write
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  normalizeTypography,
  lettersAndDigitsUnchanged,
  hasOffendingChars,
  countOffenders,
  type TypographyOptions,
} from '../lib/seo/typography';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const APPLY = process.argv.includes('--apply');
const OPTIONS: TypographyOptions = {
  geresh: process.argv.includes('--geresh'),
  ellipsis: process.argv.includes('--ellipsis'),
};

/** Every column that holds prose a reader or a crawler sees. */
const FIELDS = ['content', 'title', 'excerpt', 'meta_title', 'meta_description'] as const;
type Field = (typeof FIELDS)[number];

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function main() {
  const supabase = client();
  const { data, error } = await supabase
    .from('articles')
    .select(`id, slug, is_published, ${FIELDS.join(', ')}`)
    .neq('status', 'superseded')
    .neq('status', 'redirected')
    .order('slug', { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as Array<Record<string, unknown> & { id: string; slug: string; is_published: boolean }>;
  const enabled = [
    'dashes', 'curly-double',
    ...(OPTIONS.geresh ? ['geresh'] : []),
    ...(OPTIONS.ellipsis ? ['ellipsis'] : []),
  ].join(' + ');

  console.log(`Mode: ${APPLY ? 'APPLY (writing)' : 'DRY-RUN (no writes)'} | rules: ${enabled}`);
  console.log(`${rows.length} articles scanned\n`);

  const totals = { enDash: 0, emDash: 0, curlyDouble: 0, geresh: 0, ellipsis: 0 };
  const refused: string[] = [];
  let changed = 0;
  let written = 0;

  for (const row of rows) {
    const update: Partial<Record<Field, string>> = {};
    const touched: string[] = [];
    let rowFailed = false;

    for (const field of FIELDS) {
      const before = row[field];
      if (typeof before !== 'string' || !before) continue;

      const after = normalizeTypography(before, OPTIONS);
      if (after === before) continue;

      if (!lettersAndDigitsUnchanged(before, after) || hasOffendingChars(after, OPTIONS)) {
        rowFailed = true;
        break;
      }

      const c = countOffenders(before);
      totals.enDash += c.enDash;
      totals.emDash += c.emDash;
      totals.curlyDouble += c.curlyDouble;
      if (OPTIONS.geresh) totals.geresh += c.geresh;
      if (OPTIONS.ellipsis) totals.ellipsis += c.ellipsis;

      update[field] = after;
      touched.push(`${field}(${c.enDash + c.emDash + c.curlyDouble
        + (OPTIONS.geresh ? c.geresh : 0) + (OPTIONS.ellipsis ? c.ellipsis : 0)})`);
    }

    if (rowFailed) {
      refused.push(row.slug);
      continue;
    }
    if (touched.length === 0) continue;

    changed++;
    console.log(
      `${row.slug.padEnd(52)} | ${row.is_published ? 'pub' : '   '} | ${touched.join(' ')}`,
    );

    if (APPLY) {
      const { error: updateError } = await supabase.from('articles').update(update).eq('id', row.id);
      if (updateError) throw new Error(`${row.slug}: ${updateError.message}`);
      written++;
    }
  }

  console.log('');
  console.log(`Articles touched: ${changed}`);
  console.log(
    `Replacements: en dash ${totals.enDash}, em dash ${totals.emDash}, ` +
      `curly double ${totals.curlyDouble}` +
      (OPTIONS.geresh ? `, geresh ${totals.geresh}` : '') +
      (OPTIONS.ellipsis ? `, ellipsis ${totals.ellipsis}` : ''),
  );
  if (refused.length) console.log(`REFUSED (letters or digits would change): ${refused.join(', ')}`);
  console.log(APPLY ? `Rows written: ${written}` : 'Dry-run - nothing written. Re-run with --apply.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
