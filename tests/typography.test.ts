// Tests for the punctuation migration (lib/seo/typography.ts).
//
// Run with `npm test` (node:test via tsx - no test framework dependency).
//
// The cases that matter are the Hebrew ones. A naive "curly quotes to straight
// quotes" pass eats the geresh in טרנסג’נדרים and in כיתה י’, and a naive
// "normalize Hebrew punctuation" pass eats the gershayim in בלו״ז. Both are
// real strings from real published articles.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeTypography,
  lettersAndDigitsUnchanged,
  hasOffendingChars,
  countOffenders,
} from '@/lib/seo/typography';

test('spaced parenthetical en dash becomes a regular hyphen', () => {
  const before = 'לטעות זה אנושי – לא פגם באופי';
  assert.equal(normalizeTypography(before), 'לטעות זה אנושי - לא פגם באופי');
});

test('numeric range en dash becomes a regular hyphen', () => {
  assert.equal(normalizeTypography('(גילאי 12–14)'), '(גילאי 12-14)');
});

test('em dash is mapped too, so the CLAUDE.md rule is enforced by code', () => {
  assert.equal(normalizeTypography('א — ב'), 'א - ב');
  assert.equal(hasOffendingChars(normalizeTypography('א — ב')), false);
});

test('curly double quotes flatten, including a mispaired closing quote', () => {
  // Real string from addiction-teens-adults-how-to-cope: opens with U+201D.
  const before = '”מגניבים” ו“פגמים”';
  assert.equal(normalizeTypography(before), '"מגניבים" ו"פגמים"');
});

test('the geresh is left alone by default', () => {
  const before = 'טרנסג’נדרים בכיתה י’';
  assert.equal(normalizeTypography(before), before);
  assert.equal(normalizeTypography(before, { geresh: true }), "טרנסג'נדרים בכיתה י'");
});

test('the ellipsis is left alone by default', () => {
  const before = 'הוא עוד קטן…';
  assert.equal(normalizeTypography(before), before);
  assert.equal(normalizeTypography(before, { ellipsis: true }), 'הוא עוד קטן...');
});

test('the proper Hebrew gershayim is never touched', () => {
  // בלו״ז - U+05F4, correct as written.
  const before = 'עוד משימה בלו״ז המשפחתי';
  assert.equal(normalizeTypography(before, { geresh: true, ellipsis: true }), before);
});

test('letters and digits survive every enabled replacement', () => {
  const before = 'גילאי 12–14, “מושלמת”, טרנסג’נדרים, קטן…';
  const after = normalizeTypography(before, { geresh: true, ellipsis: true });
  assert.ok(lettersAndDigitsUnchanged(before, after));
  assert.equal(hasOffendingChars(after, { geresh: true, ellipsis: true }), false);
});

test('the gate catches a transform that drops a word', () => {
  assert.equal(lettersAndDigitsUnchanged('אחת שתיים שלוש', 'אחת שלוש'), false);
});

test('clean text is returned unchanged', () => {
  const before = 'פרידה קצרה וברורה - "אמא תחזור" - וזהו.';
  assert.equal(normalizeTypography(before, { geresh: true, ellipsis: true }), before);
});

test('counts report each class separately', () => {
  const c = countOffenders('א–ב “ג” ד’ה ו…');
  assert.deepEqual(c, { enDash: 1, emDash: 0, curlyDouble: 2, geresh: 1, ellipsis: 1 });
});
