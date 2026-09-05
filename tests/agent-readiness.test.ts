// Tests for the agent-facing surface: Accept negotiation, the Markdown
// representation, the 404 body, llms.txt and the identity JSON-LD.
//
// Run with `npm test` (node:test via tsx - no test framework dependency).
//
// The negotiation tests are the point of this file. Content negotiation fails
// silently: a browser still gets its page, a person never notices, and the
// only symptom is that agents quietly receive the wrong representation. These
// cases are the ones a substring check gets wrong.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseAccept, negotiate, prefersMarkdown, HTML, MARKDOWN } from '@/lib/agent/accept';
import {
  aboutMarkdown,
  articleMarkdown,
  articlesIndexMarkdown,
  contactMarkdown,
  homeMarkdown,
  notFoundMarkdown,
  privacyMarkdown,
  serviceMarkdown,
  servicesIndexMarkdown,
} from '@/lib/agent/markdown';
import { personSchema, practiceSchema, webSiteSchema, PERSON_ID } from '@/lib/identitySchema';
import { SERVICES } from '@/lib/services';
import { PRIVACY_SECTIONS } from '@/lib/privacy';

// npm scripts run from the package root, which is where public/ lives.
const ROOT = process.cwd();

// ───────────────────────────────────────────────── Accept parsing

test('parseAccept sorts by q, then by specificity, then by input order', () => {
  const ranges = parseAccept('*/*;q=0.5, text/*;q=0.5, text/html;q=0.5, text/markdown');
  assert.deepEqual(
    ranges.map((r) => `${r.type}/${r.subtype}`),
    ['text/markdown', 'text/html', 'text/*', '*/*'],
  );
});

test('a missing or empty Accept header means anything is acceptable', () => {
  assert.equal(negotiate(null), HTML);
  assert.equal(negotiate(''), HTML);
  assert.equal(negotiate('   '), HTML);
  assert.equal(prefersMarkdown(null), false);
});

test('a real browser Accept header gets HTML', () => {
  const chrome =
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8';
  assert.equal(negotiate(chrome), HTML);
  assert.equal(prefersMarkdown(chrome), false);
});

test('curl and other */* clients get HTML, not a text file', () => {
  assert.equal(prefersMarkdown('*/*'), false);
});

test('the two cases a substring check gets backwards', () => {
  // Both headers contain the literal string "text/markdown". They mean
  // opposite things, and this is the whole reason accept.ts parses q-values.
  assert.equal(prefersMarkdown('text/html;q=0.9, text/markdown'), true);
  assert.equal(prefersMarkdown('text/markdown;q=0.5, text/html'), false);
});

test('a bare Accept: text/markdown gets markdown', () => {
  assert.equal(negotiate('text/markdown'), MARKDOWN);
  assert.equal(prefersMarkdown('text/markdown'), true);
});

test('q=0 rules a representation out', () => {
  assert.equal(prefersMarkdown('text/html;q=0, text/markdown;q=0.1'), true);
  // Everything the client will take is excluded, so nothing is negotiable.
  assert.equal(negotiate('text/html;q=0, text/markdown;q=0'), null);
});

test('text/x-markdown is honoured on the way in', () => {
  assert.equal(negotiate('text/x-markdown'), MARKDOWN);
});

test('a wildcard subtype falls to the server preference order', () => {
  assert.equal(negotiate('text/*'), HTML);
  assert.equal(negotiate('text/*', [MARKDOWN, HTML]), MARKDOWN);
});

test('media-type parameters do not break the parse', () => {
  assert.equal(prefersMarkdown('text/markdown;charset=utf-8;variant=GFM'), true);
  // A comma inside a quoted parameter value is not a media-range separator.
  assert.equal(prefersMarkdown('text/markdown;profile="a,b";q=1, text/html;q=0.1'), true);
});

test('a q parameter inside an accept-ext does not override the real one', () => {
  // The first q= ends the media-type parameters; anything after it is an
  // extension, so the trailing q=1 here must not win.
  assert.equal(prefersMarkdown('text/markdown;q=0.1;ext=x;q=1, text/html;q=0.5'), false);
});

test('a malformed q is treated as absent rather than as zero', () => {
  assert.equal(prefersMarkdown('text/markdown;q=banana'), true);
});

test('malformed media ranges are skipped, not fatal', () => {
  assert.deepEqual(parseAccept('nonsense, */html, text/markdown').map((r) => r.subtype), ['markdown']);
});

test('an unproduceable Accept falls back to HTML rather than 406', () => {
  // A deliberate choice, documented in accept.ts: RFC 7231 permits either, and
  // a 406 to an odd crawler costs a real page an index entry.
  assert.equal(prefersMarkdown('application/pdf'), false);
});

// ───────────────────────────────────────────────── 404 body

test('the 404 markdown names the path and the way out', () => {
  const md = notFoundMarkdown('/no/such/page');
  assert.match(md, /^# 404/m);
  assert.ok(md.includes('/no/such/page'), 'echoes the path that missed');
  for (const target of ['/llms.txt', '/sitemap.xml', '/articles', '/contact', '/services']) {
    assert.ok(md.includes(target), `404 body points at ${target}`);
  }
});

// ───────────────────────────────────────────────── markdown documents

const DOCS: Array<[string, string]> = [
  ['home', homeMarkdown([])],
  ['about', aboutMarkdown()],
  ['contact', contactMarkdown()],
  ['privacy', privacyMarkdown()],
  ['services index', servicesIndexMarkdown()],
  ['articles index', articlesIndexMarkdown([])],
];

for (const [name, md] of DOCS) {
  test(`${name} markdown opens with a single H1 and ends with the recovery block`, () => {
    const h1s = md.split('\n').filter((l) => l.startsWith('# '));
    assert.equal(h1s.length, 1, `${name} should have exactly one H1`);
    assert.ok(md.startsWith('# '), `${name} should open with its H1`);
    assert.ok(md.includes('/llms.txt'), `${name} should point at llms.txt`);
    assert.ok(md.includes('/sitemap.xml'), `${name} should point at the sitemap`);
    assert.ok(md.endsWith('\n'), `${name} should end with a newline`);
  });
}

test('every service renders as markdown with its FAQ intact', () => {
  for (const service of SERVICES) {
    const md = serviceMarkdown(service);
    assert.ok(md.startsWith(`# ${service.title}`), `${service.slug} H1`);
    for (const faq of service.faq) {
      assert.ok(md.includes(faq.q), `${service.slug} keeps FAQ question: ${faq.q}`);
      assert.ok(md.includes(faq.a), `${service.slug} keeps FAQ answer`);
    }
    for (const section of service.sections) {
      assert.ok(md.includes(`## ${section.heading}`), `${service.slug} keeps ${section.heading}`);
    }
  }
});

test('article markdown passes the stored body through unchanged', () => {
  const body = '## כותרת פנימית\n\nפסקה ראשונה.\n\n- פריט\n- פריט נוסף';
  const md = articleMarkdown({
    slug: 'demo',
    title: 'כותרת המאמר',
    excerpt: 'תקציר',
    reading_time: 4,
    created_date: '2026-01-02T00:00:00Z',
    updated_date: null,
    tags: 'חרדה, הורות',
    content: body,
  });
  assert.ok(md.includes(body), 'the stored markdown is not re-encoded');
  assert.match(md, /^# כותרת המאמר/);
  assert.ok(md.includes('> תקציר'));
  assert.ok(md.includes('4 דקות קריאה'));
  assert.ok(md.includes('נושאים: חרדה, הורות'));
  assert.ok(md.includes('https://www.niragabay.com/articles/demo'));
});

test('the privacy markdown carries every section of the policy', () => {
  const md = privacyMarkdown();
  for (const section of PRIVACY_SECTIONS) {
    assert.ok(md.includes(`## ${section.heading}`), `privacy markdown keeps ${section.heading}`);
  }
  // The trust-anchor threshold the audit measures against.
  assert.ok(md.length > 500, 'privacy policy is substantive');
});

// ───────────────────────────────────────────────── llms.txt

test('llms.txt tells an agent when to use the site and when not to', () => {
  const txt = readFileSync(join(ROOT, 'public/llms.txt'), 'utf8');
  assert.ok(txt.includes('## מתי להפנות לכאן'), 'Hebrew when-to-use section');
  assert.ok(txt.includes('## מתי לא להפנות לכאן'), 'Hebrew when-NOT-to-use section');
  assert.ok(txt.includes('## When to use this site'), 'English when-to-use section');
  assert.ok(txt.includes('## When not to use this site'), 'English when-NOT-to-use section');
  assert.ok(txt.includes('Accept: text/markdown'), 'documents machine access');
  assert.ok(txt.includes('/privacy'), 'links the privacy page');
});

test('llms.txt never presents Nira as a psychologist', () => {
  const txt = readFileSync(join(ROOT, 'public/llms.txt'), 'utf8');
  assert.ok(txt.includes('אינה פסיכולוגית קלינית'), 'states the limit in Hebrew');
  assert.ok(txt.includes('not** a clinical psychologist'), 'states the limit in English');
});

// ───────────────────────────────────────────────── JSON-LD identity

test('the Person node has the fields the audit asks for', () => {
  assert.equal(personSchema['@type'], 'Person');
  for (const field of ['name', 'description', 'url', 'jobTitle', 'sameAs', 'image'] as const) {
    assert.ok(personSchema[field], `Person.${field} is present`);
  }
  assert.ok(Array.isArray(personSchema.sameAs) && personSchema.sameAs.length >= 2);
  assert.match(personSchema.url, /^https:\/\/www\.niragabay\.com/);
});

test('person and practice resolve to one entity through @id', () => {
  assert.equal(personSchema['@id'], PERSON_ID);
  assert.equal(personSchema.worksFor['@id'], practiceSchema['@id']);
  assert.equal(practiceSchema.founder['@id'], PERSON_ID);
  assert.equal(webSiteSchema.publisher['@id'], PERSON_ID);
});

test('no schema claims the protected title "Psychologist"', () => {
  // חוק הפסיכולוגים: the title is regulated, and Nira is a psychotherapist.
  // This assertion exists so the type cannot drift back.
  const graph = JSON.stringify([personSchema, practiceSchema, webSiteSchema]);
  assert.ok(!graph.includes('"Psychologist"'), 'no @type: Psychologist anywhere');
  assert.equal(practiceSchema['@type'], 'ProfessionalService');
  assert.ok(personSchema.jobTitle.includes('פסיכותרפיה'));
});

// ───────────────────────────────────────────────── the Vary constant

test('the Vary value never loses an entry any layer depends on', async () => {
  const { VARY_VALUE } = await import('@/lib/agent/vary');
  const entries = VARY_VALUE.split(',').map((v) => v.trim().toLowerCase());
  // Accept is the point of the exercise; the four RSC names are what a naive
  // `Vary: Accept` wiped out in production on the 404 response.
  for (const required of [
    'accept',
    'accept-encoding',
    'rsc',
    'next-router-state-tree',
    'next-router-prefetch',
    'next-router-segment-prefetch',
  ]) {
    assert.ok(entries.includes(required), `Vary keeps ${required}`);
  }
});

test('all three layers emit the same Vary value', async () => {
  const { VARY_VALUE } = await import('@/lib/agent/vary');
  for (const file of ['proxy.ts', 'next.config.ts', 'app/api/md/[[...path]]/route.ts']) {
    const src = readFileSync(join(ROOT, file), 'utf8');
    assert.ok(src.includes('VARY_VALUE'), `${file} uses the shared constant`);
    assert.ok(
      !/Vary['"]?\s*[:,]\s*['"]Accept['"]/.test(src),
      `${file} does not hard-code a bare Vary: Accept`,
    );
  }
  assert.ok(VARY_VALUE.length > 0);
});
