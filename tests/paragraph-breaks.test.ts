// Tests for the paragraph-break migration (lib/seo/paragraphBreaks.ts).
//
// Run with `npm test` (node:test via tsx - no test framework dependency).
//
// The load-bearing tests are the two write gates. This change IS visible,
// unlike the H1 -> H2 one, so what protects the 15 articles is not "it looks
// right" but the pair of properties: only whitespace differs (textUnchanged)
// and the heading sequence is identical (headingsUnchanged). Everything else
// here is about which boundaries the transform is allowed to touch.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeParagraphBreaks,
  textUnchanged,
  headingsUnchanged,
  longestRenderedParagraphChars,
  renderedParagraphCount,
} from '@/lib/seo/paragraphBreaks';

test('splits two adjacent prose lines into two paragraphs', () => {
  const before = 'פסקה ראשונה.\nפסקה שנייה.';
  assert.equal(normalizeParagraphBreaks(before), 'פסקה ראשונה.\n\nפסקה שנייה.');
});

test('is idempotent - a second pass changes nothing', () => {
  const before = 'אחת\nשתיים\nשלוש';
  const once = normalizeParagraphBreaks(before);
  assert.equal(normalizeParagraphBreaks(once), once);
  assert.equal(once, 'אחת\n\nשתיים\n\nשלוש');
});

test('content that already uses blank lines is returned byte-identical', () => {
  const before = '## כותרת\n\nפסקה.\n\nפסקה נוספת.\n';
  assert.equal(normalizeParagraphBreaks(before), before);
});

test('heading boundaries are normalized and the headings themselves untouched', () => {
  const before = '## כותרת\nטקסט אחרי הכותרת.\nעוד טקסט.\n## כותרת שנייה\nטקסט.';
  const after = normalizeParagraphBreaks(before);

  assert.equal(
    after,
    '## כותרת\n\nטקסט אחרי הכותרת.\n\nעוד טקסט.\n\n## כותרת שנייה\n\nטקסט.',
  );
  assert.ok(headingsUnchanged(before, after));
  assert.equal(after.match(/^## /gm)?.length, 2);
});

test('a **bold lead-in.** line becomes its own paragraph', () => {
  const before = 'פסקה רגילה.\n**מסר חשוב.** ההמשך של אותה שורה.\nפסקה אחרונה.';
  const after = normalizeParagraphBreaks(before);

  assert.equal(
    after,
    'פסקה רגילה.\n\n**מסר חשוב.** ההמשך של אותה שורה.\n\nפסקה אחרונה.',
  );
  assert.equal(renderedParagraphCount(after), 3);
});

test('list items stay tight - a blank line between them would loosen the list', () => {
  const before = 'לפני הרשימה:\n- פריט ראשון\n- פריט שני\n- פריט שלישי\nאחרי הרשימה.';
  const after = normalizeParagraphBreaks(before);

  // The item-to-item newlines survive; only the prose boundaries are opened.
  assert.equal(
    after,
    'לפני הרשימה:\n- פריט ראשון\n- פריט שני\n- פריט שלישי\nאחרי הרשימה.',
  );
});

test('a setext underline is never separated from the line it underlines', () => {
  // `טקסט\n---` is an <h2>; `טקסט\n\n---` is text followed by an <hr>.
  const before = 'כותרת סטקסט\n---\nטקסט אחרי.';
  assert.equal(normalizeParagraphBreaks(before), before);
});

test('a thematic rule already surrounded by blank lines is left alone', () => {
  const before = 'סוף הגוף.\n\n---\n\nשורת סיום.';
  assert.equal(normalizeParagraphBreaks(before), before);
});

test('blockquotes, tables and indented code keep their line breaks', () => {
  for (const before of [
    '> ציטוט ראשון\n> ציטוט שני',
    '| א | ב |\n| - | - |',
    'קוד:\n    const a = 1;\n    const b = 2;',
  ]) {
    assert.equal(normalizeParagraphBreaks(before), before);
  }
});

test('leaves the inside of a fenced code block alone', () => {
  const before = 'לפני.\n```\nשורה אחת\nשורה שתיים\n```\nאחרי.';
  const after = normalizeParagraphBreaks(before);

  assert.ok(after.includes('```\nשורה אחת\nשורה שתיים\n```'));
  assert.ok(textUnchanged(before, after));
});

test('textUnchanged catches a transform that drops a word', () => {
  const before = 'פסקה ראשונה שלמה.\nפסקה שנייה.';
  assert.ok(textUnchanged(before, normalizeParagraphBreaks(before)));
  assert.equal(textUnchanged(before, 'פסקה ראשונה.\n\nפסקה שנייה.'), false);
  // A swap keeps the length identical, which is why this is not a length check.
  assert.equal(textUnchanged('אחת שתיים', 'שתיים אחת'), false);
});

test('headingsUnchanged catches a heading that stopped being one', () => {
  const before = '## כותרת\nטקסט.';
  assert.equal(headingsUnchanged(before, 'כותרת\n\nטקסט.'), false);
  assert.ok(headingsUnchanged(before, normalizeParagraphBreaks(before)));
});

test('the rendered <p> is the whole single-newline run, then one line each', () => {
  // This is the density problem in miniature: before, remark-breaks renders
  // the three lines as one <p> full of <br>s.
  const before = '## סעיף\n' + 'א'.repeat(100) + '\n' + 'ב'.repeat(100) + '\n' + 'ג'.repeat(100);

  assert.equal(renderedParagraphCount(before), 1);
  assert.equal(longestRenderedParagraphChars(before), 302); // 3 x 100 + 2 joining spaces

  const after = normalizeParagraphBreaks(before);
  assert.equal(renderedParagraphCount(after), 3);
  assert.equal(longestRenderedParagraphChars(after), 100);
});
