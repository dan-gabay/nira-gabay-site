// Public entry point for the article SEO generate + validate flow.
//
//   const { package: pkg, validation } = generateAndValidateSeo(input);
//
// `pkg` carries every SEO field (seo_title, meta_description, slug, excerpt,
// tags, focus/secondary keywords, image prompt/alt, og fields, faq_json,
// schema_json, internal links, canonical_url). `validation` carries the
// findings (error/warn/info), a 0-100 seo_score, and content metrics.

import { SeoGenerateInput, SeoResult } from './types';
import { buildSeoPackage } from './generate';
import { validateSeoPackage } from './validate';

export * from './types';
export { buildSeoPackage, BRAND, CANONICAL_BASE } from './generate';
export { validateSeoPackage } from './validate';
export { htmlToMarkdown, looksLikeHtml } from './htmlToMarkdown';

export function generateAndValidateSeo(input: SeoGenerateInput): SeoResult {
  const pkg = buildSeoPackage(input);
  const validation = validateSeoPackage(pkg, input.content, input.existingArticles);
  return { package: pkg, validation };
}
