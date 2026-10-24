// Tests for lib/geo/siteChecks.ts, the rules behind verify-agent-readiness and
// the live health card on /manage/geo. The robots.txt cases use the site's own
// generated file, so a change to app/robots.ts that shuts out an AI crawler
// fails here before it reaches production.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import robots from '@/app/robots';
import {
  AI_AGENTS,
  MUST_404,
  entityConflicts,
  jsonLdNodes,
  pageProblems,
  parsePage,
  parseRobots,
  parseSitemap,
  robotsAllows,
  robotsChecks,
  runQuickChecks,
  sitemapChecks,
} from '@/lib/geo/siteChecks';

const BASE = 'https://www.niragabay.com';

/** app/robots.ts rendered the way Next renders it. */
function siteRobotsTxt(): string {
  const r = robots();
  const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
  const lines: string[] = [];
  for (const rule of rules) {
    for (const ua of [rule.userAgent].flat()) lines.push(`User-Agent: ${ua}`);
    for (const a of [rule.allow ?? []].flat()) lines.push(`Allow: ${a}`);
    for (const d of [rule.disallow ?? []].flat()) lines.push(`Disallow: ${d}`);
    lines.push('');
  }
  for (const s of [r.sitemap ?? []].flat()) lines.push(`Sitemap: ${s}`);
  return lines.join('\n');
}

test('robots.txt group selection: a named group replaces *, it does not add to it', () => {
  const txt = 'User-agent: *\nDisallow: /\n\nUser-agent: GPTBot\nAllow: /\n';
  assert.equal(robotsAllows(txt, 'GPTBot', '/about'), true);
  assert.equal(robotsAllows(txt, 'ClaudeBot', '/about'), false);
});

test('robots.txt: longest match wins and Allow wins a tie', () => {
  const txt = 'User-agent: *\nDisallow: /api/\nAllow: /api/md/\nDisallow: /x\nAllow: /x\n';
  assert.equal(robotsAllows(txt, 'any', '/api/md/about'), true);
  assert.equal(robotsAllows(txt, 'any', '/api/contact'), false);
  assert.equal(robotsAllows(txt, 'any', '/x'), true);
  assert.equal(robotsAllows(txt, 'any', '/anything'), true);
});

test('robots.txt: wildcards and $ anchors', () => {
  const txt = 'User-agent: *\nDisallow: /*.pdf$\n';
  assert.equal(robotsAllows(txt, 'a', '/files/x.pdf'), false);
  assert.equal(robotsAllows(txt, 'a', '/files/x.pdf?y'), true);
});

test("the site's own robots.txt lets every AI and search crawler read pages and Markdown, and keeps /manage shut", () => {
  const txt = siteRobotsTxt();
  for (const agent of AI_AGENTS) {
    assert.equal(robotsAllows(txt, agent, '/'), true, agent);
    assert.equal(robotsAllows(txt, agent, '/articles/panic-attacks-what-helps'), true, agent);
    assert.equal(robotsAllows(txt, agent, '/api/md/about'), true, agent);
    assert.equal(robotsAllows(txt, agent, '/manage'), false, agent);
    assert.equal(robotsAllows(txt, agent, '/manage/geo'), false, agent);
    assert.equal(robotsAllows(txt, agent, '/api/manage/geo'), false, agent);
  }
  assert.ok(robotsChecks(txt).every((c) => c.ok), JSON.stringify(robotsChecks(txt)));
  assert.ok(parseRobots(txt).sitemaps.includes(`${BASE}/sitemap.xml`));
});

test('robotsChecks reports a blocked crawler by name', () => {
  const c = robotsChecks('User-agent: OAI-SearchBot\nDisallow: /\n');
  const allowed = c.find((x) => x.id === 'robots_ai_allowed')!;
  assert.equal(allowed.ok, false);
  assert.match(allowed.detail, /OAI-SearchBot/);
});

const SITEMAP = (lastmods: string[]) =>
  `<?xml version="1.0"?><urlset>${lastmods
    .map((l, i) => `<url><loc>${BASE}/p${i}</loc><lastmod>${l}</lastmod></url>`)
    .join('')}</urlset>`;

test('sitemap: parsed, and lastmod = "now" on most pages is flagged as the request time', () => {
  const now = new Date('2026-10-24T12:00:00Z');
  const stamped = parseSitemap(SITEMAP(Array(8).fill('2026-10-24T11:58:00.000Z')));
  assert.equal(stamped.length, 8);
  assert.equal(sitemapChecks(stamped, BASE, now).find((c) => c.id === 'sitemap_lastmod')!.ok, false);

  const real = parseSitemap(SITEMAP(['2026-10-10', '2026-09-22T08:00:00Z', '2026-10-24T11:58:00Z', '2026-08-01', '2026-07-01']));
  assert.equal(sitemapChecks(real, BASE, now).find((c) => c.id === 'sitemap_lastmod')!.ok, true);

  const future = parseSitemap(SITEMAP(['2027-01-01']));
  assert.equal(sitemapChecks(future, BASE, now).find((c) => c.id === 'sitemap_lastmod')!.ok, false);
});

test('sitemap: a URL off the canonical host or with a query is a failure', () => {
  const entries = [
    { loc: `${BASE}/about`, lastmod: null },
    { loc: 'https://niragabay.com/contact', lastmod: null },
    { loc: `${BASE}/articles?tag=x`, lastmod: null },
  ];
  const c = sitemapChecks(entries, BASE).find((x) => x.id === 'sitemap_urls')!;
  assert.equal(c.ok, false);
  assert.match(c.detail, /2 /);
});

const PAGE = (extra = '') => `<!doctype html><html><head>
<link rel="canonical" href="${BASE}/about"/>
<meta name="robots" content="index, follow"/>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Person","@id":"${BASE}/#nira","name":"נירה גבאי"}]}</script>
${extra}</head><body><a href="/contact">צור קשר</a><a href="https://www.niragabay.com/articles/x#top">x</a><a href="https://wa.me/972">wa</a>
<script>self.__next_f.push([1,"{\\"href\\":\\"/not-a-real-link\\"}"])</script></body></html>`;

test('a clean page has no problems, and only real anchors count as internal links', () => {
  const f = parsePage(PAGE(), BASE);
  assert.equal(f.canonical, `${BASE}/about`);
  assert.deepEqual(f.internalLinks.sort(), ['/articles/x', '/contact']);
  assert.deepEqual(pageProblems(`${BASE}/about`, 200, null, f), []);
});

test('soft 404s, wrong canonicals, noindex and broken JSON-LD are all problems', () => {
  assert.deepEqual(pageProblems(`${BASE}/about`, 404, null, null), ['status 404']);
  const wrong = parsePage(PAGE(), BASE);
  assert.match(pageProblems(`${BASE}/clinic`, 200, null, wrong)[0], /canonical/);
  assert.ok(pageProblems(`${BASE}/about`, 200, 'noindex', wrong).includes('noindex on a sitemap page'));
  const doubled = parsePage(PAGE('<meta name="robots" content="noindex"/>'), BASE);
  assert.ok(pageProblems(`${BASE}/about`, 200, null, doubled).some((p) => p.includes('robots meta')));
  const broken = parsePage(PAGE('<script type="application/ld+json">{not json</script>'), BASE);
  assert.ok(pageProblems(`${BASE}/about`, 200, null, broken).some((p) => p.includes('JSON-LD')));
});

test('entity consistency: one @id with two names is a conflict', () => {
  const a = jsonLdNodes({ '@graph': [{ '@type': 'Person', '@id': '#nira', name: 'נירה גבאי' }] });
  const b = jsonLdNodes({ author: { '@type': 'Person', '@id': '#nira', name: 'Nira' } });
  assert.equal(entityConflicts([{ url: '/a', nodes: a }, { url: '/a2', nodes: a }]).length, 0);
  assert.equal(entityConflicts([{ url: '/a', nodes: a }, { url: '/b', nodes: b }]).length, 1);
});

test('the quick checks turn an unreachable site into failed checks, not an exception', async () => {
  const checks = await runQuickChecks(BASE, async () => {
    throw new Error('network down');
  });
  assert.ok(checks.length >= 3);
  assert.ok(checks.every((c) => !c.ok));
});

test('the quick checks catch a soft 404', async () => {
  const fake = async (url: string) => {
    const path = new URL(url).pathname;
    if (path === '/robots.txt') return new Response(siteRobotsTxt(), { status: 200 });
    if (path === '/sitemap.xml') return new Response(SITEMAP(['2026-10-10']), { status: 200 });
    if (path === '/llms.txt') return new Response('x'.repeat(500), { status: 200 });
    // The bug this replaces: /articles/null rendered "not found" with a 200.
    if (path === '/articles/null') return new Response('<title>מאמר לא נמצא</title>', { status: 200 });
    return new Response('not found', { status: 404 });
  };
  const checks = await runQuickChecks(BASE, fake);
  const soft = checks.find((c) => c.id === 'invalid_paths_404')!;
  assert.equal(soft.ok, false);
  assert.match(soft.detail, /\/articles\/null → 200/);
  assert.ok(MUST_404.includes('/articles/null'));
  assert.ok(checks.filter((c) => c.id !== 'invalid_paths_404').every((c) => c.ok));
});
