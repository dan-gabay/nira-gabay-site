// Format-agnostic text helpers. Content may be Markdown or HTML; these work
// on either by treating markdown heading syntax and html heading tags alike.

const HEBREW_RANGE = /[֐-׿]/;
const HEBREW_GLOBAL = /[֐-׿]/g;
const LETTER_GLOBAL = /[֐-׿A-Za-z]/g;

// Hebrew question openers, used to detect FAQ-style headings.
export const HEBREW_QUESTION_WORDS = [
  'איך', 'מה', 'למה', 'מדוע', 'האם', 'מתי', 'איפה', 'כמה', 'מי', 'כיצד', 'לאן', 'מאיפה',
];

export interface Heading {
  level: number;
  text: string;
  index: number; // character offset in the source content
}

export function stripToPlainText(content: string): string {
  let t = content;
  // Remove fenced code and inline html tags.
  t = t.replace(/<[^>]+>/g, ' ');
  // Markdown headings, emphasis, links, images, lists, blockquotes.
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, ' '); // images
  t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1'); // links -> text
  t = t.replace(/^#{1,6}\s+/gm, ''); // heading markers
  t = t.replace(/^[\s>*-]+/gm, ' '); // list/blockquote markers
  t = t.replace(/[*_`~]/g, ''); // emphasis marks
  // Decode the few HTML entities we are likely to meet.
  t = t
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&[a-z]+;/gi, ' ');
  return t.replace(/\s+/g, ' ').trim();
}

export function extractHeadings(content: string): Heading[] {
  const headings: Heading[] = [];

  // Markdown ATX headings.
  const mdRe = /^(#{1,6})\s+(.+?)\s*#*\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = mdRe.exec(content)) !== null) {
    headings.push({ level: m[1].length, text: m[2].trim(), index: m.index });
  }

  // HTML heading tags.
  const htmlRe = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  while ((m = htmlRe.exec(content)) !== null) {
    headings.push({
      level: parseInt(m[1], 10),
      text: m[2].replace(/<[^>]+>/g, '').trim(),
      index: m.index,
    });
  }

  return headings.sort((a, b) => a.index - b.index);
}

export function isQuestionHeading(text: string): boolean {
  const t = text.trim();
  if (t.includes('?')) return true;
  return HEBREW_QUESTION_WORDS.some((w) => t.startsWith(w + ' ') || t === w);
}

export function wordCount(plain: string): number {
  return plain.split(/\s+/).filter(Boolean).length;
}

export function hebrewLetterRatio(plain: string): number {
  const letters = plain.match(LETTER_GLOBAL)?.length ?? 0;
  if (letters === 0) return 0;
  const hebrew = plain.match(HEBREW_GLOBAL)?.length ?? 0;
  return hebrew / letters;
}

export function hasHebrew(text: string): boolean {
  return HEBREW_RANGE.test(text);
}

export function splitSentences(plain: string): string[] {
  return plain
    .split(/(?<=[.!?])\s+|[\n\r]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function avgSentenceWords(plain: string): number {
  const sentences = splitSentences(plain);
  if (sentences.length === 0) return 0;
  const total = sentences.reduce((sum, s) => sum + wordCount(s), 0);
  return total / sentences.length;
}

// Paragraph blocks: split on blank lines (markdown) or </p>/<br> boundaries.
export function paragraphs(content: string): string[] {
  const htmlNormalized = content
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n');
  return htmlNormalized
    .split(/\n{2,}/)
    .map((p) => stripToPlainText(p))
    .filter((p) => p.length > 0);
}

export function longestParagraphChars(content: string): number {
  return paragraphs(content).reduce((max, p) => Math.max(max, p.length), 0);
}

// Truncate to a max length at the last sentence or word boundary, no mid-word cut.
export function truncateAtBoundary(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const lastSentence = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('? '),
    slice.lastIndexOf('! '),
  );
  if (lastSentence >= max * 0.6) return slice.slice(0, lastSentence + 1).trim();
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim();
}

// Tokenize Hebrew/Latin words for overlap scoring, dropping short stopwords.
const STOPWORDS = new Set([
  'של', 'את', 'על', 'עם', 'אל', 'כי', 'גם', 'כל', 'לא', 'הוא', 'היא', 'הם', 'הן',
  'זה', 'זו', 'אבל', 'או', 'אם', 'יש', 'אין', 'מה', 'מי', 'איך', 'כמו', 'כדי',
  'אני', 'אתה', 'אתם', 'אנחנו', 'שלי', 'שלך', 'שלנו', 'יותר', 'מאוד', 'רק',
  'and', 'the', 'for', 'with', 'that', 'this', 'are', 'was',
]);

export function contentTokens(text: string): string[] {
  return stripToPlainText(text)
    .toLowerCase()
    .split(/[^֐-׿a-z0-9]+/i)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

// Jaccard overlap of two token sets.
export function tokenOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : inter / union;
}
