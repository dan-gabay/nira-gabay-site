#!/usr/bin/env tsx
// Parses the cached HTML files and merges with the existing cached article 1 extract.
// Output: data/article-extracts.json (ready for Opus rewrite agent)

import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const HTML_DIR = path.join(DATA_DIR, 'html-cache');
const OUTPUT = path.join(DATA_DIR, 'article-extracts.json');

const BOILERPLATE = [
  'header','footer','nav','aside','.widget','.widget-area','.sidebar',
  '.breadcrumbs','.breadcrumb','.comments','#comments','.comment-respond',
  '.tags','.tagcloud','.post-tags','[class*="related"]','[class*="social-share"]',
  '.newsletter','[class*="advertisement"]','.ad','.ads','.adsbygoogle',
  'script','style','noscript','iframe','.tools','.left-side',
  '.fb-comments','#fb-root','.pirsomet',
];
const CONTENT_SELS = [
  '#content section','#content','.entry-content','.post-content',
  '.td-post-content','[itemprop="articleBody"]','.post-body','article .content','.col-main',
];
const BIO_SIGNALS = ['יועצת חינוכית','ממכון אדלר','מיניות בריאה','email-protection','__cf_email__','data-cfemail'];

function extractFromHtml(html: string): { title: string; contentText: string; excerpt: string } {
  const $ = cheerio.load(html);
  const ogTitle = ($('meta[property="og:title"]').attr('content') ?? '').trim();
  const ogDesc = ($('meta[property="og:description"]').attr('content') ?? '').trim();
  const metaDesc = ($('meta[name="description"]').attr('content') ?? '').trim();

  let rawTitle = '';
  for (const sel of ['h1.entry-title','h1.td-page-title','article h1','h1']) {
    const t = $(sel).first().text().trim();
    if (t.length > 4) { rawTitle = t; break; }
  }
  if (!rawTitle) rawTitle = ogTitle;

  for (const sel of BOILERPLATE) $(sel).remove();

  let $c: ReturnType<typeof $> | null = null;
  for (const sel of CONTENT_SELS) {
    const f = $(sel).first();
    if (f.length && f.text().trim().length > 150) { $c = f; break; }
  }
  if (!$c) { const a = $('article').first(); if (a.length && a.text().trim().length > 150) $c = a; }
  if (!$c) { const m = $('main').first(); if (m.length && m.text().trim().length > 150) $c = m; }

  if (!$c) return { title: rawTitle, contentText: '', excerpt: ogDesc || metaDesc };

  for (const sel of BOILERPLATE) $c.find(sel).remove();
  $c.find('h1').first().remove();
  $c.find('time').remove();
  $c.find('p').each((_: number, el: any) => {
    const $el = $(el);
    const inner = $el.html() ?? '';
    const text = $el.text();
    if (BIO_SIGNALS.some(s => inner.includes(s) || text.includes(s))) $el.remove();
    else if ($el.text().replace(/ /g, '').trim() === '') $el.remove();
  });

  const contentText = $c.text().replace(/\s+/g, ' ').trim();
  const excerpt = ogDesc || metaDesc || contentText.slice(0, 250).trim();
  return { title: rawTitle || ogTitle, contentText, excerpt };
}

const ARTICLES = [
  {
    queue_id: '6b95fa9ab2752e35b9bbf6fcb46b62fb',
    source_title: 'באיזו שפת אהבה אנו מדברים?',
    target_slug: 'love-language',
    fromCache: true, // use extracted-source-article-preview.json
  },
  { queue_id: '90678e5babdad68d1bb08c88f722adfe', source_title: 'כיצד יוצאים ממעגל הדיכאון',                        target_slug: 'depression-cycle',           htmlFile: 'depression-cycle.html' },
  { queue_id: '0fc6f4de6f9cb584e35802813b4e5f7b', source_title: 'שימוש בזיכרונות ילדות בחדר הטיפול',                 target_slug: 'childhood-memories-therapy', htmlFile: 'childhood-memories-therapy.html' },
  { queue_id: 'cf0bd721de5da8b130a750766a9d0620', source_title: 'תיאום ציפיות כאמצעי להתמודדות עם החופש הגדול',      target_slug: 'summer-break-expectations',  htmlFile: 'summer-break-expectations.html' },
  { queue_id: '57c6580e33e6262f90828767c53144e9', source_title: 'איך מתמודדים עם יציאה מהארון ?',                   target_slug: 'coming-out',                 htmlFile: 'coming-out.html' },
];

const results: any[] = [];

for (const art of ARTICLES) {
  if ((art as any).fromCache) {
    const cached = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'extracted-source-article-preview.json'), 'utf-8'));
    results.push({
      queue_id: art.queue_id,
      source_title: art.source_title,
      target_slug: art.target_slug,
      status: 'ok',
      title: cached.extracted_title || art.source_title,
      contentText: cached.extracted_text || '',
      excerpt: cached.extracted_excerpt || '',
    });
    console.log(`ok (cached): ${art.target_slug} - ${(cached.extracted_text || '').length} chars`);
    continue;
  }

  const htmlPath = path.join(HTML_DIR, (art as any).htmlFile);
  if (!fs.existsSync(htmlPath)) {
    console.error(`missing: ${htmlPath}`);
    results.push({ queue_id: art.queue_id, source_title: art.source_title, target_slug: art.target_slug, status: 'missing', title: art.source_title, contentText: '', excerpt: '' });
    continue;
  }

  const html = fs.readFileSync(htmlPath, 'utf-8');
  const { title, contentText, excerpt } = extractFromHtml(html);
  console.log(`ok: ${art.target_slug} - ${contentText.length} chars - "${(title || '').slice(0, 50)}"`);
  results.push({ queue_id: art.queue_id, source_title: art.source_title, target_slug: art.target_slug, status: 'ok', title: title || art.source_title, contentText, excerpt });
}

fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2), 'utf-8');
console.log('\nSaved:', OUTPUT);
