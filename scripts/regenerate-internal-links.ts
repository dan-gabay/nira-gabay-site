#!/usr/bin/env tsx
/**
 * Regenerate ONLY the internal_links column for all non-superseded articles.
 *
 * Why: the links were originally scored against the pre-cleanup tag taxonomy
 * (which included a brand-name tag on every June import, inflating scores) and
 * used full article titles as anchors. This recomputes them with the clean
 * canonical tags, published-only targets, and descriptive anchors derived from
 * the hand-written meta titles (see lib/seo/generate.ts deriveAnchor).
 *
 * Touches NOTHING except internal_links - meta_title, meta_description, faq,
 * schema_json, seo_score etc. are all left exactly as stored.
 *
 * Default is dry-run. Pass --apply to write.
 *
 *   npx tsx scripts/regenerate-internal-links.ts            # dry-run
 *   npx tsx scripts/regenerate-internal-links.ts --apply    # write
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { suggestInternalLinks } from '../lib/seo/generate';
import { stripToPlainText } from '../lib/seo/text';
import { htmlToMarkdown, looksLikeHtml } from '../lib/seo';
import type { ExistingArticleRef } from '../lib/seo';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const APPLY = process.argv.includes('--apply');

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
    .select('id, slug, title, meta_title, tags, focus_keyword, is_published, status, content, internal_links')
    .neq('status', 'superseded')
    .neq('status', 'redirected')
    .order('created_date', { ascending: true });
  if (error) throw error;
  const articles = (data ?? []) as Record<string, any>[];

  const refs: ExistingArticleRef[] = articles.map((a) => ({
    slug: a.slug,
    title: a.title ?? '',
    tags: a.tags ?? '',
    focus_keyword: a.focus_keyword ?? null,
    is_published: a.is_published === true,
    meta_title: a.meta_title ?? null,
  }));

  console.log(`Mode: ${APPLY ? 'APPLY (writing)' : 'DRY-RUN (no writes)'} | ${articles.length} articles\n`);

  let changed = 0;
  let written = 0;

  for (const a of articles) {
    const raw = a.content || '';
    const md = looksLikeHtml(raw) ? htmlToMarkdown(raw) : raw;
    const plain = stripToPlainText(md);
    const tags = (a.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);
    const existing = refs.filter((r) => r.slug !== a.slug);

    const links = suggestInternalLinks(a.title ?? '', plain, tags, existing);

    const oldSlugs = Array.isArray(a.internal_links)
      ? a.internal_links.map((l: any) => l?.slug).join(', ')
      : '(none)';
    const newSlugs = links.map((l) => l.slug).join(', ');
    const diff = oldSlugs === newSlugs ? ' (targets unchanged, anchors refreshed)' : '';
    if (oldSlugs !== newSlugs) changed++;

    console.log(`${a.is_published ? 'PUB  ' : 'draft'} ${a.slug}`);
    console.log(`  old: ${oldSlugs}`);
    console.log(`  new: ${newSlugs}${diff}`);
    for (const l of links) console.log(`       anchor: "${l.anchor}" [${l.reason}]`);

    if (APPLY) {
      const { error: upErr } = await supabase
        .from('articles')
        .update({ internal_links: links })
        .eq('id', a.id);
      if (upErr) {
        console.log(`  WRITE ERROR: ${upErr.message}`);
      } else {
        written++;
      }
    }
    console.log('');
  }

  console.log(`Done. ${changed}/${articles.length} articles have different link targets.`);
  if (APPLY) console.log(`Written: ${written}/${articles.length}`);
  else console.log('Dry-run only - re-run with --apply to write.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
