#!/usr/bin/env tsx
/**
 * insert-supabase-article-draft.ts
 *
 * Phase 7 of the article import pipeline.
 * Inserts one article row into public.articles as an unpublished draft.
 *
 * Default mode: dry-run (validates payload and checks duplicates, does not insert).
 * --insert: performs the actual Supabase insert after all checks pass.
 *
 * Safety rules enforced at all times:
 * - is_published must be false
 * - image_url must be null
 * - Only public.articles columns are inserted
 * - No private import metadata is inserted
 * - No old source URL in payload
 * - No em dash in any string field
 * - Duplicate slug or id stops the run
 *
 * Usage:
 *   npm run insert:supabase-draft                                    dry-run
 *   npm run insert:supabase-draft -- --insert --allow-null-image     insert
 *   npm run insert:supabase-draft -- --insert --allow-null-image --expected-slug birth-order-family-dynamics
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// ---------------------------------------------------------------------------
// Paths and constants
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), 'data');
const INPUT_FILE = path.join(DATA_DIR, 'supabase-article-draft-payload.json');
const RESULT_FILE = path.join(DATA_DIR, 'supabase-article-draft-insert-result.json');
const ARTICLES_TABLE = 'articles';

// Exact whitelist of public.articles columns - matches schema confirmed in Phase 4.
const ALLOWED_COLUMNS = new Set([
  'id', 'title', 'slug', 'content', 'excerpt', 'image_url',
  'reading_time', 'likes_count', 'views_count', 'tags',
  'is_published', 'created_date', 'updated_date',
  'created_by_id', 'created_by', 'is_sample',
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedFlags {
  insert: boolean;
  allowNullImage: boolean;
  expectedSlug: string | null;
}

interface InsertResult {
  mode: 'dry_run' | 'insert';
  status: 'ready' | 'inserted' | 'failed';
  article_id: string;
  slug: string;
  title: string;
  is_published: false;
  image_url: null;
  duplicate_slug_found: boolean;
  duplicate_id_found: boolean;
  inserted_at: string | null;
  verified_after_insert: boolean | null;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Flag parsing
// ---------------------------------------------------------------------------

function parseFlags(): ParsedFlags {
  const args = process.argv.slice(2);
  const hasFlag = (f: string) => args.includes(f);
  const flagValue = (f: string): string | null => {
    const idx = args.indexOf(f);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
  };
  return {
    insert: hasFlag('--insert'),
    allowNullImage: hasFlag('--allow-null-image'),
    expectedSlug: flagValue('--expected-slug'),
  };
}

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------

function buildSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL is not set.\n' +
      'Add it to .env.local: NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co'
    );
  }
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set.\n' +
      'Add it to .env.local: SUPABASE_SERVICE_ROLE_KEY=eyJ...'
    );
  }
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function containsEmDash(value: unknown): boolean {
  if (typeof value === 'string') return value.includes('—');
  if (Array.isArray(value)) return (value as unknown[]).some(containsEmDash);
  if (typeof value === 'object' && value !== null) {
    return Object.values(value as Record<string, unknown>).some(containsEmDash);
  }
  return false;
}

function containsOldSourceUrl(value: unknown): boolean {
  if (typeof value === 'string') return value.includes('m-y-net.co.il');
  if (Array.isArray(value)) return (value as unknown[]).some(containsOldSourceUrl);
  if (typeof value === 'object' && value !== null) {
    return Object.values(value as Record<string, unknown>).some(containsOldSourceUrl);
  }
  return false;
}

interface ValidationReport {
  blockingErrors: string[];
  notes: string[];
}

function validatePayload(
  payload: Record<string, unknown>,
  flags: ParsedFlags
): ValidationReport {
  const blockingErrors: string[] = [];
  const notes: string[] = [];

  // Schema compliance
  const extraCols = Object.keys(payload).filter(k => !ALLOWED_COLUMNS.has(k));
  if (extraCols.length > 0) {
    blockingErrors.push(`Extra columns not in public.articles: ${extraCols.join(', ')}`);
  }
  const missingCols = [...ALLOWED_COLUMNS].filter(k => !(k in payload));
  if (missingCols.length > 0) {
    blockingErrors.push(`Missing required columns: ${missingCols.join(', ')}`);
  }

  // Required non-empty fields
  if (!payload.title) blockingErrors.push('title is empty');
  if (!payload.slug) blockingErrors.push('slug is empty');
  if (!payload.content) blockingErrors.push('content is empty');
  if (!payload.excerpt) blockingErrors.push('excerpt is empty');

  // Slug format
  if (payload.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(String(payload.slug))) {
    blockingErrors.push(`slug is not ASCII-hyphenated: "${payload.slug}"`);
  }

  // Expected slug match
  if (flags.expectedSlug && payload.slug !== flags.expectedSlug) {
    blockingErrors.push(
      `Slug mismatch: expected "${flags.expectedSlug}", got "${payload.slug}"`
    );
  }

  // Safety fields - must be exact values
  if (payload.is_published !== false) {
    blockingErrors.push(
      `is_published must be false - got: ${JSON.stringify(payload.is_published)}`
    );
  }
  if (payload.image_url !== null) {
    blockingErrors.push(
      `image_url must be null for this pipeline stage - got: ${JSON.stringify(payload.image_url)}`
    );
  }
  if (payload.likes_count !== 0) {
    blockingErrors.push(`likes_count must be 0 - got: ${payload.likes_count}`);
  }
  if (payload.views_count !== 0) {
    blockingErrors.push(`views_count must be 0 - got: ${payload.views_count}`);
  }

  // Forbidden content
  if (containsEmDash(payload)) {
    blockingErrors.push('Em dash character found in payload - use only normal hyphens');
  }
  if (containsOldSourceUrl(payload)) {
    blockingErrors.push('Old source URL (m-y-net.co.il) in article_row_payload - must not be in public fields');
  }

  // Informational notes
  if (payload.image_url === null && !flags.allowNullImage) {
    notes.push(
      'image_url is null - article will have no hero image until one is generated and uploaded. ' +
      'Pass --allow-null-image to suppress this note.'
    );
  }

  return { blockingErrors, notes };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const flags = parseFlags();
  const isEffectiveDryRun = !flags.insert;

  console.log('');
  console.log('=== Phase 7: Supabase Article Draft Insert ===');
  console.log('');
  console.log(`Mode:             ${isEffectiveDryRun ? 'DRY RUN (no insert)' : 'INSERT'}`);
  console.log('');

  // Read input file
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`ERROR: Missing ${INPUT_FILE}`);
    console.error('Run npm run prepare:supabase-draft (Phase 4) first.');
    process.exit(1);
  }

  const input = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  const payload = input.article_row_payload as Record<string, unknown> | undefined;

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    console.error('ERROR: article_row_payload not found or invalid in input file.');
    process.exit(1);
  }

  // Validate
  const { blockingErrors, notes } = validatePayload(payload, flags);

  // Print payload summary
  console.log(`Title:            ${payload.title}`);
  console.log(`Slug:             ${payload.slug}`);
  console.log(`ID:               ${payload.id}`);
  console.log(`is_published:     ${payload.is_published}`);
  console.log(`image_url:        ${payload.image_url}`);
  console.log(`reading_time:     ${payload.reading_time} min`);
  console.log(`likes_count:      ${payload.likes_count}`);
  console.log(`views_count:      ${payload.views_count}`);
  console.log(`is_sample:        ${payload.is_sample}`);
  console.log(`created_by:       ${payload.created_by}`);
  console.log(`content length:   ${String(payload.content ?? '').length} chars`);
  console.log('');

  // Print validation result
  if (blockingErrors.length > 0) {
    console.log('VALIDATION ERRORS (blocking):');
    blockingErrors.forEach(e => console.log(`  - ${e}`));
    console.log('');
  } else {
    console.log('Validation:       PASSED');
  }
  if (notes.length > 0) {
    notes.forEach(n => console.log(`Note: ${n}`));
    console.log('');
  }

  // Fail fast on blocking errors
  if (blockingErrors.length > 0) {
    const result: InsertResult = {
      mode: isEffectiveDryRun ? 'dry_run' : 'insert',
      status: 'failed',
      article_id: String(payload.id ?? ''),
      slug: String(payload.slug ?? ''),
      title: String(payload.title ?? ''),
      is_published: false,
      image_url: null,
      duplicate_slug_found: false,
      duplicate_id_found: false,
      inserted_at: null,
      verified_after_insert: null,
      warnings: blockingErrors,
    };
    fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2), 'utf-8');
    console.error('Result: FAILED - fix validation errors before inserting.');
    process.exit(1);
  }

  // Connect to Supabase for duplicate checks
  let supabase: SupabaseClient;
  try {
    supabase = buildSupabaseClient();
  } catch (err) {
    console.error(`ERROR: ${(err as Error).message}`);
    process.exit(1);
  }

  // Check duplicate slug
  const slug = String(payload.slug);
  console.log(`Checking duplicate slug: "${slug}"...`);
  const { data: slugRows, error: slugError } = await supabase
    .from(ARTICLES_TABLE)
    .select('id, title, slug')
    .eq('slug', slug)
    .limit(1);

  if (slugError) {
    console.error(`ERROR querying by slug: ${slugError.message}`);
    process.exit(1);
  }

  const duplicateSlugFound = (slugRows?.length ?? 0) > 0;
  if (duplicateSlugFound) {
    const ex = slugRows![0];
    console.log(`  DUPLICATE SLUG FOUND:`);
    console.log(`    Existing id:    ${ex.id}`);
    console.log(`    Existing title: ${ex.title}`);
    console.log(`    Existing slug:  ${ex.slug}`);
  } else {
    console.log(`  Slug is available.`);
  }

  // Check duplicate id
  const id = String(payload.id);
  console.log(`Checking duplicate id: "${id}"...`);
  const { data: idRows, error: idError } = await supabase
    .from(ARTICLES_TABLE)
    .select('id')
    .eq('id', id)
    .limit(1);

  if (idError) {
    console.error(`ERROR querying by id: ${idError.message}`);
    process.exit(1);
  }

  const duplicateIdFound = (idRows?.length ?? 0) > 0;
  if (duplicateIdFound) {
    console.log(`  DUPLICATE ID FOUND: ${id}`);
  } else {
    console.log(`  ID is available.`);
  }

  console.log('');

  const canProceed = !duplicateSlugFound && !duplicateIdFound;
  const allWarnings = [...blockingErrors, ...notes];

  // Dry-run exit
  if (isEffectiveDryRun) {
    const result: InsertResult = {
      mode: 'dry_run',
      status: canProceed ? 'ready' : 'failed',
      article_id: id,
      slug,
      title: String(payload.title),
      is_published: false,
      image_url: null,
      duplicate_slug_found: duplicateSlugFound,
      duplicate_id_found: duplicateIdFound,
      inserted_at: null,
      verified_after_insert: null,
      warnings: allWarnings,
    };
    fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2), 'utf-8');

    console.log(`Insert skipped:   true (dry-run)`);
    console.log(`Ready to insert:  ${canProceed}`);
    console.log('');

    if (canProceed) {
      console.log('Result: DRY RUN - payload is valid and ready for insert.');
      console.log('');
      console.log('To insert:');
      console.log('  npm run insert:supabase-draft -- --insert --allow-null-image');
    } else {
      if (duplicateSlugFound) console.log('Result: BLOCKED - duplicate slug exists.');
      if (duplicateIdFound) console.log('Result: BLOCKED - duplicate id exists.');
    }
    console.log(`Result JSON:      ${RESULT_FILE}`);
    console.log('');
    console.log('Nothing was inserted. article_import_queue not updated. Article not published.');
    return;
  }

  // ---- LIVE INSERT ----

  if (!canProceed) {
    const result: InsertResult = {
      mode: 'insert',
      status: 'failed',
      article_id: id,
      slug,
      title: String(payload.title),
      is_published: false,
      image_url: null,
      duplicate_slug_found: duplicateSlugFound,
      duplicate_id_found: duplicateIdFound,
      inserted_at: null,
      verified_after_insert: null,
      warnings: [
        ...(duplicateSlugFound ? [`Duplicate slug: ${slug}`] : []),
        ...(duplicateIdFound ? [`Duplicate id: ${id}`] : []),
      ],
    };
    fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2), 'utf-8');
    console.error('Result: FAILED - cannot insert due to duplicate.');
    process.exit(1);
  }

  // Build insert row - only allowed columns, never extra fields
  const rowToInsert: Record<string, unknown> = {};
  for (const col of ALLOWED_COLUMNS) {
    if (col in payload) rowToInsert[col] = payload[col];
  }

  // Final safety gate before touching the database
  if (rowToInsert.is_published !== false) {
    console.error('CRITICAL SAFETY CHECK FAILED: is_published is not false. Refusing to insert.');
    process.exit(1);
  }
  if (rowToInsert.image_url !== null) {
    console.error('CRITICAL SAFETY CHECK FAILED: image_url is not null. Refusing to insert.');
    process.exit(1);
  }

  console.log(`Inserting into public.articles...`);
  const { data: insertData, error: insertError } = await supabase
    .from(ARTICLES_TABLE)
    .insert(rowToInsert)
    .select('id, title, slug, is_published, image_url');

  if (insertError) {
    console.error(`ERROR inserting row: ${insertError.message}`);
    const result: InsertResult = {
      mode: 'insert',
      status: 'failed',
      article_id: id,
      slug,
      title: String(payload.title),
      is_published: false,
      image_url: null,
      duplicate_slug_found: false,
      duplicate_id_found: false,
      inserted_at: null,
      verified_after_insert: null,
      warnings: [`Insert error: ${insertError.message}`],
    };
    fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2), 'utf-8');
    process.exit(1);
  }

  const inserted = insertData?.[0];
  if (!inserted) {
    console.error('ERROR: Insert returned no data.');
    process.exit(1);
  }

  const insertedAt = new Date().toISOString();
  console.log(`Insert successful:`);
  console.log(`  id:           ${inserted.id}`);
  console.log(`  title:        ${inserted.title}`);
  console.log(`  slug:         ${inserted.slug}`);
  console.log(`  is_published: ${inserted.is_published}`);
  console.log(`  image_url:    ${inserted.image_url}`);
  console.log('');

  // Verify by re-reading
  console.log('Verifying inserted row...');
  const { data: verifyRows, error: verifyError } = await supabase
    .from(ARTICLES_TABLE)
    .select('id, slug, title, is_published, image_url')
    .eq('id', id)
    .limit(1);

  const verificationWarnings: string[] = [];
  let verified = false;

  if (verifyError || !verifyRows?.length) {
    verificationWarnings.push(
      `Verification failed: ${verifyError?.message ?? 'row not found after insert'}`
    );
  } else {
    const v = verifyRows[0];
    const checks = {
      idMatch: v.id === id,
      slugMatch: v.slug === slug,
      publishedFalse: v.is_published === false,
      imageNull: v.image_url === null,
    };
    verified = Object.values(checks).every(Boolean);
    console.log(`  id match:       ${checks.idMatch}`);
    console.log(`  slug match:     ${checks.slugMatch}`);
    console.log(`  is_published:   ${v.is_published}  (must be false: ${checks.publishedFalse})`);
    console.log(`  image_url:      ${v.image_url}  (must be null: ${checks.imageNull})`);
    console.log(`  Verified:       ${verified}`);
    if (!checks.idMatch) verificationWarnings.push('Verification: id mismatch');
    if (!checks.slugMatch) verificationWarnings.push('Verification: slug mismatch');
    if (!checks.publishedFalse) verificationWarnings.push('Verification: is_published is not false');
    if (!checks.imageNull) verificationWarnings.push('Verification: image_url is not null');
  }

  // Write result
  const finalResult: InsertResult = {
    mode: 'insert',
    status: 'inserted',
    article_id: inserted.id,
    slug: inserted.slug,
    title: inserted.title,
    is_published: false,
    image_url: null,
    duplicate_slug_found: false,
    duplicate_id_found: false,
    inserted_at: insertedAt,
    verified_after_insert: verified,
    warnings: [...allWarnings, ...verificationWarnings],
  };
  fs.writeFileSync(RESULT_FILE, JSON.stringify(finalResult, null, 2), 'utf-8');

  console.log('');
  console.log('Result:           INSERTED');
  console.log(`Verified:         ${verified}`);
  console.log(`Result JSON:      ${RESULT_FILE}`);
  console.log('');
  console.log('article_import_queue NOT updated. Article NOT published.');
}

main().catch(err => {
  console.error(`\nFATAL: ${(err as Error).message}`);
  process.exit(1);
});
