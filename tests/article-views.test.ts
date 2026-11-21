// Tests for lib/articleViews.ts: which events move an article's view counter.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { articleSlugForView } from '@/lib/articleViews';

test('a person opening an article counts for that article', () => {
  assert.equal(articleSlugForView('page_view', '/articles/relationship-red-flags', null), 'relationship-red-flags');
  assert.equal(articleSlugForView('page_view', '/articles/relationship-red-flags/?utm_source=x', null), 'relationship-red-flags');
});

test('a bot does not count', () => {
  assert.equal(articleSlugForView('page_view', '/articles/relationship-red-flags', 'search'), null);
  assert.equal(articleSlugForView('page_view', '/articles/relationship-red-flags', 'automation'), null);
});

test('only page_view counts, not reads, likes or shares', () => {
  for (const e of ['article_read', 'article_completed', 'article_like', 'share']) {
    assert.equal(articleSlugForView(e, '/articles/relationship-red-flags', null), null);
  }
});

test('topic pages, the list and other pages do not count', () => {
  assert.equal(articleSlugForView('page_view', '/articles/topic/couples', null), null);
  assert.equal(articleSlugForView('page_view', '/articles', null), null);
  assert.equal(articleSlugForView('page_view', '/articles/', null), null);
  assert.equal(articleSlugForView('page_view', '/services/couples-therapy', null), null);
  assert.equal(articleSlugForView('page_view', null, null), null);
});

test('a malformed slug is ignored', () => {
  assert.equal(articleSlugForView('page_view', '/articles/נורות', null), null);
  assert.equal(articleSlugForView('page_view', '/articles/a/b', null), null);
  assert.equal(articleSlugForView('page_view', '/articles/Bad_Slug', null), null);
});
