// Punctuation normalization for Hebrew article text.
//
// The imported articles carry three sets of characters that the rest of the
// site does not use, left over from whatever editor the source was written in:
//
//   U+2013 EN DASH        – used as a spaced parenthetical dash (" – ") and,
//                           in one article, as a numeric range ("12–14").
//   U+2014 EM DASH        banned outright by CLAUDE.md. None are present
//                           today; it is mapped anyway so the rule is enforced
//                           by code rather than by memory.
//   U+201C/U+201D quotes  curly double quotes, where the other 28 articles use
//                           a straight ASCII quote. They are also used
//                           inconsistently - `ה”מגניבים”` opens with a closing
//                           quote - so flattening both to `"` fixes the pairing
//                           as a side effect.
//
// Two more sets exist and are deliberately OPT-IN, because neither is a
// mechanical call:
//
//   U+2018/U+2019   Reads as a quote, but in this corpus it is always a GERESH
//                   inside a word or after a Hebrew letter-numeral:
//                   טרנסג’נדרים, החבר’ה, כיתה י’, כיתה ד’. ASCII `'` is the
//                   common web convention; U+05F3 (׳) is the typographically
//                   correct mark. Enable with `geresh` once that is decided.
//   U+2026          A real ellipsis. "..." is not obviously better than "…".
//                   Enable with `ellipsis` if house style wants ASCII.
//
// U+05F3 (׳) and U+05F4 (״) are the proper Hebrew geresh and gershayim and are
// never touched - `בלו״ז` in parents-kids-summer-vacation-expectations is
// correct as written.

export type TypographyOptions = {
  /** Also map U+2018/U+2019 to an ASCII apostrophe. Off by default. */
  geresh?: boolean;
  /** Also map U+2026 to three ASCII dots. Off by default. */
  ellipsis?: boolean;
};

/** Always applied: the dashes and the curly double quotes. */
const BASE: ReadonlyArray<[RegExp, string]> = [
  [/[–—]/g, '-'],
  [/[“”]/g, '"'],
];

const GERESH: [RegExp, string] = [/[‘’]/g, "'"];
const ELLIPSIS: [RegExp, string] = [/…/g, '...'];

/** The characters this module removes, given the options in force. */
export function offendingPattern(options: TypographyOptions = {}): RegExp {
  let cls = '\\u2013\\u2014\\u201C\\u201D';
  if (options.geresh) cls += '\\u2018\\u2019';
  if (options.ellipsis) cls += '\\u2026';
  return new RegExp(`[${cls}]`, 'g');
}

export function normalizeTypography(text: string, options: TypographyOptions = {}): string {
  const rules = [...BASE];
  if (options.geresh) rules.push(GERESH);
  if (options.ellipsis) rules.push(ELLIPSIS);
  return rules.reduce((acc, [re, to]) => acc.replace(re, to), text);
}

/**
 * The write gate. Every replacement here swaps punctuation for punctuation, so
 * the letters and digits of the text must come through untouched and in the
 * same order. A transform that dropped a word, or that ate a Hebrew geresh as
 * if it were a quote, fails this.
 */
export function lettersAndDigitsUnchanged(before: string, after: string): boolean {
  const skeleton = (s: string) => s.replace(/[^\p{L}\p{N}]/gu, '');
  return skeleton(before) === skeleton(after);
}

/** True when the text still contains a character the options say to remove. */
export function hasOffendingChars(text: string, options: TypographyOptions = {}): boolean {
  return offendingPattern(options).test(text);
}

/** Count per character class, for dry-run reporting. */
export function countOffenders(text: string) {
  const n = (re: RegExp) => text.match(re)?.length ?? 0;
  return {
    enDash: n(/–/g),
    emDash: n(/—/g),
    curlyDouble: n(/[“”]/g),
    geresh: n(/[‘’]/g),
    ellipsis: n(/…/g),
  };
}
