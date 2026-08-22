#!/usr/bin/env tsx
/**
 * link-articles-to-services.ts
 *
 * Closes the content cluster. Service pages already link out to hand-picked
 * articles (lib/services.ts, articleSlugs). Nothing links back, so the 29
 * published articles - the only pages on the site with any age or history -
 * pass none of that to the six pages that actually convert.
 *
 * This appends one short Hebrew closing line to each published article,
 * linking to the single most relevant service.
 *
 * Choosing the service, in order:
 *   1. Curated - the article appears in some service's articleSlugs list.
 *      Those pairings were chosen by hand and are always right.
 *   2. Tags - score the article's tags against each service's tag affinity.
 *   3. Skip. A guess here is worse than no link: a wrong link teaches Google
 *      the wrong thing about both pages.
 *
 * Safety:
 * - dry-run by default; --apply is required to write
 * - idempotent: an article whose content already mentions /services/ is skipped
 * - one link per article, appended at the end, never mid-text
 * - only is_published articles; drafts are left alone
 * - never touches status 'redirected' (the consolidated article)
 *
 * Usage:
 *   npx tsx scripts/link-articles-to-services.ts            dry-run
 *   npx tsx scripts/link-articles-to-services.ts --apply    write
 *
 * --input <file>  read the article list from a JSON file instead of Supabase,
 *                 and print SQL instead of writing. Needed in environments
 *                 where the Supabase host is not reachable over HTTP; the
 *                 pairing logic below stays the single source of truth either
 *                 way. Expected shape:
 *                 [{ id, title, slug, tags, status, has_service_link }]
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { SERVICES } from '../lib/services';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const APPLY = process.argv.includes('--apply');
const INPUT = (() => {
  const i = process.argv.indexOf('--input');
  return i > -1 ? process.argv[i + 1] : null;
})();

function client() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// Which tags point at which service. Deliberately narrow: a tag that suits
// several services (הורות, משפחה) carries less weight than a decisive one.
const TAG_AFFINITY: Record<string, Array<{ slug: string; weight: number }>> = {
  'זוגיות': [
    { slug: 'couples-therapy', weight: 6 },
  ],
  'הורות': [
    { slug: 'parent-guidance', weight: 4 },
  ],
  'משפחה': [
    { slug: 'parent-guidance', weight: 2 },
  ],
  'מתבגרים': [
    { slug: 'teen-therapy', weight: 5 },
  ],
  'חרדה': [
    { slug: 'cbt', weight: 5 },
  ],
  'CBT': [
    { slug: 'cbt', weight: 7 },
  ],
  'טיפול רגשי': [
    { slug: 'adult-therapy', weight: 2 },
  ],
  'מיניות בריאה': [
    { slug: 'sex-therapy', weight: 7 },
  ],
};

// Hand-set pairings for articles the tag heuristic got wrong. Tags describe
// what an article is *about*; they do not say who it is written *for*, and for
// these five that difference decides the service:
//
//   parents-kids-report-cards      tags say מתבגרים, but "איך להתמודד עם קבלת
//                                  התעודות" is addressed to parents.
//   holiday-meal-family-dynamics   tags say זוגיות, but preparing for the
//                                  family holiday meal is extended-family
//                                  dynamics, not the couple.
//   parents-kids-depression        tags say מתבגרים, but "דיכאון בחורף,
//                                  סימנים מוקדמים ודרכי טיפול" is about
//                                  treating depression - CBT's territory.
//
// The other two the heuristic got right and are listed to keep all five
// tag-decided articles visible in one place.
const OVERRIDE: Record<string, string> = {
  'parents-kids-report-cards': 'parent-guidance',
  'holiday-meal-family-dynamics': 'parent-guidance',
  'parents-kids-depression': 'cbt',
  'parents-kids-summer-vacation-expectations': 'parent-guidance',
  'moving-with-kids-and-school-transitions': 'parent-guidance',
};

// The curated pairings, inverted: article slug -> service slug.
const CURATED = new Map<string, string>();
for (const s of SERVICES) {
  for (const a of s.articleSlugs) {
    if (!CURATED.has(a)) CURATED.set(a, s.slug);
  }
}

function pickByTags(tags: string): { slug: string; score: number } | null {
  const names = tags.split(',').map((t) => t.trim()).filter(Boolean);
  const scores = new Map<string, number>();
  for (const n of names) {
    for (const { slug, weight } of TAG_AFFINITY[n] || []) {
      scores.set(slug, (scores.get(slug) || 0) + weight);
    }
  }
  const ranked = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return null;
  // A tie means the tags genuinely do not single out one service.
  if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) return null;
  return { slug: ranked[0][0], score: ranked[0][1] };
}

function closingLine(serviceSlug: string): string {
  const s = SERVICES.find((x) => x.slug === serviceSlug)!;
  return `\n\n---\n\nאם הנושא הזה מהדהד אצלכם, אתם מוזמנים לקרוא על [${s.navLabel}](/services/${s.slug}) בקליניקה שלי, או פשוט לפנות אליי בשיחה קצרה ולא מחייבת.`;
}

type Row = {
  id: string; title: string; slug: string; tags: string | null;
  status: string | null; content?: string | null; has_service_link?: boolean;
};

async function loadArticles(): Promise<Row[]> {
  if (INPUT) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    return JSON.parse(fs.readFileSync(INPUT, 'utf8')) as Row[];
  }
  const supabase = client();
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, slug, tags, content, is_published, status')
    .eq('is_published', true)
    .order('created_date', { ascending: true });
  if (error) throw new Error(`load failed: ${error.message}`);
  return (data || []) as Row[];
}

function sqlQuote(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

async function main() {
  const articles = await loadArticles();

  const plan: Array<{
    slug: string; title: string; service: string; via: string;
  }> = [];
  const skipped: Array<{ slug: string; reason: string }> = [];

  for (const a of articles) {
    if (a.status === 'redirected') {
      skipped.push({ slug: a.slug, reason: 'consolidated (redirected)' });
      continue;
    }
    const linked = INPUT ? a.has_service_link : (a.content || '').includes('/services/');
    if (linked) {
      skipped.push({ slug: a.slug, reason: 'already links to a service' });
      continue;
    }

    const override = OVERRIDE[a.slug];
    if (override) {
      plan.push({ slug: a.slug, title: a.title, service: override, via: 'hand-set' });
      continue;
    }

    const curated = CURATED.get(a.slug);
    if (curated) {
      plan.push({ slug: a.slug, title: a.title, service: curated, via: 'curated' });
      continue;
    }
    const byTag = pickByTags(a.tags || '');
    if (byTag) {
      plan.push({
        slug: a.slug, title: a.title, service: byTag.slug, via: `tags (${byTag.score})`,
      });
      continue;
    }
    skipped.push({ slug: a.slug, reason: `no confident match (tags: ${a.tags || 'none'})` });
  }

  const label = (s: string) => SERVICES.find((x) => x.slug === s)?.navLabel || s;

  console.log(`\n${APPLY ? 'APPLYING' : 'DRY RUN'} - ${articles.length} published articles\n`);
  console.log('WILL LINK'.padEnd(52), 'SERVICE'.padEnd(18), 'VIA');
  console.log('-'.repeat(92));
  for (const p of plan) {
    console.log(p.slug.slice(0, 50).padEnd(52), label(p.service).padEnd(18), p.via);
  }

  if (skipped.length) {
    console.log('\nSKIPPED');
    console.log('-'.repeat(92));
    for (const s of skipped) console.log(s.slug.slice(0, 50).padEnd(52), s.reason);
  }

  const byService = new Map<string, number>();
  for (const p of plan) byService.set(p.service, (byService.get(p.service) || 0) + 1);
  console.log('\nINBOUND LINKS PER SERVICE');
  console.log('-'.repeat(92));
  for (const s of SERVICES) {
    console.log(label(s.slug).padEnd(20), String(byService.get(s.slug) || 0));
  }
  console.log(`\n${plan.length} to link, ${skipped.length} skipped\n`);

  if (process.argv.includes('--map')) {
    // Just the pairing, for driving the update from elsewhere.
    for (const p of plan) console.log(`${p.slug},${p.service}`);
    return;
  }

  if (INPUT) {
    // No DB reachable: emit the statements so they can run through whatever
    // channel does have access. Appending in SQL avoids shipping every
    // article's full body through this process just to add one line.
    console.log('-- SQL (append only; run once)');
    for (const p of plan) {
      console.log(
        `update articles set content = rtrim(content, E' \\n\\r\\t') || ${sqlQuote(closingLine(p.service))}, ` +
        `updated_date = now() where slug = ${sqlQuote(p.slug)} ` +
        `and is_published and content not like '%/services/%';`,
      );
    }
    console.log('');
    return;
  }

  if (!APPLY) {
    console.log('Nothing written. Re-run with --apply to write.\n');
    return;
  }

  const supabase = client();
  let ok = 0;
  for (const p of plan) {
    const a = articles.find((x) => x.slug === p.slug)!;
    const { error: upErr } = await supabase
      .from('articles')
      .update({
        content: (a.content || '').trimEnd() + closingLine(p.service),
        updated_date: new Date().toISOString(),
      })
      .eq('id', a.id);
    if (upErr) {
      console.error(`FAILED ${p.slug}: ${upErr.message}`);
      continue;
    }
    ok++;
  }
  console.log(`\nUpdated ${ok}/${plan.length} articles.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
