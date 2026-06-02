#!/usr/bin/env tsx
/**
 * Backfill SEO metadata for published articles that predate the SEO pipeline.
 *
 * Fills ONLY currently-null SEO columns using the validated lib/seo logic:
 *   faq (FAQPage), internal_links, focus_keyword, secondary_keywords,
 *   schema_json, canonical_url, seo_score, seo_package.
 *
 * It NEVER touches content, title, excerpt, slug, tags, is_published,
 * image_url, meta_title or meta_description - so the visible article and its
 * live <title>/description are unchanged. Self-links are excluded.
 *
 * Default is dry-run. Pass --apply to write.
 *
 *   tsx scripts/backfill-seo-published.ts            # dry-run
 *   tsx scripts/backfill-seo-published.ts --apply    # write
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { generateAndValidateSeo, htmlToMarkdown, looksLikeHtml } from '../lib/seo';
import type { ExistingArticleRef } from '../lib/seo';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const APPLY = process.argv.includes('--apply');

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  return createClient(url, key, { auth: { persistSession: false } });
}

const SELECT =
  'id, title, slug, content, excerpt, tags, created_date, focus_keyword, secondary_keywords, ' +
  'canonical_url, faq, internal_links, schema_json, seo_score, seo_package';

async function main() {
  const supabase = client();
  const { data, error } = await supabase
    .from('articles')
    .select(SELECT)
    .eq('is_published', true)
    .order('created_date', { ascending: false });
  if (error) throw error;
  const articles = (data ?? []) as Record<string, any>[];

  // Internal-link candidate set: all published articles.
  const refs: (ExistingArticleRef & { slugKey: string })[] = articles.map((a) => ({
    slugKey: a.slug,
    slug: a.slug,
    title: a.title,
    tags: a.tags ?? '',
    focus_keyword: a.focus_keyword ?? null,
  }));

  console.log(`Mode: ${APPLY ? 'APPLY (writing)' : 'DRY-RUN (no writes)'} | ${articles.length} published articles\n`);

  const rows: any[] = [];
  let written = 0;

  for (const a of articles) {
    const raw = a.content || '';
    const content = looksLikeHtml(raw) ? htmlToMarkdown(raw) : raw;
    const existing = refs
      .filter((r) => r.slugKey !== a.slug)
      .map(({ slugKey, ...rest }) => rest);

    const { package: pkg, validation } = generateAndValidateSeo({
      title: a.title,
      content,
      excerpt: a.excerpt ?? null,
      tags: a.tags ?? '',
      slug: a.slug,
      createdDate: a.created_date ?? new Date().toISOString(),
      existingArticles: existing,
    });

    // Build update with ONLY currently-null SEO columns.
    const upd: Record<string, unknown> = {};
    if (a.faq == null && pkg.faq_json) upd.faq = pkg.faq_json;
    if (a.internal_links == null && pkg.internal_links.length) upd.internal_links = pkg.internal_links;
    if (a.focus_keyword == null && pkg.focus_keyword) upd.focus_keyword = pkg.focus_keyword;
    if ((a.secondary_keywords == null || a.secondary_keywords.length === 0) && pkg.secondary_keywords.length)
      upd.secondary_keywords = pkg.secondary_keywords;
    if (a.canonical_url == null) upd.canonical_url = pkg.canonical_url;
    if (a.schema_json == null) upd.schema_json = pkg.schema_json;
    if (a.seo_score == null) upd.seo_score = validation.score;
    if (a.seo_package == null)
      upd.seo_package = {
        og_title: pkg.og_title,
        og_description: pkg.og_description,
        image_alt: pkg.image_alt,
        metrics: validation.metrics,
        findings: validation.findings,
        backfilled_at: new Date().toISOString(),
      };

    const faqQ = pkg.faq_json ? pkg.faq_json.mainEntity.length : 0;
    rows.push({
      slug: a.slug.slice(0, 38),
      faqQ,
      links: pkg.internal_links.length,
      focus: pkg.focus_keyword,
      score: validation.score,
      filled: Object.keys(upd).join('+') || '-',
    });

    if (APPLY && Object.keys(upd).length) {
      const { error: uerr } = await supabase.from('articles').update(upd).eq('id', a.id);
      if (uerr) console.error('UPDATE failed for', a.slug, '-', uerr.message);
      else written++;
    }
  }

  console.table(rows);
  const withFaq = rows.filter((r) => r.faqQ > 0).length;
  const withLinks = rows.filter((r) => r.links > 0).length;
  console.log(`\nFAQ generated:    ${withFaq}/${rows.length} articles`);
  console.log(`Internal links:   ${withLinks}/${rows.length} articles`);
  console.log(APPLY ? `Rows written:     ${written}` : 'Dry-run only. Re-run with --apply to write.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
