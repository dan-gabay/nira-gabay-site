import {
  SeoGenerateInput,
  SeoPackage,
  FaqEntry,
  FaqSchema,
  InternalLinkSuggestion,
  ExistingArticleRef,
} from './types';
import {
  stripToPlainText,
  truncateAtBoundary,
  buildSummary,
  extractHeadings,
  isQuestionHeading,
  contentTokens,
  tokenOverlap,
} from './text';
import { GENERIC_KEYWORDS } from './validate';

export const BRAND = 'נירה גבאי';
export const CANONICAL_BASE = 'https://www.niragabay.com';
const AUTHOR_URL = `${CANONICAL_BASE}/about`;
const PUBLISHER_LOGO =
  'https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/logo.png';

const TITLE_MAX = 60;
const DESC_MIN = 120;
const DESC_MAX = 158;

// Curated Hebrew topic vocabulary for this therapist site. Used to pick a
// focus keyword and secondary keywords from the article's own text - never
// invents terms that are not present in the content.
const HEBREW_TOPIC_TERMS = [
  'הדרכת הורים', 'טיפול זוגי', 'טיפול מיני', 'מיניות בריאה', 'ביטחון עצמי',
  'תקשורת זוגית', 'משבר זוגי', 'סדר לידה', 'דינמיקה משפחתית', 'ארוחת החג', 'שגרה',
  'חרדת בחינות', 'הורות',
  'פינוק ילדים', 'רגשות אשמה', 'אישיות נרקיסיסטית', 'נרקיסיזם',
  'קושי למצוא זוגיות', 'מפחדים להתחפש',
  'פסיכותרפיה', 'טיפול רגשי', 'גבולות', 'התבגרות', 'מתבגרים', 'התמכרות',
  'חרדה', 'דיכאון', 'זוגיות', 'תקשורת', 'יחסים', 'משפחה', 'הורים', 'ילדים',
  'אחים', 'בכור', 'רגשות', 'שינוי', 'אהבה', 'קשר', 'CBT', 'אדלר',
];

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    count++;
    i = haystack.indexOf(needle, i + needle.length);
  }
  return count;
}

function pickKeywords(title: string, plain: string): { focus: string; secondary: string[] } {
  const titleLc = title;
  const haystack = (title + ' ' + plain);

  const scored = HEBREW_TOPIC_TERMS
    .map((term) => {
      const inTitle = titleLc.includes(term) ? 1 : 0;
      const freq = countOccurrences(haystack, term);
      return { term, score: freq + inTitle * 5 };
    })
    .filter((t) => t.score > 0)
    // Longer (more specific) phrases win ties.
    .sort((a, b) => b.score - a.score || b.term.length - a.term.length);

  // De-duplicate substrings (e.g. keep "הדרכת הורים", drop bare "הורים").
  // Bare generic head terms (see GENERIC_KEYWORDS) are high-frequency in
  // almost any article on this site and would otherwise dominate by sheer
  // word count - they're only allowed to fill a slot once every specific
  // term has already been placed, so they never win the primary (focus)
  // slot unless literally nothing else matched.
  const chosen: string[] = [];
  for (const { term } of scored) {
    if (GENERIC_KEYWORDS.has(term)) continue;
    if (chosen.some((c) => c.includes(term) || term.includes(c))) continue;
    chosen.push(term);
    if (chosen.length >= 4) break;
  }
  if (chosen.length < 4) {
    for (const { term } of scored) {
      if (chosen.length >= 4) break;
      if (chosen.some((c) => c.includes(term) || term.includes(c))) continue;
      chosen.push(term);
    }
  }

  if (chosen.length === 0) {
    // Fallback: first two meaningful words of the title.
    const words = stripToPlainText(title).split(/\s+/).filter((w) => w.length >= 3);
    return { focus: words.slice(0, 2).join(' ') || title.trim(), secondary: [] };
  }
  return { focus: chosen[0], secondary: chosen.slice(1) };
}

function buildSeoTitle(title: string): string {
  const base = title.trim();
  const withBrand = `${base} | ${BRAND}`;
  if (withBrand.length <= TITLE_MAX) return withBrand;
  if (base.length <= TITLE_MAX) return base;
  return truncateAtBoundary(base, TITLE_MAX);
}

function buildMetaDescription(excerpt: string | null, plain: string): string {
  const clean = (excerpt ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length >= DESC_MIN && clean.length <= DESC_MAX + 12) {
    return buildSummary(clean, DESC_MAX);
  }
  // Build from the article body - whole sentences only, never a mid-clause cut.
  const built = buildSummary(plain, DESC_MAX);
  if (built.length >= 60) return built;
  // Last resort: whatever excerpt we had.
  return clean || built;
}

// Build FAQ entries from question-style headings and the text that follows
// them (real article content - no fabricated answers).
function buildFaq(content: string): FaqEntry[] {
  const headings = extractHeadings(content);
  if (headings.length === 0) return [];

  const entries: FaqEntry[] = [];
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    if (!isQuestionHeading(h.text)) continue;
    const start = h.index;
    const end = i + 1 < headings.length ? headings[i + 1].index : content.length;
    // Drop the heading line itself, keep the body.
    const block = content.slice(start, end).replace(/^[^\n]*\n/, '');
    const answer = truncateAtBoundary(stripToPlainText(block), 320);
    if (answer.length < 40) continue;
    const question = h.text.endsWith('?') ? h.text : h.text + '?';
    entries.push({ question, answer });
    if (entries.length >= 6) break;
  }
  return entries;
}

function faqToSchema(entries: FaqEntry[]): FaqSchema | null {
  if (entries.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((e) => ({
      '@type': 'Question',
      name: e.question,
      acceptedAnswer: { '@type': 'Answer', text: e.answer },
    })),
  };
}

// Descriptive anchor for a link target: prefer the keyword phrase from the
// hand-written meta_title (brand suffix stripped, pre-colon part when long
// enough) over the full editorial title.
export function deriveAnchor(a: ExistingArticleRef): string {
  const mt = (a.meta_title || '').replace(/\s*\|\s*נירה גבאי\s*$/u, '').trim();
  if (mt) {
    const beforeColon = mt.split(':')[0].trim();
    return beforeColon.length >= 8 ? beforeColon : mt;
  }
  return a.title;
}

export function suggestInternalLinks(
  title: string,
  plain: string,
  tags: string[],
  existing: ExistingArticleRef[],
): InternalLinkSuggestion[] {
  const myTokens = contentTokens(title + ' ' + plain);
  const myTags = new Set(tags.map((t) => t.trim()).filter(Boolean));

  // Only published articles are valid link targets - the article page filters
  // unpublished slugs at render time anyway, so suggesting drafts wastes slots.
  const scored = existing
    .filter((a) => a.is_published)
    .map((a) => {
      const theirTags = (a.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
      const sharedTags = theirTags.filter((t) => myTags.has(t)).length;
      const overlap = tokenOverlap(myTokens, contentTokens(a.title));
      const score = sharedTags * 3 + overlap * 10;
      const reason =
        sharedTags > 0
          ? `${sharedTags} תגיות משותפות`
          : 'חפיפה נושאית בכותרת';
      return { slug: a.slug, title: a.title, anchor: deriveAnchor(a), reason, score };
    })
    .filter((s) => s.score > 0.5)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 3);
}

function buildSchemaJson(params: {
  title: string;
  description: string;
  slug: string;
  canonical: string;
  createdDate: string;
  keywords: string[];
  plain: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: params.title,
    description: params.description,
    inLanguage: 'he-IL',
    datePublished: params.createdDate,
    dateModified: params.createdDate,
    mainEntityOfPage: { '@type': 'WebPage', '@id': params.canonical },
    author: {
      '@type': 'Person',
      name: BRAND,
      jobTitle: 'מטפלת בפסיכותרפיה ומדריכת הורים',
      url: AUTHOR_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'נירה גבאי - פסיכותרפיה והדרכת הורים',
      logo: { '@type': 'ImageObject', url: PUBLISHER_LOGO },
    },
    keywords: params.keywords.join(', '),
  };
}

export function buildSeoPackage(input: SeoGenerateInput): SeoPackage {
  const plain = stripToPlainText(input.content);
  const tags = input.tags.split(',').map((t) => t.trim()).filter(Boolean);

  const { focus, secondary } = pickKeywords(input.title, plain);
  const seo_title = buildSeoTitle(input.title);
  // A hand-written meta description (e.g. from Claude Code's editorial
  // rewrite) always wins - it reads better than anything derived mechanically.
  const meta_description = (input.metaDescription ?? '').trim() || buildMetaDescription(input.excerpt, plain);
  const canonical_url = `${CANONICAL_BASE}/articles/${input.slug}`;

  const faqEntries = buildFaq(input.content);
  const faq_json = faqToSchema(faqEntries);

  const schema_json = buildSchemaJson({
    title: input.title,
    description: meta_description,
    slug: input.slug,
    canonical: canonical_url,
    createdDate: input.createdDate,
    keywords: [focus, ...secondary],
    plain,
  });

  const internal_links = suggestInternalLinks(input.title, plain, tags, input.existingArticles);

  const excerpt = (input.excerpt ?? '').trim() || buildSummary(plain, 220);

  return {
    seo_title,
    meta_title: seo_title,
    meta_description,
    slug: input.slug,
    excerpt,
    tags,
    focus_keyword: focus,
    secondary_keywords: secondary,
    image_prompt: input.imagePrompt ?? '',
    image_alt: input.imageAlt ?? '',
    og_title: input.title.trim(),
    og_description: meta_description,
    faq_json,
    schema_json,
    internal_links,
    canonical_url,
  };
}
