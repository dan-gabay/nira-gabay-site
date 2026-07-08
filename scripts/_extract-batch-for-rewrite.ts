#!/usr/bin/env tsx
// Temporary helper: fetches and extracts the next 5 pending articles for rewrite injection.
// Output: data/article-extracts.json

import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const DATA_DIR = path.join(process.cwd(), 'data');
const OUTPUT = path.join(DATA_DIR, 'article-extracts.json');

const ARTICLES = [
  { queue_id: 'c5bf620e2bf85cd96074257206549bdf', source_title: 'על הנזק שגורם פינוק',                 target_slug: 'spoiling',                   source_url: 'https://www.m-y-net.co.il/%D7%9E%D7%98%D7%94-%D7%99%D7%94%D7%95%D7%93%D7%94/%D7%94%D7%95%D7%A8%D7%99%D7%9D-%D7%95%D7%99%D7%9C%D7%93%D7%99%D7%9D-%D7%A2%D7%9C-%D7%94%D7%A0%D7%96%D7%A7-%D7%A9%D7%92%D7%95%D7%A8%D7%9D-%D7%A4%D7%99%D7%A0%D7%95%D7%A7-r-n/' },
  { queue_id: '7cb4fa6b513e58efaca317189f0e252a', source_title: 'רגשות האשם כהורים – האם זה הכרחי?',     target_slug: 'emotions-parenting',         source_url: 'https://www.m-y-net.co.il/%D7%9E%D7%98%D7%94-%D7%99%D7%94%D7%95%D7%93%D7%94/%D7%94%D7%95%D7%A8%D7%99%D7%9D-%D7%95%D7%99%D7%9C%D7%93%D7%99%D7%9D-%D7%A8%D7%92%D7%A9%D7%95%D7%AA-%D7%94%D7%90%D7%A9%D7%9D-%D7%9B%D7%94%D7%95%D7%A8%D7%99%D7%9D-%D7%94%D7%90%D7%9D-%D7%96%D7%94-%D7%94%D7%9B%D7%A8%D7%97%D7%99/' },
  { queue_id: 'bfeef2aa0f8ca3cb6f032e4150c24a38', source_title: 'לחיות לצד אישיות נרקיסיסטית',           target_slug: 'narcissistic-personality',   source_url: 'https://www.m-y-net.co.il/%D7%9E%D7%98%D7%94-%D7%99%D7%94%D7%95%D7%93%D7%94/%D7%94%D7%95%D7%A8%D7%99%D7%9D-%D7%95%D7%99%D7%9C%D7%93%D7%99%D7%9D-r-n%D7%9C%D7%97%D7%99%D7%95%D7%AA-%D7%9C%D7%A6%D7%93-%D7%90%D7%99%D7%A9%D7%99%D7%95%D7%AA-%D7%A0%D7%A8%D7%A7%D7%99%D7%A1%D7%99%D7%A1%D7%98%D7%99%D7%AA-r-n/' },
  { queue_id: '8a49a7b75d2de63e161469aa2633dcf0', source_title: 'זוג או פרד',                            target_slug: 'together-or-split',          source_url: 'https://www.m-y-net.co.il/%D7%9E%D7%98%D7%94-%D7%99%D7%94%D7%95%D7%93%D7%94/%D7%94%D7%95%D7%A8%D7%99%D7%9D-%D7%95%D7%99%D7%9C%D7%93%D7%99%D7%9D-r-n%D7%96%D7%95%D7%92-%D7%90%D7%95-%D7%A4%D7%A8%D7%93-r-n/' },
  { queue_id: 'a39afa405b72b61adfb74e680872b914', source_title: 'הילדים שמפחדים להתחפש',                 target_slug: 'children-afraid-costumes',   source_url: 'https://www.m-y-net.co.il/%D7%9E%D7%98%D7%94-%D7%99%D7%94%D7%95%D7%93%D7%94/%D7%94%D7%95%D7%A8%D7%99%D7%9D-%D7%95%D7%99%D7%9C%D7%93%D7%99%D7%9D-r-n%D7%94%D7%99%D7%9C%D7%93%D7%99%D7%9D-%D7%A9%D7%9E%D7%A4%D7%97%D7%93%D7%99%D7%9D-%D7%9C%D7%94%D7%AA%D7%97%D7%A4%D7%A9-r-n/' },
];

const BOILERPLATE = [
  'header','footer','nav','aside','.widget','.sidebar','.breadcrumbs','.breadcrumb',
  '.comments','#comments','.comment-respond','.tags','.tagcloud','.post-tags',
  '[class*="related"]','[class*="social"]','.newsletter','[class*="advertisement"]',
  '.ad','.ads','.adsbygoogle','script','style','noscript','iframe',
  '.tools','.left-side','.fb-comments','#fb-root','.pirsomet',
];
const CONTENT_SELS = [
  '#content section','#content','.entry-content','.post-content',
  '.td-post-content','[itemprop="articleBody"]','.post-body','article .content','.col-main',
];
const BIO = ['יועצת חינוכית','ממכון אדלר','email-protection','__cf_email__','data-cfemail'];

async function fetchPage(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(20_000),
    });
    return r.ok ? r.text() : null;
  } catch { return null; }
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

function extract(html: string): { title: string; contentText: string; excerpt: string } {
  const $ = cheerio.load(html);
  const ogTitle = ($('meta[property="og:title"]').attr('content') ?? '').trim();
  const ogDesc = ($('meta[property="og:description"]').attr('content') ?? '').trim();
  let rawTitle = '';
  for (const sel of ['h1.entry-title','h1.td-page-title','article h1','h1']) {
    const t = $(sel).first().text().trim(); if (t.length > 4) { rawTitle = t; break; }
  }
  if (!rawTitle && ogTitle.length > 4) rawTitle = ogTitle;

  for (const sel of BOILERPLATE) $(sel).remove();
  let $c: ReturnType<typeof $> | null = null;
  for (const sel of CONTENT_SELS) {
    const f = $(sel).first(); if (f.length && f.text().trim().length > 150) { $c = f; break; }
  }
  if (!$c) { const a = $('article').first(); if (a.length && a.text().trim().length > 150) $c = a; }
  if (!$c) { const m = $('main').first(); if (m.length && m.text().trim().length > 150) $c = m; }
  if (!$c) return { title: rawTitle, contentText: '', excerpt: ogDesc };

  for (const sel of BOILERPLATE) $c.find(sel).remove();
  $c.find('p').each((_: number, el: any) => {
    const $el = $(el);
    const inner = $el.html() ?? '';
    const text = $el.text();
    if (BIO.some(s => inner.includes(s) || text.includes(s))) $el.remove();
    else if ($el.text().replace(/ /g,'').trim() === '') $el.remove();
  });
  $('h1').first().remove(); $('time').remove();

  const contentText = $c.text().replace(/\s+/g,' ').trim();
  const excerpt = ogDesc || contentText.slice(0, 250).trim();
  return { title: rawTitle || ogTitle, contentText, excerpt };
}

async function main() {
  const results: any[] = [];
  for (const art of ARTICLES) {
    if (results.length > 0) await sleep(3000); // avoid Cloudflare WAF burst-rate flagging
    console.log('Fetching:', art.target_slug, '...');
    const html = await fetchPage(art.source_url);
    if (!html) {
      console.error('  FAILED to fetch');
      results.push({ ...art, status: 'fetch_failed', title: art.source_title, contentText: '', excerpt: '' });
      continue;
    }
    const { title, contentText, excerpt } = extract(html);
    console.log('  title:', title || art.source_title);
    console.log('  chars:', contentText.length);
    results.push({ ...art, status: 'ok', title: title || art.source_title, contentText, excerpt });
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2), 'utf-8');
  console.log('\nSaved:', OUTPUT);
}

main().catch(e => { console.error(e); process.exit(1); });
