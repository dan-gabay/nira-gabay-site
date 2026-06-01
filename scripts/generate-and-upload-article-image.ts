#!/usr/bin/env tsx
/**
 * generate-and-upload-article-image.ts
 *
 * Phase 6 of the article import pipeline.
 *
 * Default mode: dry-run (prints planned actions, calls nothing).
 *
 * Usage:
 *   npm run generate:article-image                                           dry-run
 *   npm run generate:article-image -- --generate                             generate only
 *   npm run generate:article-image -- --generate --upload                    generate + upload
 *   npm run generate:article-image -- --generate --upload --update-payload   full run
 *   npm run generate:article-image -- --upload --local-file <path> --update-payload
 *
 * Optional flags:
 *   --provider openai          Image provider (default: openai)
 *   --output-format webp|png   Output format (default: png via dall-e-3; webp uses gpt-image-1)
 *   --quality high|medium|low  Quality level (default: high)
 *   --upsert                   Overwrite existing file in Supabase Storage
 *   --local-file <path>        Use existing local file instead of generating
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedFlags {
  generate: boolean;
  upload: boolean;
  updatePayload: boolean;
  upsert: boolean;
  dryRun: boolean;
  localFile: string | null;
  provider: string;
  outputFormat: string;
  quality: string;
}

interface ModelConfig {
  model: string;
  size: string;
  apiQuality: string;
  actualFormat: string;
  extension: string;
  supportsNegativePrompt: boolean;
}

interface ImageBriefGeneration {
  status: string;
  needs_generation: boolean;
  use_legacy_image: boolean;
  recommended_filename: string;
  recommended_storage_path: string;
  aspect_ratio: string;
  prompt: string;
  negative_prompt: string;
  alt_text: string;
  avoid: string[];
}

interface ImageBriefFutureAsset {
  local_path: string | null;
  public_url: string | null;
  supabase_storage_bucket: string;
  supabase_storage_path: string;
  ready_to_attach_to_article: boolean;
}

interface ImageBrief {
  article: { title: string; slug: string; canonical_url: string; };
  image_generation: ImageBriefGeneration;
  future_asset: ImageBriefFutureAsset;
  quality: { has_prompt: boolean; has_alt_text: boolean; uses_legacy_image: boolean; contains_em_dash: boolean; warnings: string[]; };
}

interface ImageResult {
  status: 'generated' | 'uploaded' | 'payload_updated' | 'dry_run';
  article_slug: string;
  local_path: string | null;
  bucket: string;
  storage_path: string;
  public_url: string | null;
  provider: string;
  model: string;
  actual_format: string;
  generated_at: string | null;
  uploaded_at: string | null;
  payload_updated_at: string | null;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), 'data');
const BRIEF_FILE = path.join(DATA_DIR, 'article-image-generation-brief.json');
const DRAFT_FILE = path.join(DATA_DIR, 'supabase-article-draft-payload.json');
const GENERATED_DIR = path.join(DATA_DIR, 'generated-images');
const RESULT_FILE = path.join(GENERATED_DIR, 'article-image-result.json');

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
    generate: hasFlag('--generate'),
    upload: hasFlag('--upload'),
    updatePayload: hasFlag('--update-payload'),
    upsert: hasFlag('--upsert'),
    dryRun: hasFlag('--dry-run'),
    localFile: flagValue('--local-file'),
    provider: flagValue('--provider') ?? 'openai',
    outputFormat: flagValue('--output-format') ?? 'png',
    quality: flagValue('--quality') ?? 'high',
  };
}

// ---------------------------------------------------------------------------
// Model selection
// ---------------------------------------------------------------------------

function selectModelConfig(flags: ParsedFlags): ModelConfig {
  // gpt-image-1 is the current OpenAI image model.
  // It supports native WebP output and returns base64 data directly.
  const wantsPng = flags.outputFormat === 'png';
  return {
    model: 'gpt-image-1',
    size: '1536x1024',  // 3:2 landscape - closest 16:9 for gpt-image-1
    apiQuality: flags.quality === 'low' ? 'low' : flags.quality === 'medium' ? 'medium' : 'high',
    actualFormat: wantsPng ? 'png' : 'webp',
    extension: wantsPng ? 'png' : 'webp',
    supportsNegativePrompt: false,
  };
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildFullPrompt(prompt: string, negativePrompt: string): string {
  // Neither dall-e-3 nor gpt-image-1 supports a separate negative_prompt param.
  // Incorporate the most important avoids into the positive prompt.
  const keyAvoids = negativePrompt
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 16)
    .join(', ');
  return `${prompt} Strictly avoid in the image: ${keyAvoids}.`;
}

// ---------------------------------------------------------------------------
// OpenAI image generation
// ---------------------------------------------------------------------------

async function callOpenAI(
  prompt: string,
  negativePrompt: string,
  modelConfig: ModelConfig
): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not set.\n' +
      'Add it to .env.local: OPENAI_API_KEY=sk-...'
    );
  }

  const fullPrompt = buildFullPrompt(prompt, negativePrompt);

  // gpt-image-1: returns b64_json directly, supports output_format and quality
  const requestBody: Record<string, unknown> = {
    model: 'gpt-image-1',
    prompt: fullPrompt,
    n: 1,
    size: modelConfig.size,
    quality: modelConfig.apiQuality,
    output_format: modelConfig.actualFormat,
  };

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({})) as Record<string, unknown>;
    const errMsg = (errBody as any).error?.message ?? response.statusText;
    throw new Error(`OpenAI API error (${response.status}): ${errMsg}`);
  }

  const data = await response.json() as { data: Array<{ b64_json?: string; url?: string }> };
  const item = data.data[0];
  if (!item) throw new Error('No image item in OpenAI response');

  if (item.b64_json) {
    return Buffer.from(item.b64_json, 'base64');
  }

  // Fallback: fetch from URL (dall-e-3 with response_format: url)
  if (item.url) {
    const imgResponse = await fetch(item.url);
    if (!imgResponse.ok) {
      throw new Error(`Failed to fetch image from OpenAI URL: ${imgResponse.statusText}`);
    }
    const arrayBuffer = await imgResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new Error('No b64_json or url in OpenAI response data');
}

// ---------------------------------------------------------------------------
// Supabase Storage upload
// ---------------------------------------------------------------------------

async function uploadToStorage(
  fileBuffer: Buffer,
  storagePath: string,
  contentType: string,
  bucket: string,
  upsert: boolean
): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL is not set.\n' +
      'Add it to .env.local: NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co'
    );
  }
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set.\n' +
      'Add it to .env.local: SUPABASE_SERVICE_ROLE_KEY=...\n' +
      'Find it in your Supabase project: Settings > API > service_role key.'
    );
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, fileBuffer, { contentType, upsert });

  if (error) {
    const msg = error.message ?? '';
    if (/already exists|duplicate/i.test(msg)) {
      throw new Error(
        `File already exists at ${bucket}/${storagePath}.\n` +
        'Rerun with --upsert to overwrite, or delete the file in Supabase Storage.'
      );
    }
    if (/not found|bucket/i.test(msg)) {
      throw new Error(
        `Bucket "${bucket}" not found in Supabase Storage.\n` +
        'Create it: Supabase dashboard > Storage > New Bucket > name: "article-images" > Public ON.'
      );
    }
    throw new Error(`Supabase Storage upload failed: ${msg}`);
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return urlData.publicUrl;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function contentTypeForExtension(ext: string): string {
  const map: Record<string, string> = {
    webp: 'image/webp',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
  };
  return map[ext.toLowerCase()] ?? 'application/octet-stream';
}

function isoNow(): string {
  return new Date().toISOString();
}

function validateBrief(brief: ImageBrief): string[] {
  const warnings: string[] = [];
  if (!brief.image_generation.prompt) warnings.push('prompt is empty in brief');
  if (!brief.image_generation.alt_text) warnings.push('alt_text is empty in brief');
  if (brief.image_generation.use_legacy_image) warnings.push('use_legacy_image is true - should be false');
  if (brief.image_generation.prompt.includes('—')) warnings.push('em dash found in prompt');
  if (brief.image_generation.prompt.includes('m-y-net.co.il')) warnings.push('old source URL in prompt');
  if (!brief.image_generation.needs_generation) warnings.push('needs_generation is false in brief');
  return warnings;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const flags = parseFlags();
  const isEffectiveDryRun = !flags.generate && !flags.upload;
  const modelConfig = selectModelConfig(flags);

  console.log('');
  console.log('=== Phase 6: Article Image Generation and Upload ===');
  console.log('');

  // Read inputs
  if (!fs.existsSync(BRIEF_FILE)) {
    console.error(`ERROR: Missing ${BRIEF_FILE}`);
    console.error('Run npm run prepare:article-image (Phase 5) first.');
    process.exit(1);
  }
  if (!fs.existsSync(DRAFT_FILE)) {
    console.error(`ERROR: Missing ${DRAFT_FILE}`);
    console.error('Run npm run prepare:supabase-draft (Phase 4) first.');
    process.exit(1);
  }

  const brief: ImageBrief = JSON.parse(fs.readFileSync(BRIEF_FILE, 'utf-8'));
  const draft = JSON.parse(fs.readFileSync(DRAFT_FILE, 'utf-8'));

  const slug = brief.article.slug;
  const title = brief.article.title;
  const bucket = brief.future_asset.supabase_storage_bucket;
  const storagePath = brief.future_asset.supabase_storage_path;

  // Derive local output path (extension may differ from brief if using dall-e-3)
  const baseFilename = brief.image_generation.recommended_filename.replace(/\.[^.]+$/, '');
  const localFilename = `${baseFilename}.${modelConfig.extension}`;
  const defaultLocalPath = path.join(GENERATED_DIR, localFilename);
  const localOutputPath = flags.localFile
    ? path.resolve(flags.localFile)
    : defaultLocalPath;

  // Planned public URL (NEXT_PUBLIC_SUPABASE_URL is a public env var, safe to show)
  const supabaseProjectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '[NEXT_PUBLIC_SUPABASE_URL not set]';
  const plannedPublicUrl = `${supabaseProjectUrl}/storage/v1/object/public/${bucket}/${storagePath}`;

  // Validate brief
  const warnings = validateBrief(brief);

  // Print plan
  const modeLabel = isEffectiveDryRun
    ? 'DRY RUN (no generation, no upload)'
    : [
        flags.generate ? '--generate' : '',
        flags.upload ? '--upload' : '',
        flags.updatePayload ? '--update-payload' : '',
        flags.upsert ? '--upsert' : '',
        flags.localFile ? `--local-file ${flags.localFile}` : '',
      ].filter(Boolean).join(' ');

  console.log(`Mode:                   ${modeLabel}`);
  console.log('');
  console.log(`Title:                  ${title}`);
  console.log(`Slug:                   ${slug}`);
  console.log(`Planned provider:       ${flags.provider} (${modelConfig.model})`);
  console.log(`Planned size:           ${modelConfig.size}  [${brief.image_generation.aspect_ratio} target]`);
  console.log(`Planned format:         ${modelConfig.actualFormat}`);
  console.log(`Planned quality:        ${modelConfig.apiQuality}`);
  console.log('');
  const promptPreview = brief.image_generation.prompt.length > 160
    ? brief.image_generation.prompt.slice(0, 160) + '...'
    : brief.image_generation.prompt;
  console.log(`Prompt (preview):       ${promptPreview}`);
  console.log('');
  console.log(`Local output path:      ${localOutputPath}`);
  console.log(`Bucket:                 ${bucket}`);
  console.log(`Storage path:           ${storagePath}`);
  console.log(`Planned public URL:     ${plannedPublicUrl}`);
  console.log('');
  console.log(`Generation skipped:     ${!flags.generate}`);
  console.log(`Upload skipped:         ${!flags.upload}`);
  console.log(`Payload update skipped: ${!flags.updatePayload}`);
  console.log('');
  console.log('--- Validation ---');
  console.log(`prompt non-empty:       ${Boolean(brief.image_generation.prompt)}`);
  console.log(`alt_text non-empty:     ${Boolean(brief.image_generation.alt_text)}`);
  console.log(`use_legacy_image false: ${!brief.image_generation.use_legacy_image}`);
  console.log(`needs_generation true:  ${brief.image_generation.needs_generation}`);
  console.log(`contains_em_dash:       ${brief.quality.contains_em_dash}`);
  console.log(`no_old_source_url:      ${!brief.image_generation.prompt.includes('m-y-net.co.il')}`);
  console.log('');
  if (warnings.length > 0) {
    console.log('WARNINGS:');
    warnings.forEach(w => console.log(`  - ${w}`));
  } else {
    console.log('Warnings:               none');
  }
  console.log('');

  // Dry-run: write result and exit
  if (isEffectiveDryRun) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
    const result: ImageResult = {
      status: 'dry_run',
      article_slug: slug,
      local_path: null,
      bucket,
      storage_path: storagePath,
      public_url: null,
      provider: flags.provider,
      model: modelConfig.model,
      actual_format: modelConfig.actualFormat,
      generated_at: null,
      uploaded_at: null,
      payload_updated_at: null,
      warnings,
    };
    fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2), 'utf-8');

    console.log('Result:                 DRY RUN COMPLETE');
    console.log(`Result JSON:            ${RESULT_FILE}`);
    console.log('');
    console.log('Nothing was generated, uploaded, or changed. Next steps:');
    console.log('  Generate image:     npm run generate:article-image -- --generate');
    console.log('  Generate + upload:  npm run generate:article-image -- --generate --upload');
    console.log('  Full run:           npm run generate:article-image -- --generate --upload --update-payload');
    console.log('');
    console.log('Article NOT inserted into Supabase. Article NOT published.');
    return;
  }

  // ---- LIVE ACTIONS ----

  // Precondition checks
  if (flags.updatePayload && !flags.upload) {
    console.error('ERROR: --update-payload requires --upload to be passed as well.');
    process.exit(1);
  }
  if (flags.upload && !flags.generate && !flags.localFile) {
    if (!fs.existsSync(localOutputPath)) {
      console.error('ERROR: --upload requires --generate or --local-file <path>.');
      console.error(`No existing file found at: ${localOutputPath}`);
      process.exit(1);
    }
    console.log(`Using existing local file: ${localOutputPath}`);
  }

  let imageBuffer: Buffer | null = null;
  let actualLocalPath = localOutputPath;
  let generatedAt: string | null = null;
  let uploadedAt: string | null = null;
  let payloadUpdatedAt: string | null = null;
  let publicUrl: string | null = null;
  let status: ImageResult['status'] = 'dry_run';

  // ---- Generate ----
  if (flags.generate) {
    console.log(`Calling ${modelConfig.model} (${modelConfig.size}, ${modelConfig.apiQuality})...`);
    try {
      imageBuffer = await callOpenAI(
        brief.image_generation.prompt,
        brief.image_generation.negative_prompt,
        modelConfig
      );
      fs.mkdirSync(GENERATED_DIR, { recursive: true });
      fs.writeFileSync(localOutputPath, imageBuffer);
      generatedAt = isoNow();
      actualLocalPath = localOutputPath;
      status = 'generated';
      console.log(`Image saved: ${localOutputPath} (${imageBuffer.length} bytes)`);
    } catch (err) {
      console.error(`ERROR during image generation: ${(err as Error).message}`);
      process.exit(1);
    }
  }

  // ---- Upload ----
  if (flags.upload) {
    if (!imageBuffer) {
      if (!fs.existsSync(actualLocalPath)) {
        console.error(`ERROR: Local file not found: ${actualLocalPath}`);
        process.exit(1);
      }
      imageBuffer = fs.readFileSync(actualLocalPath);
    }
    const ext = path.extname(actualLocalPath).replace('.', '') || modelConfig.extension;
    const contentType = contentTypeForExtension(ext);
    console.log(`Uploading to ${bucket}/${storagePath} (${contentType})...`);
    try {
      publicUrl = await uploadToStorage(imageBuffer, storagePath, contentType, bucket, flags.upsert);
      uploadedAt = isoNow();
      status = 'uploaded';
      console.log(`Upload complete.`);
      console.log(`Public URL: ${publicUrl}`);
    } catch (err) {
      console.error(`ERROR during upload: ${(err as Error).message}`);
      process.exit(1);
    }
  }

  // ---- Update payload ----
  if (flags.updatePayload && publicUrl) {
    draft.article_row_payload.image_url = publicUrl;
    draft.private_import_metadata = draft.private_import_metadata ?? {};
    draft.private_import_metadata.image_asset = {
      bucket,
      storage_path: storagePath,
      public_url: publicUrl,
      generated_at: generatedAt,
      uploaded_at: uploadedAt,
    };
    // Safety gate: never flip is_published
    if (draft.article_row_payload.is_published !== false) {
      console.error('CRITICAL: is_published is not false - refusing to write updated payload.');
      process.exit(1);
    }
    fs.writeFileSync(DRAFT_FILE, JSON.stringify(draft, null, 2), 'utf-8');
    payloadUpdatedAt = isoNow();
    status = 'payload_updated';
    console.log(`Draft payload updated. image_url = ${publicUrl}`);
    console.log(`is_published:  ${draft.article_row_payload.is_published}  (confirmed false)`);
  }

  // ---- Write result ----
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  const result: ImageResult = {
    status,
    article_slug: slug,
    local_path: fs.existsSync(actualLocalPath) ? actualLocalPath : null,
    bucket,
    storage_path: storagePath,
    public_url: publicUrl,
    provider: flags.provider,
    model: modelConfig.model,
    actual_format: modelConfig.extension,
    generated_at: generatedAt,
    uploaded_at: uploadedAt,
    payload_updated_at: payloadUpdatedAt,
    warnings,
  };
  fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2), 'utf-8');

  console.log('');
  console.log(`Result:  ${status.toUpperCase()}`);
  console.log(`Result JSON:  ${RESULT_FILE}`);
  console.log('');
  console.log('Article NOT inserted into Supabase. Article NOT published.');
}

main().catch(err => {
  console.error(`\nFATAL: ${(err as Error).message}`);
  process.exit(1);
});
