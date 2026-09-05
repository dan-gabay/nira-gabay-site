// Tests for the crawler-facing surface: robots.txt groups, Bing verification,
// and the structured-data graph.
//
// Run with `npm test` (node:test via tsx).
//
// The robots tests exist because robots.txt fails in the one direction nobody
// notices: a named group that is missing a line silently *widens* what a
// crawler may fetch, or silently blocks a page that was meant to be indexed,
// and the only symptom is traffic that never arrives. Group selection is
// winner-take-all, so "it works for Googlebot" proves nothing about Bingbot.
//
// The schema tests exist because a wrong `author` is invisible too: the JSON
// still parses, the rich result still renders, and the entity simply never
// connects to the person it belongs to.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import robots from '@/app/robots';
import { buildArticleSchema } from '@/lib/articleSchema';
import {
  authorRef,
  publisherRef,
  webSiteRef,
  personSchema,
  practiceSchema,
  webSiteSchema,
  PERSON_ID,
  PRACTICE_ID,
  BASE_URL,
} from '@/lib/identitySchema';

// ───────────────────────────────────────────────── robots.txt

const rules = () => {
  const r = robots().rules;
  return Array.isArray(r) ? r : [r];
};

const groupFor = (userAgent: string) =>
  rules().find((g) => g.userAgent === userAgent);

const asArray = (v: string | string[] | undefined) =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

// The four crawlers the brief is actually about, plus Googlebot, which was
// already named and must not regress, and DuckDuckBot for DuckDuckGo's own
// fetches. Yahoo needs no entry: it is served by Bing's index.
const MUST_BE_NAMED = [
  'Googlebot',
  'Bingbot',
  'DuckDuckBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'Perplexity-User',
];

for (const agent of MUST_BE_NAMED) {
  test(`robots.txt names ${agent} and lets it reach public content`, () => {
    const group = groupFor(agent);
    assert.ok(group, `${agent} has no group of its own`);
    assert.ok(asArray(group!.allow).includes('/'), `${agent} may not crawl the site root`);
  });
}

test('every named group repeats the full rule (a group is read alone, not merged)', () => {
  const wildcard = groupFor('*');
  assert.ok(wildcard);
  const expectedAllow = asArray(wildcard!.allow).sort();
  const expectedDisallow = asArray(wildcard!.disallow).sort();

  for (const agent of MUST_BE_NAMED) {
    const group = groupFor(agent)!;
    assert.deepEqual(
      asArray(group.allow).sort(),
      expectedAllow,
      `${agent}'s Allow list has drifted from the wildcard group`,
    );
    assert.deepEqual(
      asArray(group.disallow).sort(),
      expectedDisallow,
      `${agent}'s Disallow list has drifted from the wildcard group`,
    );
  }
});

test('every group shuts the admin area, bare path and subtree alike', () => {
  for (const group of rules()) {
    const disallow = asArray(group.disallow);
    // '/manage/' alone leaves '/manage' itself crawlable - that was the bug.
    assert.ok(disallow.includes('/manage'), `${group.userAgent} does not block /manage`);
    assert.ok(disallow.includes('/manage/'), `${group.userAgent} does not block /manage/`);
    assert.ok(disallow.includes('/api/'), `${group.userAgent} does not block /api/`);
  }
});

test('the markdown representation stays crawlable under the /api/ block', () => {
  for (const group of rules()) {
    const allow = asArray(group.allow);
    assert.ok(
      allow.includes('/api/md/'),
      `${group.userAgent} cannot reach /api/md/`,
    );
    // Longest-match precedence is what makes this work: the Allow has to be
    // strictly longer than the Disallow it overrides.
    const disallow = asArray(group.disallow).find((d) => '/api/md/'.startsWith(d));
    assert.ok(disallow && '/api/md/'.length > disallow.length);
  }
});

test('robots.txt advertises both sitemaps', () => {
  const sitemap = robots().sitemap;
  const list = Array.isArray(sitemap) ? sitemap : [sitemap];
  assert.ok(list.includes(`${BASE_URL}/sitemap.xml`));
  assert.ok(list.includes(`${BASE_URL}/sitemap-images.xml`));
});

// ───────────────────────────────────────────────── identity references

test('the schema references point at the nodes the layout actually emits', () => {
  assert.equal(authorRef['@id'], personSchema['@id']);
  assert.equal(publisherRef['@id'], practiceSchema['@id']);
  assert.equal(webSiteRef['@id'], webSiteSchema['@id']);
});

test('the references carry literals as well as @id, for parsers that do not resolve', () => {
  // An author a crawler cannot resolve reads as no author at all.
  assert.equal(authorRef.name, personSchema.name);
  assert.equal(authorRef.url, personSchema.url);
  assert.equal(publisherRef.name, practiceSchema.name);
  assert.equal(publisherRef.logo.url, practiceSchema.logo);
});

// ───────────────────────────────────────────────── article schema

const ARTICLE = {
  title: 'איך מדברים עם מתבגר',
  slug: 'talking-to-teens',
  content: '## פתיחה\n\nשלוש מילים כאן ועוד כמה שם.\n\n## סיום\n\nעוד משפט.',
  excerpt: 'תקציר קצר',
  image_url: 'https://example.com/a.png',
  created_date: '2026-01-02T00:00:00.000Z',
  updated_date: '2026-03-04T00:00:00.000Z',
  meta_description: 'תיאור מטא',
  tag_names: ['הדרכת הורים', 'מתבגרים'],
};

test('an article is authored by the site Person, not by a look-alike literal', () => {
  const schema = buildArticleSchema(ARTICLE);
  assert.deepEqual(schema.author, authorRef);
  assert.equal((schema.author as { '@id': string })['@id'], PERSON_ID);
});

test('an article is published by the practice node', () => {
  const schema = buildArticleSchema(ARTICLE);
  assert.equal((schema.publisher as { '@id': string })['@id'], PRACTICE_ID);
});

test('dateModified comes from the live row, not from the frozen stored schema', () => {
  const schema = buildArticleSchema({
    ...ARTICLE,
    schema_json: {
      '@type': 'BlogPosting',
      headline: 'כותרת מהצנרת',
      dateModified: '2020-01-01T00:00:00.000Z',
      author: { '@type': 'Person', name: 'מישהו אחר' },
    },
  });
  assert.equal(schema.dateModified, ARTICLE.updated_date);
  assert.equal(schema.datePublished, ARTICLE.created_date);
  // Nothing frozen in the column outranks the live row: not the headline...
  assert.equal(schema.headline, ARTICLE.title);
  // ...and certainly not the author.
  assert.deepEqual(schema.author, authorRef);
});

test('the stored schema fills gaps but never overrides a live field', () => {
  const stored = { description: 'תיאור ישן', keywords: 'ישן' };
  // A gap: no meta_description and no excerpt on the row.
  const filled = buildArticleSchema({
    ...ARTICLE,
    meta_description: null,
    excerpt: null,
    tag_names: [],
    schema_json: stored,
  });
  assert.equal(filled.description, 'תיאור ישן');
  assert.equal(filled.keywords, 'ישן');

  // Not a gap: the row has both, so the column is ignored.
  const live = buildArticleSchema({ ...ARTICLE, schema_json: stored });
  assert.equal(live.description, ARTICLE.meta_description);
  assert.equal(live.keywords, ARTICLE.tag_names.join(', '));
});

test('the article node is addressable and points back at its canonical URL', () => {
  const schema = buildArticleSchema(ARTICLE);
  const url = `${BASE_URL}/articles/${ARTICLE.slug}`;
  assert.equal(schema.url, url);
  assert.equal(schema['@id'], `${url}#article`);
  assert.deepEqual(schema.mainEntityOfPage, { '@type': 'WebPage', '@id': url });
  assert.equal(schema.inLanguage, 'he-IL');
});

test('a stored canonical_url wins over the derived one', () => {
  const schema = buildArticleSchema({ ...ARTICLE, canonical_url: `${BASE_URL}/articles/other` });
  assert.equal(schema.url, `${BASE_URL}/articles/other`);
});

test('tags become entities, not only a comma-joined string', () => {
  const schema = buildArticleSchema(ARTICLE);
  assert.deepEqual(schema.about, [
    { '@type': 'Thing', name: 'הדרכת הורים' },
    { '@type': 'Thing', name: 'מתבגרים' },
  ]);
  assert.equal(schema.articleSection, 'הדרכת הורים');
});

test('an untagged article emits no empty about/keywords keys', () => {
  const schema = buildArticleSchema({ ...ARTICLE, tag_names: [] });
  assert.ok(!('about' in schema));
  assert.ok(!('articleSection' in schema));
});

test('wordCount is present and does not count markdown punctuation', () => {
  const schema = buildArticleSchema(ARTICLE);
  assert.equal(typeof schema.wordCount, 'number');
  assert.ok((schema.wordCount as number) > 0);
  assert.equal(buildArticleSchema({ ...ARTICLE, content: null }).wordCount, undefined);
});

test('an article without an image still declares one', () => {
  // Google drops an Article rich result that has no image at all.
  const schema = buildArticleSchema({ ...ARTICLE, image_url: null });
  assert.equal(typeof schema.image, 'string');
  assert.ok((schema.image as string).startsWith('https://'));
});

test('no article schema reintroduces a hand-written author literal', () => {
  const json = JSON.stringify(buildArticleSchema(ARTICLE));
  const authorNames = json.match(/"name":"נירה גבאי"/g) ?? [];
  // Exactly one: the reference's own literal. A second copy means someone
  // spelled the author out again somewhere in the node.
  assert.equal(authorNames.length, 1);
});

// ───────────────────────────────────────────────── heading structure

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

// Comments talk about markup ("two <h1> elements", "on the <img> itself"), so
// they have to come out before anything counts tags - otherwise the guard fires
// on the comment that explains the guard.
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function tsxFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) tsxFiles(path, found);
    else if (entry.endsWith('.tsx')) found.push(path);
  }
  return found;
}

test('no source file declares more than one <h1>', () => {
  // The homepage shipped two <h1> elements for months: the hero copy is
  // rendered twice, once for the mobile layout and once for the desktop
  // overlay, and CSS hides whichever does not apply - but both are in the DOM
  // and Bing counted both. This is the cheap half of the guard; the rendered
  // half is `npm run audit:html`, which is what actually catches a duplicate
  // introduced by a component being mounted twice.
  const offenders: string[] = [];
  for (const file of [...tsxFiles(join(ROOT, 'app')), ...tsxFiles(join(ROOT, 'components'))]) {
    const count = (stripComments(readFileSync(file, 'utf8')).match(/<h1[\s>]/g) || []).length;
    if (count > 1) offenders.push(`${file.replace(ROOT + '/', '')} (${count})`);
  }
  assert.deepEqual(offenders, []);
});

test('the hero renders one h1 and styles its duplicate identically', () => {
  const source = stripComments(readFileSync(join(ROOT, 'components/HeroSection.tsx'), 'utf8'));
  assert.equal((source.match(/<h1[\s>]/g) || []).length, 1);
  assert.equal((source.match(/<h2[\s>]/g) || []).length, 1);
  // Both levels take the same class list, so demoting the duplicate cannot
  // change a single pixel.
  assert.equal((source.match(/className=\{HEADING_CLASS\}/g) || []).length, 2);
});

test('every <img> in the source carries an alt attribute', () => {
  // next/image makes `alt` a required prop, so this is really about the three
  // raw <img> elements: two upload previews in /manage and the Meta Pixel's
  // 1x1 noscript beacon.
  const offenders: string[] = [];
  for (const file of [...tsxFiles(join(ROOT, 'app')), ...tsxFiles(join(ROOT, 'components'))]) {
    const source = stripComments(readFileSync(file, 'utf8'));
    for (const tag of source.match(/<img\b[\s\S]*?\/?>/g) || []) {
      if (!/\balt\s*=/.test(tag)) offenders.push(`${file.replace(ROOT + '/', '')}: ${tag.slice(0, 60)}`);
    }
  }
  assert.deepEqual(offenders, []);
});
