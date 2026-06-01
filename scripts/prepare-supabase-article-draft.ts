#!/usr/bin/env tsx
/**
 * prepare-supabase-article-draft.ts
 *
 * Phase 4 of the article import pipeline.
 * Reads data/article-ai-optimized-candidate.json and produces
 * data/supabase-article-draft-payload.json - the exact row payload
 * that will later be inserted into public.articles.
 *
 * Dry-run safe: reads and writes local files only.
 * Does NOT insert into Supabase. Does NOT publish. Does NOT update queue.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Paths and constants
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), 'data');
const INPUT_FILE = path.join(DATA_DIR, 'article-ai-optimized-candidate.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'supabase-article-draft-payload.json');

const CANONICAL_BASE = 'https://www.niragabay.com';
const CREATED_BY_AGENT = 'article_import_agent';

// The exact set of columns that exist in public.articles.
// This is the whitelist used to validate article_row_payload.
const ARTICLES_SCHEMA_COLUMNS = new Set([
  'id',
  'title',
  'slug',
  'content',
  'excerpt',
  'image_url',
  'reading_time',
  'likes_count',
  'views_count',
  'tags',
  'is_published',
  'created_date',
  'updated_date',
  'created_by_id',
  'created_by',
  'is_sample',
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ArticleRowPayload {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  image_url: null;
  reading_time: number;
  likes_count: 0;
  views_count: 0;
  tags: string;
  is_published: false;
  created_date: string;
  updated_date: string;
  created_by_id: null;
  created_by: string;
  is_sample: false;
}

interface QualityResult {
  matches_articles_schema: boolean;
  is_published_false: boolean;
  image_url_null_until_generation: boolean;
  old_source_url_publicly_exposed: boolean;
  contains_em_dash: boolean;
  slug_is_ascii_hyphenated: boolean;
  title_non_empty: boolean;
  excerpt_non_empty: boolean;
  content_non_empty: boolean;
  all_required_fields_present: boolean;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isoNow(): string {
  return new Date().toISOString();
}

function containsEmDash(value: unknown): boolean {
  if (typeof value === 'string') return value.includes('—');
  if (typeof value === 'object' && value !== null) {
    return Object.values(value as Record<string, unknown>).some(containsEmDash);
  }
  if (Array.isArray(value)) {
    return (value as unknown[]).some(containsEmDash);
  }
  return false;
}

function containsOldSourceUrl(obj: unknown, privateKeyAllowlist: string[]): boolean {
  // Recursively search for m-y-net.co.il in string values,
  // skipping any keys in the private allowlist at the top level.
  function scan(value: unknown, depth: number, parentKey?: string): boolean {
    if (typeof value === 'string') {
      return value.includes('m-y-net.co.il');
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return Object.entries(value as Record<string, unknown>).some(([k, v]) => {
        if (depth === 0 && privateKeyAllowlist.includes(k)) return false;
        return scan(v, depth + 1, k);
      });
    }
    if (Array.isArray(value)) {
      return (value as unknown[]).some(v => scan(v, depth + 1));
    }
    return false;
  }
  return scan(obj, 0);
}

function validateSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

function validateSchemaFields(payload: Record<string, unknown>): {
  matches: boolean;
  extra: string[];
  missing: string[];
} {
  const payloadKeys = new Set(Object.keys(payload));
  const extra = [...payloadKeys].filter(k => !ARTICLES_SCHEMA_COLUMNS.has(k));
  const missing = [...ARTICLES_SCHEMA_COLUMNS].filter(k => !payloadKeys.has(k));
  return {
    matches: extra.length === 0 && missing.length === 0,
    extra,
    missing,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  // 1. Read input
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`ERROR: Input file not found: ${INPUT_FILE}`);
    console.error('Run npm run prepare:article-candidate (Phase 2) and the AI optimization (Phase 3) first.');
    process.exit(1);
  }

  const raw = fs.readFileSync(INPUT_FILE, 'utf-8');
  const candidate = JSON.parse(raw);

  // Support both article_candidate (Phase 2) and optimized content (Phase 3 output)
  const articleData = candidate.article_candidate ?? candidate.optimized_article;
  if (!articleData) {
    console.error('ERROR: Input file has neither article_candidate nor optimized_article section.');
    process.exit(1);
  }

  const seo = candidate.seo ?? {};
  const imageStrategy = candidate.image_strategy ?? {};
  const source = candidate.source ?? {};
  const migration = candidate.migration ?? {};
  const internalLinking = candidate.internal_linking ?? {};
  const structuredData = candidate.structured_data_candidate ?? {};

  // 2. Build article row payload - only allowed columns
  const now = isoNow();
  const articleId = crypto.randomUUID();
  const slug: string = String(articleData.slug ?? '');

  const article_row_payload: ArticleRowPayload = {
    id: articleId,
    title: String(articleData.title ?? ''),
    slug,
    content: String(articleData.content ?? ''),
    excerpt: String(articleData.excerpt ?? ''),
    image_url: null,
    reading_time: Number(articleData.reading_time ?? 5),
    likes_count: 0,
    views_count: 0,
    tags: String(articleData.tags ?? ''),
    is_published: false,
    created_date: now,
    updated_date: now,
    created_by_id: null,
    created_by: CREATED_BY_AGENT,
    is_sample: false,
  };

  // 3. Build private import metadata - everything else, not inserted into articles
  const private_import_metadata = {
    queue_id: String(source.queue_id ?? ''),
    source_url_private: String(source.source_url_private ?? ''),
    source_title: String(source.source_title ?? ''),
    migration_status: 'draft_payload_prepared',
    future_canonical_url: `${CANONICAL_BASE}/articles/${slug}`,
    seo: {
      seo_title: seo.seo_title ?? null,
      meta_description: seo.meta_description ?? null,
      canonical_url: seo.canonical_url ?? null,
      og_title: seo.og_title ?? null,
      og_description: seo.og_description ?? null,
      focus_keywords: seo.focus_keywords ?? [],
      search_intent: seo.search_intent ?? null,
      reader_problem: seo.reader_problem ?? null,
      article_purpose: seo.article_purpose ?? null,
    },
    image_strategy: imageStrategy,
    structured_data_candidate: structuredData,
    internal_linking: internalLinking,
    human_review_required: true,
  };

  // 4. Quality checks
  const warnings: string[] = [];

  const schemaCheck = validateSchemaFields(article_row_payload as unknown as Record<string, unknown>);
  if (!schemaCheck.matches) {
    if (schemaCheck.extra.length > 0) {
      warnings.push(`Extra columns not in schema: ${schemaCheck.extra.join(', ')}`);
    }
    if (schemaCheck.missing.length > 0) {
      warnings.push(`Missing schema columns: ${schemaCheck.missing.join(', ')}`);
    }
  }

  if (!article_row_payload.title) warnings.push('title is empty');
  if (!article_row_payload.slug) warnings.push('slug is empty');
  if (!article_row_payload.content) warnings.push('content is empty');
  if (!article_row_payload.excerpt) warnings.push('excerpt is empty');

  if (!validateSlug(slug)) {
    warnings.push(`slug is not valid ASCII-hyphenated: "${slug}"`);
  }

  if (article_row_payload.is_published !== false) {
    warnings.push('is_published must be false');
  }

  if (article_row_payload.image_url !== null) {
    warnings.push('image_url must be null until image generation is complete');
  }

  const hasEmDashInRow = containsEmDash(article_row_payload);
  if (hasEmDashInRow) {
    warnings.push('Em dash character found in article_row_payload');
  }

  const hasOldUrl = containsOldSourceUrl(article_row_payload, []);
  if (hasOldUrl) {
    warnings.push('Old source URL (m-y-net.co.il) found in article_row_payload - this must not be publicly exposed');
  }

  if (!private_import_metadata.future_canonical_url.startsWith('https://www.niragabay.com')) {
    warnings.push(`future_canonical_url must point to https://www.niragabay.com, got: ${private_import_metadata.future_canonical_url}`);
  }

  const quality: QualityResult = {
    matches_articles_schema: schemaCheck.matches,
    is_published_false: article_row_payload.is_published === false,
    image_url_null_until_generation: article_row_payload.image_url === null,
    old_source_url_publicly_exposed: hasOldUrl,
    contains_em_dash: hasEmDashInRow,
    slug_is_ascii_hyphenated: validateSlug(slug),
    title_non_empty: Boolean(article_row_payload.title),
    excerpt_non_empty: Boolean(article_row_payload.excerpt),
    content_non_empty: Boolean(article_row_payload.content),
    all_required_fields_present: schemaCheck.missing.length === 0,
    warnings,
  };

  // 5. Assemble output
  const output = {
    article_row_payload,
    private_import_metadata,
    quality,
    prepared_at: now,
  };

  // 6. Write output
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');

  // 7. Console report
  const passed = warnings.length === 0;
  console.log('');
  console.log('=== Phase 4: Supabase Draft Payload ===');
  console.log('');
  console.log(`Output file:     ${OUTPUT_FILE}`);
  console.log(`ID:              ${article_row_payload.id}`);
  console.log(`Title:           ${article_row_payload.title}`);
  console.log(`Slug:            ${article_row_payload.slug}`);
  console.log(`Excerpt:         ${article_row_payload.excerpt}`);
  console.log(`Reading time:    ${article_row_payload.reading_time} min`);
  console.log(`Tags:            ${article_row_payload.tags}`);
  console.log(`is_published:    ${article_row_payload.is_published}`);
  console.log(`image_url:       ${article_row_payload.image_url}`);
  console.log(`Content length:  ${article_row_payload.content.length} chars`);
  console.log('');
  console.log('--- Schema Validation ---');
  console.log(`Matches articles schema: ${quality.matches_articles_schema}`);
  console.log(`All required fields:     ${quality.all_required_fields_present}`);
  console.log(`is_published false:      ${quality.is_published_false}`);
  console.log(`image_url null:          ${quality.image_url_null_until_generation}`);
  console.log(`Slug ASCII-hyphenated:   ${quality.slug_is_ascii_hyphenated}`);
  console.log(`No em dash:              ${!quality.contains_em_dash}`);
  console.log(`No old source URL:       ${!quality.old_source_url_publicly_exposed}`);
  console.log('');
  if (warnings.length > 0) {
    console.log('WARNINGS:');
    warnings.forEach(w => console.log(`  - ${w}`));
  } else {
    console.log('Warnings:        none');
  }
  console.log('');
  console.log(passed ? 'Result: READY FOR REVIEW' : 'Result: WARNINGS - review before insert');
  console.log('');
  console.log('NOT inserted into Supabase. NOT published. Queue status NOT updated.');
}

main();
