#!/usr/bin/env tsx
/**
 * final-check-and-publish-first-article.ts
 *
 * Final go-live check and conditional publish for the first imported article.
 *
 * Default: dry-run - runs all checks, prints readiness report, makes no changes.
 * Active:  --publish - runs all checks, publishes only if every required check passes.
 *
 * What is updated on publish: is_published = true, updated_date = now()
 * What is NEVER changed: title, slug, content, excerpt, tags, image_url, queue
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// ---------------------------------------------------------------------------
// Article identity (hardcoded - this script is for this article only)
// ---------------------------------------------------------------------------

const ARTICLE_ID   = '08179042-70f6-4f60-a6ab-de388d729a10';
const ARTICLE_SLUG = 'birth-order-family-dynamics';
const PUBLIC_URL   = 'https://www.niragabay.com/articles/birth-order-family-dynamics';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const DATA_DIR    = path.join(process.cwd(), 'data');
const RESULT_FILE = path.join(DATA_DIR, 'final-check-and-publish-result.json');
const PAYLOAD_FILE          = path.join(DATA_DIR, 'supabase-article-draft-payload.json');
const AI_OPTIMIZED_FILE     = path.join(DATA_DIR, 'article-ai-optimized-candidate.json');
const IMPORT_CANDIDATE_FILE = path.join(DATA_DIR, 'article-import-candidate.json');

// ---------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------

const DO_PUBLISH = process.argv.includes('--publish');
const DRY_RUN   = !DO_PUBLISH;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Checks {
  supabase_row_exists: boolean;
  single_row: boolean;
  id_matches: boolean;
  slug_matches: boolean;
  title_present: boolean;
  content_present: boolean;
  excerpt_present: boolean;
  old_source_url_not_public: boolean;
  no_editor_helper_text: boolean;
  no_em_dash: boolean;
  slug_is_valid: boolean;
  canonical_url_is_niragabay: boolean;
  duplicate_content_risk_low: boolean;
  payload_id_matches: boolean;
  payload_slug_matches: boolean;
  payload_is_published_false: boolean;
  payload_matches_db: boolean | null;
}

interface RunResult {
  mode: 'dry_run' | 'publish';
  status: 'ready' | 'published' | 'already_published' | 'failed';
  article_id: string;
  slug: string;
  title: string | null;
  public_url: string;
  is_published_before: boolean | null;
  is_published_after: boolean | null;
  image_url: string | null;
  required_checks_passed: boolean;
  checks: Checks;
  updated_fields: string[];
  published_at: string | null;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

function containsEmDash(value: string): boolean {
  return value.includes('—'); // em dash —
}

function containsOldSourceUrl(value: string): boolean {
  return value.includes('m-y-net.co.il');
}

function containsEditorHelperText(value: string): boolean {
  return value.includes('תומך ב-Markdown') || value.includes('תומך ב');
}

function checkPublicStringFields(
  row: Record<string, unknown>,
  fields: string[],
  predicate: (s: string) => boolean,
): boolean {
  for (const field of fields) {
    const v = row[field];
    if (typeof v === 'string' && predicate(v)) return true;
  }
  return false;
}

const PUBLIC_TEXT_FIELDS = [
  'title', 'slug', 'content', 'excerpt', 'tags',
  'created_by', 'meta_title', 'meta_description',
  'focus_keyword', 'canonical_url', 'status',
];

function imageUrlValid(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string' && v.startsWith('https://')) return true;
  return false;
}

function writeResult(result: RunResult): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Required check list (failure in any = block publish)
// ---------------------------------------------------------------------------

const REQUIRED: Array<keyof Checks> = [
  'supabase_row_exists',
  'single_row',
  'id_matches',
  'slug_matches',
  'title_present',
  'content_present',
  'excerpt_present',
  'old_source_url_not_public',
  'no_editor_helper_text',
  'no_em_dash',
  'slug_is_valid',
  'canonical_url_is_niragabay',
  'duplicate_content_risk_low',
  'payload_id_matches',
  'payload_slug_matches',
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const warnings: string[] = [];

  console.log('='.repeat(60));
  console.log('Final Check and Publish - First Article');
  console.log('='.repeat(60));
  console.log('Mode:    ', DRY_RUN ? 'dry-run' : 'publish');
  console.log('ID:      ', ARTICLE_ID);
  console.log('Slug:    ', ARTICLE_SLUG);
  console.log('URL:     ', PUBLIC_URL);
  console.log('');

  if (DRY_RUN) {
    console.log('[DRY-RUN] No Supabase writes will occur.');
    console.log('[DRY-RUN] Pass --publish to publish after dry-run passes.');
    console.log('');
  }

  // --- Initialize result ---
  const result: RunResult = {
    mode: DRY_RUN ? 'dry_run' : 'publish',
    status: 'failed',
    article_id: ARTICLE_ID,
    slug: ARTICLE_SLUG,
    title: null,
    public_url: PUBLIC_URL,
    is_published_before: null,
    is_published_after: null,
    image_url: null,
    required_checks_passed: false,
    checks: {
      supabase_row_exists: false,
      single_row: false,
      id_matches: false,
      slug_matches: false,
      title_present: false,
      content_present: false,
      excerpt_present: false,
      old_source_url_not_public: false,
      no_editor_helper_text: false,
      no_em_dash: false,
      slug_is_valid: false,
      canonical_url_is_niragabay: false,
      duplicate_content_risk_low: false,
      payload_id_matches: false,
      payload_slug_matches: false,
      payload_is_published_false: false,
      payload_matches_db: null,
    },
    updated_fields: [],
    published_at: null,
    warnings,
  };

  // --- Connect to Supabase ---
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('MISSING: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be in .env.local');
    process.exit(1);
  }
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);

  // ===========================================================================
  // A. SUPABASE ROW CHECKS
  // ===========================================================================

  console.log('--- A. Supabase row checks ---');

  // Query by id
  const { data: rowById, error: idError } = await supabase
    .from('articles')
    .select('*')
    .eq('id', ARTICLE_ID);

  // Query by slug (must agree)
  const { data: rowBySlug, error: slugError } = await supabase
    .from('articles')
    .select('id, slug, is_published')
    .eq('slug', ARTICLE_SLUG);

  if (idError || !rowById) {
    console.error('  Supabase query failed:', idError?.message ?? 'no response');
    writeResult(result);
    process.exit(1);
  }

  result.checks.supabase_row_exists = rowById.length > 0;
  result.checks.single_row          = rowById.length === 1;

  if (!result.checks.supabase_row_exists || !result.checks.single_row) {
    console.log('  supabase_row_exists:', result.checks.supabase_row_exists, rowById.length === 0 ? '(no rows found)' : '(' + rowById.length + ' rows!)');
    console.log('  single_row:         ', result.checks.single_row);
    console.error('  CRITICAL: Row does not exist or duplicate rows found. Cannot proceed.');
    writeResult(result);
    process.exit(1);
  }

  const row = rowById[0] as Record<string, unknown>;

  result.title              = (row.title as string) ?? null;
  result.is_published_before = row.is_published as boolean;
  result.image_url          = (row.image_url as string | null) ?? null;

  // --- Check: already published? ---
  if (row.is_published === true) {
    console.log('  is_published:  true (article is already published)');
    console.log('');
    result.status             = 'already_published';
    result.is_published_after = true;
    result.checks.supabase_row_exists = true;
    result.checks.single_row          = true;
    result.checks.id_matches  = (row.id === ARTICLE_ID);
    result.checks.slug_matches = (row.slug === ARTICLE_SLUG);
    result.required_checks_passed = true;
    warnings.push('Article is already published. is_published = true. No update performed.');
    writeResult(result);

    console.log('RESULT: Article is already live at ' + PUBLIC_URL);
    console.log('No action required.');
    console.log('Result:', RESULT_FILE);
    return;
  }

  // --- ID and slug match ---
  result.checks.id_matches   = row.id   === ARTICLE_ID;
  result.checks.slug_matches = row.slug === ARTICLE_SLUG;

  // Cross-check slug query
  if (!slugError && rowBySlug && rowBySlug.length === 1) {
    const slugRow = rowBySlug[0] as Record<string, unknown>;
    if (slugRow.id !== ARTICLE_ID) {
      warnings.push('Slug "' + ARTICLE_SLUG + '" resolves to a different id: ' + slugRow.id);
      result.checks.slug_matches = false;
    }
  }

  // --- Title, content, excerpt ---
  result.checks.title_present   = typeof row.title   === 'string' && (row.title as string).trim().length > 0;
  result.checks.content_present = typeof row.content === 'string' && (row.content as string).trim().length > 0;
  result.checks.excerpt_present = typeof row.excerpt === 'string' && (row.excerpt as string).trim().length > 0;

  // --- image_url: null or https ---
  const imageUrlIsValid = imageUrlValid(row.image_url);
  if (!imageUrlIsValid) {
    warnings.push('image_url is set but is not a valid https URL: ' + String(row.image_url));
  }
  if (row.image_url === null) {
    console.log('  image_url:     null (allowed for this publish)');
  }

  // --- No old source URL in public fields ---
  result.checks.old_source_url_not_public = !checkPublicStringFields(row, PUBLIC_TEXT_FIELDS, containsOldSourceUrl);
  if (!result.checks.old_source_url_not_public) {
    warnings.push('CRITICAL: Old source URL (m-y-net.co.il) found in public article fields');
  }

  // --- No editor helper text ---
  result.checks.no_editor_helper_text = !checkPublicStringFields(row, PUBLIC_TEXT_FIELDS, containsEditorHelperText);
  if (!result.checks.no_editor_helper_text) {
    warnings.push('CRITICAL: Editor helper text found in public article fields');
  }

  // --- No em dash ---
  result.checks.no_em_dash = !checkPublicStringFields(row, PUBLIC_TEXT_FIELDS, containsEmDash);
  if (!result.checks.no_em_dash) {
    warnings.push('CRITICAL: Em dash character found in public article fields');
  }

  // --- Slug format ---
  result.checks.slug_is_valid = validateSlug(ARTICLE_SLUG);

  // --- likes_count / views_count: valid numbers ---
  const likesOk  = typeof row.likes_count  === 'number' && row.likes_count  >= 0;
  const viewsOk  = typeof row.views_count  === 'number' && row.views_count  >= 0;
  if (!likesOk)  warnings.push('likes_count is not a valid non-negative number: ' + String(row.likes_count));
  if (!viewsOk)  warnings.push('views_count is not a valid non-negative number: ' + String(row.views_count));

  // Print A summary
  const aChecks = [
    ['supabase_row_exists', result.checks.supabase_row_exists],
    ['single_row',          result.checks.single_row],
    ['id_matches',          result.checks.id_matches],
    ['slug_matches',        result.checks.slug_matches],
    ['title_present',       result.checks.title_present],
    ['content_present',     result.checks.content_present],
    ['excerpt_present',     result.checks.excerpt_present],
    ['is_published_before', row.is_published],
    ['image_url_null_or_https', imageUrlIsValid],
    ['likes_count_valid',   likesOk],
    ['views_count_valid',   viewsOk],
    ['old_source_url_not_public', result.checks.old_source_url_not_public],
    ['no_editor_helper_text',    result.checks.no_editor_helper_text],
    ['no_em_dash',               result.checks.no_em_dash],
  ] as const;

  for (const [name, val] of aChecks) {
    const icon = val ? ' ' : '[!]';
    console.log('  ' + icon + ' ' + String(name).padEnd(28) + val);
  }

  // ===========================================================================
  // B. LOCAL PAYLOAD CHECKS
  // ===========================================================================

  console.log('');
  console.log('--- B. Local payload checks ---');

  // supabase-article-draft-payload.json
  if (!fs.existsSync(PAYLOAD_FILE)) {
    warnings.push('data/supabase-article-draft-payload.json not found');
    result.checks.payload_id_matches      = false;
    result.checks.payload_slug_matches    = false;
    result.checks.payload_is_published_false = false;
    console.log('  [!] payload file not found:', PAYLOAD_FILE);
  } else {
    const payload = JSON.parse(fs.readFileSync(PAYLOAD_FILE, 'utf-8'));
    const rp = payload.article_row_payload ?? {};

    result.checks.payload_id_matches      = rp.id   === ARTICLE_ID;
    result.checks.payload_slug_matches    = rp.slug === ARTICLE_SLUG;
    result.checks.payload_is_published_false = rp.is_published === false;

    // Content match (informational)
    const localContent = typeof rp.content === 'string' ? rp.content.trim() : null;
    const dbContent    = typeof row.content === 'string' ? (row.content as string).trim() : null;
    if (localContent !== null && dbContent !== null) {
      result.checks.payload_matches_db = localContent === dbContent;
      if (!result.checks.payload_matches_db) {
        warnings.push('Local payload content differs from DB content (article may have been edited after insert - this is informational only)');
      }
    }

    console.log('   payload_id_matches:          ', result.checks.payload_id_matches);
    console.log('   payload_slug_matches:         ', result.checks.payload_slug_matches);
    console.log('   payload_is_published_false:   ', result.checks.payload_is_published_false);
    console.log('   payload_matches_db:           ', result.checks.payload_matches_db, '(informational)');
  }

  // article-ai-optimized-candidate.json - duplicate_content_risk
  console.log('');
  console.log('--- B2. Duplicate content risk ---');

  if (!fs.existsSync(AI_OPTIMIZED_FILE)) {
    warnings.push('data/article-ai-optimized-candidate.json not found');
    result.checks.duplicate_content_risk_low = false;
    console.log('  [!] AI optimized candidate file not found');
  } else {
    const aiCandidate = JSON.parse(fs.readFileSync(AI_OPTIMIZED_FILE, 'utf-8'));
    const dcr = aiCandidate.duplicate_content_risk ?? {};

    const riskLow        = dcr.risk_level             === 'low';
    const rewriteSubst   = dcr.rewrite_depth           === 'substantial';
    const newIntro       = dcr.new_intro_added         === true;
    const newClosing     = dcr.new_closing_added       === true;
    const headings       = dcr.headings_rewritten      === true;
    const noParaphrase   = dcr.sentence_by_sentence_paraphrase === false;

    result.checks.duplicate_content_risk_low = riskLow && rewriteSubst && newIntro && newClosing && headings && noParaphrase;

    const dcrChecks = [
      ['risk_level = low',                  riskLow],
      ['rewrite_depth = substantial',       rewriteSubst],
      ['new_intro_added',                   newIntro],
      ['new_closing_added',                 newClosing],
      ['headings_rewritten',                headings],
      ['sentence_by_sentence_paraphrase = false', noParaphrase],
    ] as const;

    for (const [name, val] of dcrChecks) {
      const icon = val ? ' ' : '[!]';
      console.log('  ' + icon + ' ' + String(name).padEnd(38) + val);
    }

    if (!result.checks.duplicate_content_risk_low) {
      warnings.push('duplicate_content_risk does not meet all required criteria');
    }
  }

  // article-import-candidate.json (existence check only - informational)
  if (!fs.existsSync(IMPORT_CANDIDATE_FILE)) {
    warnings.push('data/article-import-candidate.json not found (informational - does not block publish)');
  }

  // ===========================================================================
  // C. SEO / SAFETY CHECKS
  // ===========================================================================

  console.log('');
  console.log('--- C. SEO and safety checks ---');

  result.checks.slug_is_valid = validateSlug(ARTICLE_SLUG);

  // Canonical URL check from local metadata
  let canonicalOk = false;
  if (fs.existsSync(PAYLOAD_FILE)) {
    const payload = JSON.parse(fs.readFileSync(PAYLOAD_FILE, 'utf-8'));
    const localCanonical = payload.private_import_metadata?.seo?.canonical_url ?? null;
    canonicalOk = localCanonical === 'https://www.niragabay.com/articles/' + ARTICLE_SLUG;
    if (!canonicalOk) {
      warnings.push('Local canonical_url does not match expected value. Found: ' + localCanonical);
    }
  }
  result.checks.canonical_url_is_niragabay = canonicalOk;

  // Canonical URL from articles row (if present)
  const dbCanonical = row.canonical_url as string | null;
  if (dbCanonical && !dbCanonical.startsWith('https://www.niragabay.com')) {
    warnings.push('DB canonical_url does not point to niragabay.com: ' + dbCanonical);
    result.checks.canonical_url_is_niragabay = false;
  }

  console.log('   slug_is_valid:              ', result.checks.slug_is_valid);
  console.log('   canonical_url_is_niragabay: ', result.checks.canonical_url_is_niragabay);
  console.log('   image_url null allowed:      true (no image required for first publish)');
  console.log('   no image required:           true');

  // ===========================================================================
  // REQUIRED CHECKS GATE
  // ===========================================================================

  const failing = REQUIRED.filter(k => result.checks[k] !== true);
  result.required_checks_passed = failing.length === 0;

  console.log('');
  console.log('--- Required checks summary ---');
  for (const k of REQUIRED) {
    const pass = result.checks[k] === true;
    console.log('  ' + (pass ? ' ' : '[!]') + ' ' + k.padEnd(34), pass ? 'PASS' : 'FAIL');
  }

  if (!result.required_checks_passed) {
    console.log('');
    console.log('RESULT: FAILED - ' + failing.length + ' required check(s) did not pass:');
    failing.forEach(k => console.log('  - ' + k));
    result.status = 'failed';

    if (warnings.length > 0) {
      console.log('');
      console.log('Warnings (' + warnings.length + '):');
      warnings.forEach(w => console.log('  [!] ' + w));
    }

    writeResult(result);
    process.exit(1);
  }

  console.log('');
  console.log('All required checks PASSED.');

  // ===========================================================================
  // DRY-RUN: report and exit
  // ===========================================================================

  if (DRY_RUN) {
    result.status = 'ready';

    console.log('');
    console.log('='.repeat(60));
    console.log('DRY-RUN RESULT: READY TO PUBLISH');
    console.log('='.repeat(60));
    console.log('Article:        ', result.title);
    console.log('ID:             ', ARTICLE_ID);
    console.log('Slug:           ', ARTICLE_SLUG);
    console.log('Public URL:     ', PUBLIC_URL);
    console.log('is_published:   ', result.is_published_before, '(currently)');
    console.log('image_url:      ', result.image_url);
    console.log('Required checks:', result.required_checks_passed ? 'ALL PASSED' : 'FAILED');

    if (warnings.length > 0) {
      console.log('');
      console.log('Warnings (' + warnings.length + '):');
      warnings.forEach(w => console.log('  [!] ' + w));
    }

    console.log('');
    console.log('To publish, run:');
    console.log('  npm.cmd run final:check-and-publish -- --publish');
    console.log('');
    console.log('This will update:');
    console.log('  is_published = true');
    console.log('  updated_date = ' + new Date().toISOString());
    console.log('');
    console.log('This will NOT change:');
    console.log('  title, slug, content, excerpt, tags, image_url');
    console.log('');
    console.log('Result:', RESULT_FILE);

    writeResult(result);
    return;
  }

  // ===========================================================================
  // PUBLISH
  // ===========================================================================

  console.log('');
  console.log('All required checks passed. Publishing...');
  const publishedAt = new Date().toISOString();

  const { data: updateData, error: updateError } = await supabase
    .from('articles')
    .update({
      is_published: true,
      updated_date: publishedAt,
    })
    .eq('id', ARTICLE_ID)
    .eq('slug', ARTICLE_SLUG)
    .eq('is_published', false)
    .select('id, slug, title, is_published, image_url, updated_date')
    .single();

  if (updateError || !updateData) {
    const msg = 'Publish update failed: ' + (updateError?.message ?? 'no data returned');
    console.error('  ERROR:', msg);
    result.status = 'failed';
    warnings.push(msg);
    writeResult(result);
    process.exit(1);
  }

  result.updated_fields = ['is_published', 'updated_date'];
  result.published_at   = publishedAt;

  // --- Verify ---
  const { data: verified, error: verifyError } = await supabase
    .from('articles')
    .select('id, slug, title, is_published, image_url')
    .eq('id', ARTICLE_ID)
    .single();

  if (verifyError || !verified) {
    const msg = 'Post-publish verification failed: ' + (verifyError?.message ?? 'row not found');
    console.error('  ERROR:', msg);
    result.status = 'failed';
    warnings.push(msg);
    writeResult(result);
    process.exit(1);
  }

  const v = verified as Record<string, unknown>;
  const idOk     = v.id          === ARTICLE_ID;
  const slugOk   = v.slug        === ARTICLE_SLUG;
  const titleOk  = v.title       === result.title;
  const pubOk    = v.is_published === true;
  const imgUnchanged = v.image_url === result.image_url;

  result.is_published_after = v.is_published as boolean;

  console.log('');
  console.log('--- Publish verification ---');
  console.log('  id match:       ', idOk);
  console.log('  slug match:     ', slugOk);
  console.log('  title match:    ', titleOk);
  console.log('  is_published:   ', v.is_published, '(must be true:', pubOk, ')');
  console.log('  image_url:      ', v.image_url, '(unchanged:', imgUnchanged, ')');

  if (!idOk || !slugOk || !pubOk) {
    const msg = 'Post-publish verification: one or more checks failed';
    result.status = 'failed';
    warnings.push(msg);
    console.error('  ERROR:', msg);
    writeResult(result);
    process.exit(1);
  }

  if (!titleOk) {
    warnings.push('Title changed unexpectedly after publish (was: "' + result.title + '", now: "' + String(v.title) + '")');
  }
  if (!imgUnchanged) {
    warnings.push('image_url changed unexpectedly after publish');
  }

  result.status = 'published';

  console.log('');
  console.log('='.repeat(60));
  console.log('PUBLISHED');
  console.log('='.repeat(60));
  console.log('Article:     ', result.title);
  console.log('URL:         ', PUBLIC_URL);
  console.log('Published at:', publishedAt);
  console.log('image_url:   ', result.image_url, '(null - image can be added later)');

  if (warnings.length > 0) {
    console.log('');
    console.log('Warnings (' + warnings.length + '):');
    warnings.forEach(w => console.log('  [!] ' + w));
  }

  console.log('');
  console.log('article_import_queue was NOT updated.');
  console.log('Result:', RESULT_FILE);
  console.log('='.repeat(60));

  writeResult(result);
}

main().catch((err: unknown) => {
  console.error('Fatal:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
