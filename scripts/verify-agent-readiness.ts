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
 */

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');

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
    headers: accept ? { Accept: accept } : {},
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
