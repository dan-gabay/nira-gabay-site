#!/usr/bin/env tsx
/**
 * Re-score published articles against the current validator rules.
 *
 * Builds a SeoPackage from each article's STORED columns (what actually
 * renders: meta_title, meta_description, focus_keyword, faq, internal_links,
 * schema_json, image_alt from seo_package) and runs validateSeoPackage. This
 * gives honest, comparable seo_score values after validator recalibration -
 * scores were previously computed under looser rules at different times.
 *
 * Writes ONLY: seo_score, and refreshes seo_package.findings / .metrics /
 * .rescored_at. Never touches content or any rendered meta field.
 *
 * Default is dry-run. Pass --apply to write.
 *
 *   npx tsx scripts/rescore-published.ts            # dry-run
 *   npx tsx scripts/rescore-published.ts --apply    # write
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { validateSeoPackage } from '../lib/seo/validate';
import { htmlToMarkdown, looksLikeHtml } from '../lib/seo';
import type { ExistingArticleRef, SeoPackage, FaqSchema } from '../lib/seo';

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
    .select(
      'id, slug, title, meta_title, meta_description, excerpt, tags, focus_keyword, ' +
      'secondary_keywords, canonical_url, faq, internal_links, schema_json, seo_score, ' +
      'seo_package, content, is_published',
    )
    .eq('is_published', true)
    .order('created_date', { ascending: true });
  if (error) throw error;
  const articles = (data ?? []) as Record<string, any>[];

  const refs: ExistingArticleRef[] = articles.map((a) => ({
    slug: a.slug,
    title: a.title ?? '',
    tags: a.tags ?? '',
    focus_keyword: a.focus_keyword ?? null,
    is_published: true,
    meta_title: a.meta_title ?? null,
  }));

  console.log(`Mode: ${APPLY ? 'APPLY (writing)' : 'DRY-RUN (no writes)'} | ${articles.length} published articles\n`);

  let written = 0;
  for (const a of articles) {
    const raw = a.content || '';
    const content = looksLikeHtml(raw) ? htmlToMarkdown(raw) : raw;
    const sp = (a.seo_package ?? {}) as Record<string, any>;
    const tags = (a.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);

    // The stored state as the site actually renders it.
    const pkg: SeoPackage = {
      seo_title: a.meta_title || a.title || '',
      meta_title: a.meta_title || a.title || '',
      meta_description: a.meta_description || a.excerpt || '',
      slug: a.slug,
      excerpt: a.excerpt || '',
      tags,
      focus_keyword: a.focus_keyword || '',
      secondary_keywords: a.secondary_keywords || [],
      image_prompt: sp.image_prompt || '',
      // Page fallback alt is derived from the title when no explicit alt exists
      image_alt: sp.image_alt || `תמונת המאמר: ${a.title}`,
      og_title: sp.og_title || a.meta_title || a.title || '',
      og_description: sp.og_description || a.meta_description || '',
      faq_json: (a.faq as FaqSchema) ?? null,
      schema_json: a.schema_json ?? {},
      internal_links: a.internal_links ?? [],
      canonical_url: a.canonical_url || `https://www.niragabay.com/articles/${a.slug}`,
    };

    const existing = refs.filter((r) => r.slug !== a.slug);
    const result = validateSeoPackage(pkg, content, existing);

    const errors = result.findings.filter((f) => f.severity === 'error');
    const warns = result.findings.filter((f) => f.severity === 'warn');
    const delta = a.seo_score == null ? '(was null)' : `(was ${a.seo_score})`;
    console.log(`${a.slug}: ${result.score} ${delta} | ${errors.length} errors, ${warns.length} warns`);
    for (const f of [...errors, ...warns]) console.log(`   ${f.severity.toUpperCase()}: ${f.message}`);

    if (APPLY) {
      const newPackage = {
        ...sp,
        findings: result.findings,
        metrics: result.metrics,
        rescored_at: new Date().toISOString(),
      };
      const { error: upErr } = await supabase
        .from('articles')
        .update({ seo_score: result.score, seo_package: newPackage })
        .eq('id', a.id);
      if (upErr) console.log(`   WRITE ERROR: ${upErr.message}`);
      else written++;
    }
  }

  console.log(`\nDone.${APPLY ? ` Written: ${written}/${articles.length}` : ' Dry-run only - re-run with --apply to write.'}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
