// Shared types for the article SEO generate + validate flow.
// Used by the import pipeline (scripts) and can be read by the app.

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface FaqSchema {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: Array<{
    '@type': 'Question';
    name: string;
    acceptedAnswer: { '@type': 'Answer'; text: string };
  }>;
}

export interface InternalLinkSuggestion {
  slug: string;
  title: string;
  anchor: string;
  reason: string;
  score: number;
}

// A BlogPosting-shaped object. Kept loose so the page can render it as-is.
export type SchemaJson = Record<string, unknown>;

export interface SeoPackage {
  seo_title: string;
  meta_title: string;
  meta_description: string;
  slug: string;
  excerpt: string;
  tags: string[];
  focus_keyword: string;
  secondary_keywords: string[];
  image_prompt: string;
  image_alt: string;
  og_title: string;
  og_description: string;
  faq_json: FaqSchema | null;
  schema_json: SchemaJson;
  internal_links: InternalLinkSuggestion[];
  canonical_url: string;
}

export type Severity = 'error' | 'warn' | 'info';

export interface SeoFinding {
  id: string;
  severity: Severity;
  message: string;
  value?: string | number;
}

export interface SeoValidationResult {
  passed: boolean; // true when there are no `error` findings
  score: number; // 0-100
  findings: SeoFinding[];
  metrics: {
    word_count: number;
    hebrew_letter_ratio: number;
    h2_count: number;
    has_h1: boolean;
    longest_paragraph_chars: number;
    avg_sentence_words: number;
  };
}

// A trimmed view of an existing published article, used for cannibalization
// and internal-link suggestions.
export interface ExistingArticleRef {
  slug: string;
  title: string;
  tags: string; // comma-separated, as stored
  focus_keyword: string | null;
}

export interface SeoGenerateInput {
  title: string;
  content: string; // markdown (preferred) or HTML
  excerpt: string | null;
  tags: string; // comma-separated, as the pipeline produces
  slug: string;
  createdDate: string; // ISO
  imagePrompt?: string;
  imageAlt?: string;
  imageConcept?: string;
  existingArticles: ExistingArticleRef[];
}

export interface SeoResult {
  package: SeoPackage;
  validation: SeoValidationResult;
}
