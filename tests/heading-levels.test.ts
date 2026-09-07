// Tests for the H1 -> H2 body migration (lib/seo/headingLevels.ts).
//
// Run with `npm test` (node:test via tsx - no test framework dependency).
//
// The load-bearing test is `renderedOutputUnchanged`: the whole case for
// running this migration on 19 published articles is that a reader sees
// nothing change, because app/articles/[slug]/page.tsx already renders `# ` as
// an <h2>. If that property does not hold, the migration is not safe.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  demoteH1ToH2,
  renderedHeadings,
  renderedOutputUnchanged,
  hasInBodyAside,
} from '@/lib/seo/headingLevels';

test('demotes H1 to H2 and leaves every other level alone', () => {
  const before = '# פתיחה\n\nטקסט\n\n## תת סעיף\n\n### עומק\n\n# עוד סעיף';
  const after = demoteH1ToH2(before);

  assert.equal(after, '## פתיחה\n\nטקסט\n\n## תת סעיף\n\n### עומק\n\n## עוד סעיף');
  assert.equal(after.match(/^# /gm), null);
});

test('adds exactly one character per H1 and changes nothing else', () => {
  const before = '# אחת\nטקסט\n# שתיים\n# שלוש';
  const after = demoteH1ToH2(before);

  assert.equal(after.length, before.length + 3);
  assert.equal(after.replace(/^## /gm, '# '), before);
});

test('a reader sees the identical heading sequence before and after', () => {
  const before = '# פתיחה\n\n## אמצע\n\n### עומק\n\n# סיום';
  assert.ok(renderedOutputUnchanged(before, demoteH1ToH2(before)));

  // Both levels render as h2, so the sequence is h2, h2, h3, h2 either way.
  assert.deepEqual(renderedHeadings(before), [
    { level: 2, text: 'פתיחה' },
    { level: 2, text: 'אמצע' },
    { level: 3, text: 'עומק' },
    { level: 2, text: 'סיום' },
  ]);
});

test('a transform that dropped a heading would be caught', () => {
  const before = '# אחת\n# שתיים\n# שלוש';
  assert.equal(renderedOutputUnchanged(before, '## אחת\n## שתיים'), false);
});

test('leaves headings inside fenced code blocks alone', () => {
  const before = '# כותרת\n\n```\n# not a heading\n```\n\n# עוד כותרת';
  const after = demoteH1ToH2(before);

  assert.ok(after.includes('\n# not a heading\n'));
  assert.equal(after.match(/^## /gm)?.length, 2);
  assert.equal(renderedHeadings(before).length, 2);
});

test('ignores a bare hash that is not a heading', () => {
  const before = '#לא כותרת\n\n# כן כותרת';
  const after = demoteH1ToH2(before);

  assert.ok(after.startsWith('#לא כותרת'));
  assert.equal(after.match(/^## /gm)?.length, 1);
});

test('the in-body aside appears only once three "\\n## " matches exist', () => {
  // Mirrors splitAtThirdH2(): a heading at index 0 has no preceding newline
  // and does not count, which is why an all-H1 article never qualifies.
  const allH1 = '# א\n\n# ב\n\n# ג\n\n# ד';
  assert.equal(hasInBodyAside(allH1), false);
  assert.equal(hasInBodyAside(demoteH1ToH2(allH1)), true);

  assert.equal(hasInBodyAside('## א\n\n## ב\n\n## ג'), false);
  assert.equal(hasInBodyAside('intro\n\n## א\n\n## ב\n\n## ג'), true);
});

test('content without H1 is returned untouched', () => {
  const before = '## רק\n\n## H2\n\n### כאן';
  assert.equal(demoteH1ToH2(before), before);
});
