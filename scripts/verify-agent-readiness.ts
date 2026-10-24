/**
 * Probes a running site and checks the agent-facing contract end to end.
 *
 * The unit tests cover the parser and the documents; this covers the thing
 * they cannot: what the server actually puts on the wire once middleware,
 * Next's own headers and the CDN have all had a turn. Content negotiation is
 * exactly the kind of feature that passes every unit test and is still broken
 * in production because a Vary header got overwritten.
 *
 *   npm run verify:agent-readiness                    # http://localhost:3000
 *   npm run verify:agent-readiness -- https://www.niragabay.com
 *   npm run verify:agent-readiness -- https://www.niragabay.com --quick
 *
 * Sections 1-8 are the content-negotiation contract. Sections 9-14 (added
 * 2026-10-24, GEO monitoring) crawl the site the way a search or AI crawler
 * would: redirects, robots.txt per AI crawler, the sitemap and its dates,
 * every sitemap page's status / canonical / indexing / JSON-LD, entity
 * consistency across pages, every internal link, and real 404s for invalid
 * article paths. --quick skips the per-page crawl (9-14 then run only the
 * checks /manage/geo runs live). The rules live in lib/geo/siteChecks.ts.
 *
 * Read-only: GET and HEAD, identified as niragabay-healthcheck so the requests
 * are labelled 'monitor' in bot_hits and not counted as crawls.
 */

import {
  HEALTHCHECK_UA,
  entityConflicts,
  jsonLdNodes,
  pageProblems,
  parsePage,
  parseSitemap,
  runQuickChecks,
} from '../lib/geo/siteChecks';

const args = process.argv.slice(2);
const QUICK = args.includes('--quick');
const BASE = (args.find((a) => !a.startsWith('--')) || 'http://localhost:3000').replace(/\/$/, '');

const BROWSER_ACCEPT =
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8';

type Check = { name: string; ok: boolean; detail: string };
const results: Check[] = [];

function record(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
}

const varyOf = (res: Response) => res.headers.get('vary') || '';
const varyHasAccept = (res: Response) =>
  varyOf(res)
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .includes('accept');

async function get(path: string, accept?: string) {
  return fetch(`${BASE}${path}`, {
    headers: { 'user-agent': HEALTHCHECK_UA, ...(accept ? { Accept: accept } : {}) },
    redirect: 'manual',
  });
}

async function main() {
  console.log(`Verifying ${BASE}\n`);

  // 1. Markdown negotiation on a real page.
  for (const path of ['/', '/about', '/contact', '/privacy', '/services/cbt']) {
    const res = await get(path, 'text/markdown');
    const ct = res.headers.get('content-type') || '';
    const body = await res.text();
    record(
      `${path} with Accept: text/markdown`,
      res.status === 200 &&
        ct.startsWith('text/markdown') &&
        varyHasAccept(res) &&
        body.trimStart().startsWith('# '),
      `${res.status} · ${ct} · Vary: ${varyOf(res) || '(none)'} · ${body.length} bytes`,
    );
  }

  // 2. The same pages must still be HTML for a browser, with Vary: Accept so a
  //    CDN keeps the two variants apart.
  //
  //    Expect this pair to FAIL under `next start` and to pass on Vercel. Next
  //    replaces Vary on App Router page responses with its own RSC list and
  //    discards anything set from proxy.ts or next.config.ts; on Vercel the
  //    custom header is applied by the Edge Network instead, which is why
  //    next.config.ts carries the full superset rather than just `Accept`.
  //    This check exists to be run against the deployed site.
  for (const path of ['/', '/privacy']) {
    const res = await get(path, BROWSER_ACCEPT);
    const ct = res.headers.get('content-type') || '';
    const ok = res.status === 200 && ct.includes('text/html') && varyHasAccept(res);
    record(
      `${path} with a browser Accept header`,
      ok,
      `${res.status} · ${ct} · Vary: ${varyOf(res) || '(none)'}` +
        (ok ? '' : '  [expected under `next start`: Next owns Vary on page responses]'),
    );
  }

  // 3. A client that says nothing gets HTML.
  {
    const res = await get('/');
    const ct = res.headers.get('content-type') || '';
    record('/ with no Accept header', res.status === 200 && ct.includes('text/html'), `${res.status} · ${ct}`);
  }

  // 4. The q-value case a substring check gets backwards.
  {
    const res = await get('/', 'text/markdown;q=0.5, text/html');
    const ct = res.headers.get('content-type') || '';
    record(
      '/ where html outranks markdown by q-value',
      ct.includes('text/html'),
      `${res.status} · ${ct}`,
    );
  }

  // 5. A real 404, and a 404 an agent can recover from.
  {
    const path = '/some-path-that-does-not-exist';
    const html = await get(path, BROWSER_ACCEPT);
    record(`${path} returns a real 404`, html.status === 404, `${html.status}`);

    const md = await get(path, 'text/markdown');
    const body = await md.text();
    record(
      `${path} with Accept: text/markdown returns a markdown 404 body`,
      md.status === 404 &&
        (md.headers.get('content-type') || '').startsWith('text/markdown') &&
        body.includes('/sitemap.xml') &&
        body.includes('/llms.txt'),
      `${md.status} · ${md.headers.get('content-type')} · ${body.length} bytes`,
    );
  }

  // 6. Machine-readable files.
  for (const [path, needle] of [
    ['/llms.txt', 'When to use this site'],
    ['/robots.txt', 'Sitemap'],
    ['/sitemap.xml', '/privacy'],
  ] as const) {
    const res = await get(path);
    const body = await res.text();
    record(
      `${path} serves and contains "${needle}"`,
      res.status === 200 && body.includes(needle),
      `${res.status} · ${body.length} bytes`,
    );
  }

  // 7. The identity graph on the homepage.
  {
    const res = await get('/', BROWSER_ACCEPT);
    const html = await res.text();
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(
      (m) => m[1],
    );
    const parsed = blocks.map((b) => {
      try {
        return JSON.parse(b.replace(/\\u003c/g, '<'));
      } catch {
        return null;
      }
    });
    const person = parsed.find((p) => p && p['@type'] === 'Person');
    record(
      'homepage JSON-LD has a complete Person node',
      Boolean(person?.name && person?.description && person?.url && person?.jobTitle && person?.sameAs),
      person
        ? `fields: ${['name', 'description', 'url', 'jobTitle', 'sameAs'].filter((f) => person[f]).join(', ')}`
        : `no Person node among ${blocks.length} JSON-LD blocks`,
    );
    record(
      'no JSON-LD block claims the protected title "Psychologist"',
      !html.includes('"Psychologist"'),
      html.includes('"Psychologist"') ? 'found "Psychologist"' : 'absent',
    );
  }

  // 8. The admin area must not have become negotiable.
  {
    const res = await get('/manage', 'text/markdown');
    const ct = res.headers.get('content-type') || '';
    record(
      '/manage is not served as markdown',
      !ct.startsWith('text/markdown'),
      `${res.status} · ${ct}`,
    );
  }


  // 9. Redirects a crawler meets: the old /blog paths, the consolidated
  //    article, and (on the real domain) the apex host.
  for (const [path, target] of [
    ['/blog', '/articles'],
    ['/articles/birth-order-family-dynamics', '/articles/family-birth-order-meaning-and-impact'],
  ] as const) {
    const res = await get(path, BROWSER_ACCEPT);
    const loc = res.headers.get('location') || '';
    record(
      `${path} redirects permanently to ${target}`,
      [301, 308].includes(res.status) && new URL(loc, BASE).pathname === target,
      `${res.status} → ${loc || '(no location)'}`,
    );
  }
  if (new URL(BASE).hostname === 'www.niragabay.com') {
    const res = await fetch('https://niragabay.com/about', { redirect: 'manual', headers: { 'user-agent': HEALTHCHECK_UA } });
    const loc = res.headers.get('location') || '';
    record(
      'niragabay.com redirects to the www host, path kept',
      [301, 308].includes(res.status) && loc.startsWith('https://www.niragabay.com/about'),
      `${res.status} → ${loc || '(no location)'}`,
    );
  }

  // 10. robots.txt per AI crawler, the sitemap and its dates, real 404s for
  //     invalid article paths, llms.txt - the same checks /manage/geo runs.
  for (const c of await runQuickChecks(BASE, (url, init) => fetch(url, init))) {
    record(c.id, c.ok || c.severity === 'warn', `${c.ok ? '' : c.severity === 'warn' ? '[warn] ' : ''}${c.detail}`);
  }

  // 11. The Markdown variant of a real article, and the direct /api/md URL.
  const sitemapRes = await get('/sitemap.xml');
  const entries = sitemapRes.status === 200 ? parseSitemap(await sitemapRes.text()) : [];
  const article = entries.find((e) => /\/articles\/(?!topic\/)[^/]+$/.test(new URL(e.loc).pathname));
  if (article) {
    const path = new URL(article.loc).pathname;
    const res = await get(path, 'text/markdown');
    const ct = res.headers.get('content-type') || '';
    record(
      `${path} with Accept: text/markdown`,
      res.status === 200 && ct.startsWith('text/markdown') && varyHasAccept(res),
      `${res.status} · ${ct} · Vary: ${varyOf(res) || '(none)'}`,
    );
  }
  {
    const res = await get('/api/md/about');
    const xr = res.headers.get('x-robots-tag') || '';
    record('direct /api/md/about is noindex (a second URL for /about)', res.status === 200 && /noindex/i.test(xr), `${res.status} · X-Robots-Tag: ${xr || '(none)'}`);
  }

  if (!QUICK && entries.length) {
    // 12. Every sitemap page: 200, its own canonical, indexable, JSON-LD that parses.
    const pages: Array<{ url: string; nodes: Array<Record<string, unknown>>; links: string[] }> = [];
    const problems: string[] = [];
    const queue = [...entries];
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        for (let e = queue.shift(); e; e = queue.shift()) {
          const path = new URL(e.loc).pathname;
          try {
            const res = await get(path, BROWSER_ACCEPT);
            const html = res.status === 200 ? await res.text() : '';
            const facts = html ? parsePage(html, new URL(e.loc).origin) : null;
            const p = pageProblems(e.loc, res.status, res.headers.get('x-robots-tag'), facts);
            if (p.length) problems.push(`${path}: ${p.join('; ')}`);
            if (facts) pages.push({ url: e.loc, nodes: facts.jsonLd.flatMap((j) => jsonLdNodes(j.value)), links: facts.internalLinks });
          } catch (err) {
            problems.push(`${path}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }),
    );
    record(
      `all ${entries.length} sitemap pages: 200, self-canonical, indexable, valid JSON-LD`,
      problems.length === 0,
      problems.length ? problems.slice(0, 10).join('\n      ') : `${pages.length} pages clean`,
    );

    // 13. One entity, one name: every @id names the same thing everywhere.
    const conflicts = entityConflicts(pages.map((p) => ({ url: p.url, nodes: p.nodes })));
    record('JSON-LD entities are consistent across pages', conflicts.length === 0, conflicts.join('\n      ') || 'no @id with two names');

    // 14. Every internal link that is not itself in the sitemap.
    const listed = new Set(entries.map((e) => new URL(e.loc).pathname));
    const linked = [...new Set(pages.flatMap((p) => p.links))].filter(
      (l) => !listed.has(l) && !/\.[a-z0-9]+$/i.test(l) && !l.startsWith('/api/') && !l.startsWith('/manage'),
    );
    const broken: string[] = [];
    for (const l of linked) {
      const res = await get(l, BROWSER_ACCEPT);
      if (res.status >= 400) broken.push(`${l} → ${res.status}`);
    }
    record(
      'no broken internal links',
      broken.length === 0,
      broken.length ? broken.join('\n      ') : `${linked.length} links outside the sitemap checked`,
    );
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log(`\nFailed:\n${failed.map((f) => `  - ${f.name}: ${f.detail}`).join('\n')}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
