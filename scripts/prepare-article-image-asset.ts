#!/usr/bin/env tsx
/**
 * prepare-article-image-asset.ts
 *
 * Phase 5 of the article import pipeline.
 * Reads data/article-ai-optimized-candidate.json and data/supabase-article-draft-payload.json
 * and produces data/article-image-generation-brief.json.
 *
 * Dry-run safe: reads and writes local files only.
 * Does NOT generate images. Does NOT upload anything. Does NOT insert into Supabase.
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Paths and constants
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), 'data');
const CANDIDATE_FILE = path.join(DATA_DIR, 'article-ai-optimized-candidate.json');
const DRAFT_FILE = path.join(DATA_DIR, 'supabase-article-draft-payload.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'article-image-generation-brief.json');

const CANONICAL_BASE = 'https://www.niragabay.com';
const STORAGE_BUCKET = 'article-images';

// ---------------------------------------------------------------------------
// Image prompt builder
// ---------------------------------------------------------------------------

function buildEnhancedPrompt(slug: string): string {
  // Builds a production-ready prompt for abstract editorial hero image generation.
  // Grounded in the birth-order/family-dynamics theme; adaptable for other slugs in future phases.
  // No text, no logos, no literal figures - abstract emotional storytelling only.
  const themeHints: Record<string, string> = {
    'birth-order-family-dynamics':
      'Three organic rounded forms of slightly different sizes, arranged at different heights across a warm neutral background. The forms softly overlap and lean toward each other, suggesting quiet connection and gentle hierarchy. One form is slightly larger and elevated, one mid-level, one smaller and lower - evoking different positions within a family system without depicting figures.',
    'default':
      'Two or three organic rounded forms in gentle proximity, softly overlapping, suggesting human connection and warmth without depicting figures.',
  };

  const themeClause = themeHints[slug] ?? themeHints['default'];

  return [
    'Abstract editorial illustration, horizontal 16:9 format.',
    themeClause,
    'Warm amber, aged ivory, and soft terracotta color palette with muted beige undertones.',
    'Smooth gradient lighting from slightly above and to the left, casting soft diffused shadows beneath each form.',
    'Each form has subtle dimensional texture suggesting warmth and presence.',
    'Generous negative space. Clean background in warm off-white or pale sand.',
    'Premium contemporary editorial style - suitable for a professional psychology and wellness publication.',
    'Flat to slightly dimensional rendering, no harsh lines.',
    'No text anywhere in the image. No human figures, faces, or body parts.',
    'No logos, icons, or symbols. No medical or clinical imagery.',
    'No stock illustration aesthetic. Emotionally calm, intelligent, sophisticated.',
  ].join(' ');
}

function buildNegativePrompt(): string {
  return [
    'text', 'words', 'letters', 'numbers', 'labels', 'captions',
    'logos', 'icons', 'symbols', 'watermarks', 'signature',
    'human figures', 'children', 'people', 'faces', 'hands', 'body parts',
    'medical imagery', 'clinical imagery', 'hospital', 'therapy couch', 'stethoscope',
    'dark imagery', 'violent imagery', 'fearful imagery', 'sad imagery',
    'dramatic contrast', 'neon colors', 'bright saturated colors', 'harsh lighting',
    'stock photo look', 'stock illustration look', 'cartoon style', 'childish illustration',
    'anime', 'manga', 'digital art cliche', '3D render', 'CGI',
    'old website branding', 'vintage look', 'retro style',
    'photo-realistic photography', 'blurry', 'low quality', 'distorted', 'artifact',
  ].join(', ');
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function containsEmDash(obj: unknown): boolean {
  if (typeof obj === 'string') return obj.includes('—');
  if (Array.isArray(obj)) return (obj as unknown[]).some(containsEmDash);
  if (typeof obj === 'object' && obj !== null) {
    return Object.values(obj as Record<string, unknown>).some(containsEmDash);
  }
  return false;
}

function containsOldSourceUrl(obj: unknown): boolean {
  if (typeof obj === 'string') return obj.includes('m-y-net.co.il');
  if (Array.isArray(obj)) return (obj as unknown[]).some(containsOldSourceUrl);
  if (typeof obj === 'object' && obj !== null) {
    return Object.values(obj as Record<string, unknown>).some(containsOldSourceUrl);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  // 1. Read inputs
  if (!fs.existsSync(CANDIDATE_FILE)) {
    console.error(`ERROR: Missing ${CANDIDATE_FILE}`);
    console.error('Run the Phase 3 AI optimization step first.');
    process.exit(1);
  }
  if (!fs.existsSync(DRAFT_FILE)) {
    console.error(`ERROR: Missing ${DRAFT_FILE}`);
    console.error('Run npm run prepare:supabase-draft (Phase 4) first.');
    process.exit(1);
  }

  const candidate = JSON.parse(fs.readFileSync(CANDIDATE_FILE, 'utf-8'));
  const draft = JSON.parse(fs.readFileSync(DRAFT_FILE, 'utf-8'));

  const articleData = candidate.article_candidate ?? candidate.optimized_article;
  const imageStrategy = candidate.image_strategy ?? {};
  const internalLinking = candidate.internal_linking ?? {};
  const seo = candidate.seo ?? {};

  const slug: string = String(articleData.slug ?? '');
  const title: string = String(articleData.title ?? '');
  const canonicalUrl = `${CANONICAL_BASE}/articles/${slug}`;
  const storagePath = `articles/${slug}/hero.webp`;
  const recommendedFilename = `${slug}-hero.webp`;

  // 2. Build prompt
  const prompt = buildEnhancedPrompt(slug);
  const negativePrompt = buildNegativePrompt();
  const altText: string = String(imageStrategy.image_alt ?? '');

  // 3. Build avoid list (merge existing strategy avoids with required defaults)
  const requiredAvoids = [
    'text inside image',
    'logos',
    'stock photo look',
    'literal children or faces unless specifically approved',
    'medical or clinical imagery',
    'dramatic sadness',
    'fearful imagery',
    'old website branding',
  ];
  const strategyAvoids: string[] = Array.isArray(imageStrategy.avoid) ? imageStrategy.avoid : [];
  const allAvoids = [...new Set([...strategyAvoids, ...requiredAvoids])];

  // 4. Quality checks
  const warnings: string[] = [];
  if (!prompt) warnings.push('prompt is empty');
  if (!altText) warnings.push('alt_text is empty - update image_strategy.image_alt in optimized candidate');
  if (!slug) warnings.push('slug is empty');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    warnings.push(`slug is not valid ASCII-hyphenated: "${slug}"`);
  }
  if (!/^[a-z0-9-]+\.webp$/.test(recommendedFilename)) {
    warnings.push(`recommended_filename is not valid: "${recommendedFilename}"`);
  }
  if (!canonicalUrl.startsWith('https://www.niragabay.com')) {
    warnings.push(`canonical_url must point to https://www.niragabay.com`);
  }

  const hasEmDash = containsEmDash({ prompt, negativePrompt, altText });
  if (hasEmDash) warnings.push('Em dash character found in prompt or alt text');

  const hasOldUrl = containsOldSourceUrl({ prompt, altText, storagePath });
  if (hasOldUrl) warnings.push('Old source URL (m-y-net.co.il) found in output');

  const containsTextInstruction =
    /\badd text\b|\binclude text\b|\bwith text\b/i.test(prompt);
  const containsLogoInstruction =
    /\badd logo\b|\binclude logo\b|\bwith logo\b/i.test(prompt);

  if (containsTextInstruction) warnings.push('Prompt appears to instruct adding text inside image');
  if (containsLogoInstruction) warnings.push('Prompt appears to instruct adding logo inside image');

  if (imageStrategy.use_legacy_image === true) {
    warnings.push('use_legacy_image is true in source strategy - overriding to false');
  }

  // 5. Assemble output
  const output = {
    article: {
      title,
      slug,
      canonical_url: canonicalUrl,
      topic_cluster: String(internalLinking.topic_cluster ?? ''),
      primary_category: String(internalLinking.primary_category ?? ''),
    },
    image_generation: {
      status: 'brief_prepared',
      needs_generation: true,
      use_legacy_image: false,
      recommended_filename: recommendedFilename,
      recommended_storage_path: storagePath,
      aspect_ratio: '16:9',
      usage: 'article_hero',
      prompt,
      negative_prompt: negativePrompt,
      alt_text: altText,
      style: {
        direction: 'modern abstract editorial illustration',
        mood: 'warm, calm, premium, professional, emotionally sensitive',
        palette: ['warm amber', 'ivory', 'soft terracotta', 'muted beige'],
        visual_language: 'organic shapes, soft gradients, subtle depth, sophisticated composition',
      },
      avoid: allAvoids,
    },
    future_asset: {
      local_path: null,
      public_url: null,
      supabase_storage_bucket: STORAGE_BUCKET,
      supabase_storage_path: storagePath,
      ready_to_attach_to_article: false,
    },
    quality: {
      has_prompt: Boolean(prompt),
      has_alt_text: Boolean(altText),
      uses_legacy_image: false,
      contains_text_instruction: containsTextInstruction,
      contains_logo_instruction: containsLogoInstruction,
      contains_em_dash: hasEmDash,
      no_old_source_url: !hasOldUrl,
      filename_is_ascii_hyphenated: /^[a-z0-9-]+\.webp$/.test(recommendedFilename),
      warnings,
    },
    prepared_at: new Date().toISOString(),
  };

  // 6. Write output
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');

  // 7. Console report
  const passed = warnings.length === 0;
  console.log('');
  console.log('=== Phase 5: Article Image Generation Brief ===');
  console.log('');
  console.log(`Output file:               ${OUTPUT_FILE}`);
  console.log(`Title:                     ${title}`);
  console.log(`Slug:                      ${slug}`);
  console.log(`Recommended filename:      ${recommendedFilename}`);
  console.log(`Storage path:              ${storagePath}`);
  console.log('');
  console.log('--- Prompt ---');
  console.log(prompt);
  console.log('');
  console.log('--- Negative Prompt ---');
  console.log(negativePrompt);
  console.log('');
  console.log('--- Alt Text ---');
  console.log(altText || '(empty - update image_strategy.image_alt)');
  console.log('');
  console.log('--- Quality Validation ---');
  console.log(`has_prompt:                ${output.quality.has_prompt}`);
  console.log(`has_alt_text:              ${output.quality.has_alt_text}`);
  console.log(`uses_legacy_image:         ${output.quality.uses_legacy_image}`);
  console.log(`contains_text_instruction: ${output.quality.contains_text_instruction}`);
  console.log(`contains_logo_instruction: ${output.quality.contains_logo_instruction}`);
  console.log(`contains_em_dash:          ${output.quality.contains_em_dash}`);
  console.log(`no_old_source_url:         ${output.quality.no_old_source_url}`);
  console.log(`filename_ascii_hyphenated: ${output.quality.filename_is_ascii_hyphenated}`);
  console.log('');
  if (warnings.length > 0) {
    console.log('WARNINGS:');
    warnings.forEach(w => console.log(`  - ${w}`));
  } else {
    console.log('Warnings:                  none');
  }
  console.log('');
  console.log(passed ? 'Result: IMAGE BRIEF READY' : 'Result: WARNINGS - review before generation');
  console.log('');
  console.log('Image NOT generated. Nothing uploaded. Supabase NOT updated.');
}

main();
