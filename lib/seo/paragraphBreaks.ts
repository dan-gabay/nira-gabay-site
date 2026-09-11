// Restore blank-line paragraph breaks in article bodies.
//
// Why this exists: 15 published articles were stored with a single newline
// between paragraphs instead of a blank line. app/articles/[slug]/page.tsx
// renders the body with `remarkPlugins={[remarkBreaks]}`, which turns every
// soft line break into a <br> INSIDE the current <p> rather than starting a
// new one. Two consequences:
//
//   1. app/globals.css `.prose p { margin: 0.875rem 0 }` applies once per
//      block, so inside a section there is no paragraph spacing at all - just
//      a line break. Those 15 read markedly denser than the other 19.
//   2. For extraction and citation there are no paragraph boundaries. A whole
//      section arrives as one <p>; lib/seo/text.ts measures the same thing as
//      `longest_paragraph_chars` and reports 6,000-8,000 for these rows.
//
// The transform is whitespace-only. `textUnchanged` is the invariant that says
// so, and it is a write gate, not a comment.
//
// ON HEADINGS: an ATX heading already terminates at end of line, so a heading
// is its own block either way and `## כותרת\nטקסט` renders identically to
// `## כותרת\n\nטקסט`. Both choices are legal. This module normalizes heading
// boundaries too, for one reason: the other 19 articles - the ones that were
// stored correctly - put a blank line on both sides of every heading, and the
// Markdown representation at /api/md/* is served to crawlers that are not
// running remark. Matching the majority form is worth the extra byte.
//
// ON LINES THAT ARE NOT PROSE: a single newline is load-bearing inside a list
// (item to item), a blockquote, a table, indented or fenced code, and above a
// setext underline, where `טקסט\n---` is an <h2> and `טקסט\n\n---` is an <hr>.
// Those boundaries are left exactly as they are. That is not defensive
// programming for a hypothetical: three published articles
// (holiday-meal-family-dynamics, talking-to-children-current-events,
// parenting-without-boundaries-spoiled-children) carry their only single
// newlines between `- ` list items, and all 15 targets end with a `---` rule.

import { renderedHeadings } from './headingLevels';
import { stripToPlainText } from './text';

const FENCE = /^ {0,3}(```|~~~)/;

// A line whose line break carries meaning. Normalizing the newline above or
// below one of these would change what the parser builds, not just whitespace.
const LOAD_BEARING = [
  /^ {0,3}([-*+]|\d{1,9}[.)])(\s|$)/, // list item
  /^ {0,3}>/, // blockquote
  /^ {0,3}\|/, // table row
  /^ {0,3}(={1,}|-{1,}|\*{3,}|_{3,}) *$/, // setext underline or thematic break
  /^(\t| {4,})\S/, // indented code
  /^ {0,3}<[a-zA-Z!/?]/, // raw html block
  FENCE,
];

const isLoadBearing = (line: string) => LOAD_BEARING.some((re) => re.test(line));

/**
 * Insert a blank line between two consecutive non-blank lines, unless either
 * of them is a construct whose line break is load-bearing. Idempotent: the
 * output has no two adjacent normalizable lines left, so a second pass is a
 * no-op. Returns the input unchanged when nothing needs changing, so callers
 * can skip the write.
 */
export function normalizeParagraphBreaks(content: string): string {
  const lines = content.split('\n');
  const out: string[] = [];
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    out.push(line);

    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const next = lines[i + 1];
    if (next === undefined) continue;
    if (line === '' || next === '') continue;
    if (isLoadBearing(line) || isLoadBearing(next)) continue;

    out.push('');
  }

  const result = out.join('\n');
  return result === content ? content : result;
}

/**
 * The invariant: only whitespace may differ. Compares the two documents with
 * every whitespace run collapsed, so a transform that dropped, duplicated or
 * reordered so much as one word fails here. Not a length check - a length
 * check passes for a swap.
 */
export function textUnchanged(before: string, after: string): boolean {
  const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
  return collapse(before) === collapse(after);
}

/**
 * The complement to textUnchanged. Collapsing whitespace also collapses the
 * difference between a heading and the line under it, so that gate alone would
 * not notice a heading that stopped being one. This asserts the rendered
 * heading sequence - level and text, in order - is untouched.
 */
export function headingsUnchanged(before: string, after: string): boolean {
  const a = renderedHeadings(before);
  const b = renderedHeadings(after);
  if (a.length !== b.length) return false;
  return a.every((h, i) => h.level === b[i].level && h.text === b[i].text);
}

/**
 * The length of the longest <p> the article page actually renders, which is
 * what the density problem is measured in. Distinct from
 * lib/seo/text.ts longestParagraphChars(), which splits on blank lines only
 * and so reports one figure for a whole section: under remark-breaks a run of
 * single-newline lines is ONE <p> full of <br>s, and that is the run measured
 * here. Headings and thematic rules close a run; blank lines close a run.
 */
export function longestRenderedParagraphChars(content: string): number {
  return renderedParagraphs(content).reduce((max, p) => Math.max(max, p.length), 0);
}

/** How many <p> elements the body renders, for before/after reporting. */
export function renderedParagraphCount(content: string): number {
  return renderedParagraphs(content).length;
}

function renderedParagraphs(content: string): string[] {
  const out: string[] = [];
  let run: string[] = [];
  let inFence = false;

  const flush = () => {
    if (!run.length) return;
    const text = stripToPlainText(run.join(' '));
    if (text.length) out.push(text);
    run = [];
  };

  for (const line of content.split('\n')) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      flush();
      continue;
    }
    if (inFence) continue;

    // A heading or a rule is its own block and ends the run it interrupts.
    if (line === '' || /^ {0,3}#{1,6} /.test(line) || /^ {0,3}(-{3,}|\*{3,}|_{3,}) *$/.test(line)) {
      flush();
      continue;
    }
    run.push(line);
  }
  flush();

  return out;
}
