/**
 * Crawls every public route and audits the rendered HTML for two things a
 * source grep cannot answer:
 *
 *   1. How many <h1> elements the page actually has.
 *   2. Which <img> elements carry no alt attribute at all.
 *
 * Both questions are about the DOM, not about the JSX. The homepage carried
 * two <h1> elements for months while the source contained exactly one, because
 * the hero copy is rendered twice - once for the mobile layout and once for the
 * desktop overlay - and CSS hides whichever one does not apply. Bing counted
 * both. Nothing short of reading the served markup would have caught it.
 *
 *   npm run audit:html                              # http://localhost:3000
 *   npm run audit:html -- https://www.niragabay.com
 *
 * Exits non-zero if any route has other than one <h1>, or any <img> with no
 * alt, so it can gate a deploy if that is ever wanted.
 */

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');

// The public routes. Article and topic slugs are discovered from the sitemap
// so a new article is audited without anyone remembering to add it here.
const FIXED_ROUTES = [
  '/',
  '/about',
  '/contact',
  '/clinic',
  '/privacy',
  '/services',
  '/articles',
  // A path that cannot exist, to audit the 404 body too.
  '/__audit_missing_route__',
];

type RouteReport = {
  route: string;
  status: number;
  h1: number;
  images: number;
  emptyAlt: number;
  missingAlt: string[];
};

async function routesFromSitemap(): Promise<string[]> {
  try {
    const res = await fetch(`${BASE}/sitemap.xml`);
    if (!res.ok) return [];
    const xml = await res.text();
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => m[1].replace(/^https?:\/\/[^/]+/, ''))
      .map((p) => (p === '' ? '/' : p));
  } catch {
    return [];
  }
}

async function auditRoute(route: string): Promise<RouteReport> {
  const res = await fetch(`${BASE}${route}`);
  const html = await res.text();

  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  const images = html.match(/<img\b[^>]*>/g) || [];
  // `alt=""` is a deliberate statement that an image is decorative and is
  // counted separately; a missing attribute is the defect.
  const missingAlt = images.filter((tag) => !/\balt\s*=/.test(tag));
  const emptyAlt = images.filter((tag) => /\balt=""/.test(tag)).length;

  return {
    route,
    status: res.status,
    h1,
    images: images.length,
    emptyAlt,
    missingAlt,
  };
}

async function main() {
  console.log(`Auditing ${BASE}\n`);

  const discovered = await routesFromSitemap();
  const routes = [...new Set([...FIXED_ROUTES, ...discovered])].sort();
  if (discovered.length === 0) {
    console.log('(sitemap.xml unreachable - auditing the fixed routes only)\n');
  }

  const reports: RouteReport[] = [];
  for (const route of routes) reports.push(await auditRoute(route));

  let failed = 0;
  for (const r of reports) {
    const ok = r.h1 === 1 && r.missingAlt.length === 0;
    if (!ok) failed++;
    console.log(
      `${ok ? 'ok  ' : 'FAIL'} ${String(r.status)} ${r.route.padEnd(46)} ` +
        `h1=${r.h1}  img=${r.images} (decorative ${r.emptyAlt})  missing-alt=${r.missingAlt.length}`,
    );
    for (const tag of r.missingAlt) console.log(`        ${tag.slice(0, 160)}`);
  }

  console.log(
    failed === 0
      ? `\n${reports.length} routes: every one has exactly one <h1> and no <img> without alt.`
      : `\n${failed} of ${reports.length} routes need attention.`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
