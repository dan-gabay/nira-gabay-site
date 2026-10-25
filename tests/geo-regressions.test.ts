// Regression tests for the two crawl defects fixed on 2026-10-24.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import { getSiteUrls, STATIC_CONTENT_VERSION, SERVICES_CONTENT_VERSION } from '@/lib/siteUrls';
import { botAgentFromUserAgent, botKindFromUserAgent, BOT_AGENT_NAMES } from '@/lib/botDetect';
import { botHitRow } from '@/lib/botLog';

const ROOT = process.cwd();

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return pages(p);
    return name === 'page.tsx' ? [p] : [];
  });
}

// /articles/null returned HTTP 200 with "מאמר לא נמצא": app/articles/loading.tsx
// put the article page inside a Suspense boundary, so the 200 status was sent
// with the loading shell before the page could call notFound(). Next then
// injects a noindex meta, but the status is already out - a soft 404, cached
// by ISR, that crawlers kept requesting (~210 AI crawler hits since Sep 15).
test('no route that calls notFound() sits under a loading.tsx (it would turn every 404 into a 200)', () => {
  const app = join(ROOT, 'app');
  const offenders: string[] = [];
  for (const page of pages(app)) {
    if (!readFileSync(page, 'utf8').includes('notFound(')) continue;
    for (let dir = dirname(page); dir.startsWith(app); dir = dirname(dir)) {
      if (existsSync(join(dir, 'loading.tsx'))) offenders.push(`${relative(ROOT, page)} under ${relative(ROOT, dir)}/loading.tsx`);
      if (dir === app) break;
    }
  }
  assert.deepEqual(offenders, []);
});

function fakeSupabase(articles: unknown[]) {
  const q = { select: () => q, eq: () => Promise.resolve({ data: articles, error: null }) };
  return { from: () => q } as unknown as Parameters<typeof getSiteUrls>[0];
}

// Static pages claimed lastModified = new Date(): "changed this second" on
// every sitemap fetch.
test('sitemap lastModified only moves when content does', async () => {
  const articles = [
    { slug: 'a', updated_date: '2026-10-21T21:25:05Z', created_date: '2026-10-16T07:00:00Z', tags: 'חרדה' },
    { slug: 'b', updated_date: null, created_date: '2026-09-01T00:00:00Z', tags: 'חרדה' },
  ];
  const first = await getSiteUrls(fakeSupabase(articles));
  await new Promise((r) => setTimeout(r, 5));
  const second = await getSiteUrls(fakeSupabase(articles));
  assert.deepEqual(
    first.map((u) => [u.url, String(u.lastModified)]),
    second.map((u) => [u.url, String(u.lastModified)]),
  );

  const by = new Map(first.map((u) => [u.url.replace('https://www.niragabay.com', '') || '/', String(u.lastModified)]));
  assert.equal(by.get('/about'), `${STATIC_CONTENT_VERSION}T00:00:00.000Z`);
  assert.equal(by.get('/services/cbt'), `${SERVICES_CONTENT_VERSION}T00:00:00.000Z`);
  // The homepage and the index list the newest article, so they move with it.
  assert.equal(by.get('/'), '2026-10-21T21:25:05Z');
  assert.equal(by.get('/articles'), '2026-10-21T21:25:05Z');
  assert.equal(by.get('/articles/b'), '2026-09-01T00:00:00Z');
  for (const [, v] of by) assert.ok(Date.parse(v) <= Date.now(), `future lastmod ${v}`);
});

test('the content versions are real past dates', () => {
  for (const v of [STATIC_CONTENT_VERSION, SERVICES_CONTENT_VERSION]) {
    assert.match(v, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Date.parse(v) <= Date.now());
  }
});

// ───────────────────────────────────────────── crawler names

test('crawler names: the search-index crawler is told apart from the training one', () => {
  assert.equal(botAgentFromUserAgent('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.3; +https://openai.com/searchbot'), 'OAI-SearchBot');
  assert.equal(botAgentFromUserAgent('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot'), 'GPTBot');
  assert.equal(botAgentFromUserAgent('Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)'), 'ChatGPT-User');
  assert.equal(botAgentFromUserAgent('Mozilla/5.0 (compatible; Claude-SearchBot/1.0; +Claude-SearchBot@anthropic.com)'), 'Claude-SearchBot');
  assert.equal(botAgentFromUserAgent('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)'), 'ClaudeBot');
  assert.equal(botAgentFromUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'), 'Googlebot');
  assert.equal(botAgentFromUserAgent('Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)'), 'PerplexityBot');
});

test('crawler names never leak a user agent: browsers, previews and scripts get null', () => {
  assert.equal(botAgentFromUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 Version/17.6 Mobile/15E148 Safari/604.1'), null);
  assert.equal(botAgentFromUserAgent('WhatsApp/2.24.1 A'), null);
  assert.equal(botAgentFromUserAgent('python-requests/2.31'), null);
  assert.equal(botAgentFromUserAgent('SomeNewAIBot/1.0 (+https://example.com)'), null);
  assert.equal(botAgentFromUserAgent(null), null);
  for (const name of BOT_AGENT_NAMES) assert.ok(name.length <= 40 && /^[A-Za-z-]+$/.test(name), name);
});

test('the health check labels itself a monitor, so it is never counted as a crawl', () => {
  assert.equal(botKindFromUserAgent('niragabay-healthcheck/1.0 (+https://www.niragabay.com/llms.txt)'), 'monitor');
});

test('bot_agent is sent only when a known crawler name was found', () => {
  assert.deepEqual(botHitRow('ai_crawler', '/', 'GPTBot'), { bot_kind: 'ai_crawler', path: '/', bot_agent: 'GPTBot' });
  assert.deepEqual(botHitRow('preview', '/', null), { bot_kind: 'preview', path: '/' });
});
