// What the live site tells crawlers, checked over HTTP.
//
// Shared by two callers that ask the same questions at different depths:
//
//   scripts/verify-agent-readiness.ts  every sitemap page, every internal link
//                                      (run by hand or a routine, minutes)
//   app/api/manage/geo                 the quick subset, on each load of the
//                                      GEO page (a handful of requests)
//
// The parsers are pure and tested in tests/geo-site-checks.test.ts; the
// runners take a fetch function, so a test can hand them a fake site.
//
// Only confirmed, mechanical facts are checked - a status code, a header, a
// parse. Nothing here scores "SEO quality".

export type SiteCheck = {
  id: string;
  /** What was checked, in Hebrew for the dashboard. */
  label: string;
  ok: boolean;
  /** 'warn' is worth knowing; 'fail' is a defect. */
  severity: 'fail' | 'warn';
  detail: string;
};

/** Sent on every request so these checks are labelled 'monitor' in bot_hits, not counted as crawls. */
export const HEALTHCHECK_UA = 'niragabay-healthcheck/1.0 (+https://www.niragabay.com/llms.txt)';

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

// ───────────────────────────────────────────── robots.txt

type RobotsGroup = { agents: string[]; rules: Array<{ allow: boolean; path: string }> };

export function parseRobots(txt: string): { groups: RobotsGroup[]; sitemaps: string[] } {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === 'user-agent') {
      // Consecutive user-agent lines share one group.
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (key === 'sitemap') sitemaps.push(value);
    else if ((key === 'allow' || key === 'disallow') && current) {
      // An empty Disallow allows everything; it adds no rule.
      if (value) current.rules.push({ allow: key === 'allow', path: value });
    }
  }
  return { groups, sitemaps };
}

/**
 * RFC 9309: the group naming the agent wins outright over `*`; inside it the
 * longest matching rule wins, and Allow wins a tie.
 */
export function robotsAllows(txt: string, agent: string, path: string): boolean {
  const { groups } = parseRobots(txt);
  const a = agent.toLowerCase();
  const named = groups.filter((g) => g.agents.some((x) => x !== '*' && a.includes(x)));
  const chosen = named.length ? named : groups.filter((g) => g.agents.includes('*'));
  const rules = chosen.flatMap((g) => g.rules);
  let best: { allow: boolean; len: number } | null = null;
  for (const r of rules) {
    if (!robotsPathMatches(r.path, path)) continue;
    const len = r.path.length;
    if (!best || len > best.len || (len === best.len && r.allow)) best = { allow: r.allow, len };
  }
  return best ? best.allow : true;
}

function robotsPathMatches(rule: string, path: string): boolean {
  const anchored = rule.endsWith('$');
  const body = (anchored ? rule.slice(0, -1) : rule)
    .split('*')
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${body}${anchored ? '$' : ''}`).test(path);
}

/** The crawlers whose access decides AI and search visibility. */
export const AI_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'Perplexity-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'Google-Extended',
  'Googlebot',
  'Bingbot',
  'Applebot-Extended',
];

export function robotsChecks(txt: string, articlePath = '/articles'): SiteCheck[] {
  const checks: SiteCheck[] = [];
  const blocked = AI_AGENTS.filter(
    (a) => !robotsAllows(txt, a, '/') || !robotsAllows(txt, a, articlePath) || !robotsAllows(txt, a, '/api/md/about'),
  );
  checks.push({
    id: 'robots_ai_allowed',
    label: 'robots.txt מתיר לסורקי AI וחיפוש',
    ok: blocked.length === 0,
    severity: 'fail',
    detail: blocked.length ? `חסומים: ${blocked.join(', ')}` : `${AI_AGENTS.length} סורקים מורשים לדף הבית, למאמרים ולגרסת ה-Markdown`,
  });
  const open = AI_AGENTS.filter((a) => robotsAllows(txt, a, '/manage') || robotsAllows(txt, a, '/api/contact'));
  checks.push({
    id: 'robots_admin_closed',
    label: 'robots.txt סוגר את אזור הניהול וה-API',
    ok: open.length === 0,
    severity: 'fail',
    detail: open.length ? `פתוח עבור: ${open.join(', ')}` : '/manage ו-/api סגורים לכל הסורקים',
  });
  const { sitemaps } = parseRobots(txt);
  checks.push({
    id: 'robots_sitemap',
    label: 'robots.txt מפנה למפת האתר',
    ok: sitemaps.some((s) => s.endsWith('/sitemap.xml')),
    severity: 'warn',
    detail: sitemaps.join(' · ') || 'אין שורת Sitemap',
  });
  return checks;
}

// ───────────────────────────────────────────── sitemap.xml

export type SitemapEntry = { loc: string; lastmod: string | null };

export function parseSitemap(xml: string): SitemapEntry[] {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => {
    const loc = /<loc>\s*([^<]+?)\s*<\/loc>/.exec(m[1])?.[1] ?? '';
    const lastmod = /<lastmod>\s*([^<]+?)\s*<\/lastmod>/.exec(m[1])?.[1] ?? null;
    return { loc: decodeXml(loc), lastmod };
  });
}

const decodeXml = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

export function sitemapChecks(entries: SitemapEntry[], base: string, now = new Date()): SiteCheck[] {
  const checks: SiteCheck[] = [];
  const bad = entries.filter((e) => {
    try {
      const u = new URL(e.loc);
      return u.origin !== base || u.search !== '' || u.hash !== '';
    } catch {
      return true;
    }
  });
  checks.push({
    id: 'sitemap_urls',
    label: 'כל הכתובות במפת האתר תקינות ועל הדומיין הקנוני',
    ok: entries.length > 0 && bad.length === 0,
    severity: 'fail',
    detail: entries.length === 0 ? 'מפת האתר ריקה' : bad.length ? `${bad.length} לא תקינות, למשל ${bad[0].loc}` : `${entries.length} כתובות`,
  });

  const locs = entries.map((e) => e.loc);
  const dupes = locs.filter((l, i) => locs.indexOf(l) !== i);
  checks.push({
    id: 'sitemap_unique',
    label: 'אין כפילויות במפת האתר',
    ok: dupes.length === 0,
    severity: 'warn',
    detail: dupes.length ? `כפולות: ${[...new Set(dupes)].join(', ')}` : 'אין',
  });

  const dated = entries.filter((e) => e.lastmod && !Number.isNaN(Date.parse(e.lastmod)));
  const future = dated.filter((e) => Date.parse(e.lastmod!) > now.getTime() + 86_400_000);
  // The symptom of a lastModified of `new Date()`: the page "changed" within
  // minutes of being asked. A real edit can be recent; most pages cannot.
  const justNow = dated.filter((e) => Math.abs(now.getTime() - Date.parse(e.lastmod!)) < 10 * 60_000);
  const misleading = future.length > 0 || (dated.length >= 5 && justNow.length / dated.length > 0.25);
  checks.push({
    id: 'sitemap_lastmod',
    label: 'תאריכי העדכון (lastmod) במפת האתר אמינים',
    ok: !misleading,
    severity: 'warn',
    detail: future.length
      ? `${future.length} בעתיד`
      : `${justNow.length} מתוך ${dated.length} "עודכנו" בעשר הדקות האחרונות${misleading ? ' - כנראה תאריך הבקשה ולא תאריך שינוי' : ''}`,
  });
  return checks;
}

// ───────────────────────────────────────────── one HTML page

export type PageFacts = {
  canonical: string | null;
  robotsMeta: string[];
  jsonLd: Array<{ ok: boolean; value: unknown }>;
  internalLinks: string[];
};

export function parsePage(html: string, base: string): PageFacts {
  const canonical =
    /<link[^>]+rel="canonical"[^>]*href="([^"]+)"/i.exec(html)?.[1] ??
    /<link[^>]+href="([^"]+)"[^>]*rel="canonical"/i.exec(html)?.[1] ??
    null;
  const robotsMeta = [...html.matchAll(/<meta[^>]+name="robots"[^>]*content="([^"]*)"/gi)].map((m) => m[1].toLowerCase());
  const jsonLd = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => {
    try {
      return { ok: true, value: JSON.parse(m[1].replace(/\\u003c/g, '<')) as unknown };
    } catch {
      return { ok: false, value: null };
    }
  });
  // Only real anchors in the HTML - not strings inside the RSC payload.
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  const internalLinks = new Set<string>();
  for (const m of withoutScripts.matchAll(/<a\b[^>]*\shref="([^"#]+)/gi)) {
    const href = m[1].replace(/&amp;/g, '&');
    let u: URL;
    try {
      u = new URL(href, base);
    } catch {
      continue;
    }
    if (u.origin !== base) continue;
    internalLinks.add(u.pathname);
  }
  return { canonical: canonical ? decodeXml(canonical) : null, robotsMeta, jsonLd, internalLinks: [...internalLinks] };
}

/** Every node in a JSON-LD value, through @graph and nested objects. */
export function jsonLdNodes(value: unknown): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (o['@type'] || o['@id']) out.push(o);
      Object.values(o).forEach(walk);
    }
  };
  walk(value);
  return out;
}

/**
 * Entity consistency across pages: every node that carries the same @id must
 * agree on its name. A Person called two different things is two people to an
 * index that merges by @id.
 */
export function entityConflicts(pages: Array<{ url: string; nodes: Array<Record<string, unknown>> }>): string[] {
  const names = new Map<string, Map<string, string>>();
  for (const p of pages) {
    for (const n of p.nodes) {
      const id = typeof n['@id'] === 'string' ? n['@id'] : null;
      const name = typeof n.name === 'string' ? n.name : null;
      if (!id || !name) continue;
      const seen = names.get(id) ?? new Map<string, string>();
      if (!seen.has(name)) seen.set(name, p.url);
      names.set(id, seen);
    }
  }
  return [...names.entries()]
    .filter(([, byName]) => byName.size > 1)
    .map(([id, byName]) => `${id}: ${[...byName.entries()].map(([n, u]) => `"${n}" (${u})`).join(' / ')}`);
}

/** Paths a crawler can be handed that must be a real 404, never a soft one. */
export const MUST_404 = ['/articles/null', '/articles/topic/null', '/null', '/articles/this-article-does-not-exist-geo-check'];

const withTimeout = (ms: number) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, done: () => clearTimeout(t) };
};

export async function fetchWithTimeout(fetcher: Fetcher, url: string, init: RequestInit = {}, ms = 8000) {
  const t = withTimeout(ms);
  try {
    return await fetcher(url, {
      redirect: 'manual',
      ...init,
      headers: { 'user-agent': HEALTHCHECK_UA, ...(init.headers as Record<string, string> | undefined) },
      signal: t.signal,
    });
  } finally {
    t.done();
  }
}

/**
 * The quick subset: robots, sitemap, the must-404 paths and llms.txt. Every
 * failure to reach the site becomes a failed check, never a thrown error.
 */
export async function runQuickChecks(base: string, fetcher: Fetcher, now = new Date()): Promise<SiteCheck[]> {
  const out: SiteCheck[] = [];
  const get = async (path: string, accept = 'text/html') => {
    try {
      const res = await fetchWithTimeout(fetcher, `${base}${path}`, { headers: { accept } });
      return { res, body: await res.text() };
    } catch (e) {
      return { res: null, body: '', error: e instanceof Error ? e.message : String(e) };
    }
  };

  const robots = await get('/robots.txt', 'text/plain');
  if (robots.res?.status === 200) out.push(...robotsChecks(robots.body));
  else out.push({ id: 'robots_reachable', label: 'robots.txt זמין', ok: false, severity: 'fail', detail: robots.res ? `${robots.res.status}` : 'לא נגיש' });

  const sitemap = await get('/sitemap.xml', 'application/xml');
  if (sitemap.res?.status === 200) out.push(...sitemapChecks(parseSitemap(sitemap.body), base, now));
  else out.push({ id: 'sitemap_reachable', label: 'sitemap.xml זמין', ok: false, severity: 'fail', detail: sitemap.res ? `${sitemap.res.status}` : 'לא נגיש' });

  const statuses = await Promise.all(MUST_404.map(async (p) => [p, (await get(p)).res?.status ?? 0] as const));
  const soft = statuses.filter(([, s]) => s !== 404);
  out.push({
    id: 'invalid_paths_404',
    label: 'כתובת שגויה מחזירה 404 אמיתי',
    ok: soft.length === 0,
    severity: 'fail',
    detail: soft.length ? soft.map(([p, s]) => `${p} → ${s || 'לא נגיש'}`).join(' · ') : statuses.map(([p, s]) => `${p} → ${s}`).join(' · '),
  });

  const llms = await get('/llms.txt', 'text/plain');
  out.push({
    id: 'llms_txt',
    label: 'llms.txt זמין',
    ok: llms.res?.status === 200 && llms.body.length > 200,
    severity: 'warn',
    detail: llms.res ? `${llms.res.status} · ${llms.body.length} bytes` : 'לא נגיש',
  });

  return out;
}

/**
 * What is wrong with one sitemap page, from what the server sent. An empty
 * list is a clean page. Exported so the rules are tested once and the script
 * only does the fetching.
 */
export function pageProblems(
  loc: string,
  status: number,
  xRobotsTag: string | null,
  facts: PageFacts | null,
): string[] {
  const problems: string[] = [];
  if (status !== 200) {
    problems.push(`status ${status}`);
    return problems;
  }
  if (!facts) return problems;
  if (!facts.canonical) problems.push('no canonical');
  else if (facts.canonical.replace(/\/$/, '') !== loc.replace(/\/$/, '')) {
    problems.push(`canonical ${facts.canonical} != ${loc}`);
  }
  const noindex = [...facts.robotsMeta, (xRobotsTag || '').toLowerCase()].some((v) => /\bnoindex\b/.test(v));
  if (noindex) problems.push('noindex on a sitemap page');
  if (facts.robotsMeta.length > 1) problems.push(`${facts.robotsMeta.length} robots meta tags`);
  const broken = facts.jsonLd.filter((j) => !j.ok).length;
  if (broken) problems.push(`${broken} JSON-LD block(s) do not parse`);
  if (facts.jsonLd.length === 0) problems.push('no JSON-LD');
  return problems;
}
