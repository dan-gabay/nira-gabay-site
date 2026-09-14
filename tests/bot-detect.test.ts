// Tests for lib/botDetect.ts.
//
// Two failure modes matter, and they are not symmetric.
//
// Calling a person a bot deletes a real visit from the dashboard and there is
// no way to notice - the row is still stored, but nothing ever looks at it.
// Calling a bot a person is the status quo we are trying to leave. So the
// false-positive tests below carry real browser strings verbatim, including
// the ones with substrings that look alarming.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { botKindFromUserAgent, isBotUserAgent, BOT_KIND_LABELS } from '@/lib/botDetect';

const CHROME_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const SAFARI_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1';
const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const FIREFOX = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0';
const EDGE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0';

test('a real browser is never a bot', () => {
  for (const ua of [CHROME_MAC, SAFARI_IPHONE, CHROME_ANDROID, FIREFOX, EDGE]) {
    assert.equal(botKindFromUserAgent(ua), null, ua.slice(0, 40));
  }
});

test('AppleWebKit is not Applebot', () => {
  // Every Safari and Chrome string contains "AppleWebKit". A careless
  // /applebot/ would flag most of the real traffic on the site.
  assert.equal(botKindFromUserAgent(CHROME_MAC), null);
  assert.equal(botKindFromUserAgent(SAFARI_IPHONE), null);
  assert.equal(botKindFromUserAgent('Mozilla/5.0 (compatible; Applebot/0.1)'), 'search');
});

test('assistants and their crawlers are labelled ai', () => {
  for (const ua of [
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot',
    'Mozilla/5.0 AppleWebKit/537.36 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)',
    'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)',
    'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
    'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
    'Mozilla/5.0 (compatible; Claude-User/1.0)',
    'Mozilla/5.0 (compatible; Google-Extended)',
    'Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)',
  ]) {
    assert.equal(botKindFromUserAgent(ua), 'ai', ua.slice(0, 50));
  }
});

test('search crawlers are their own bucket, not ai', () => {
  assert.equal(botKindFromUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'), 'search');
  assert.equal(botKindFromUserAgent('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'), 'search');
  // Google-Extended is the AI training crawler and must not fall to 'search'
  // just because it says Google.
  assert.equal(botKindFromUserAgent('Mozilla/5.0 (compatible; Google-Extended/1.0)'), 'ai');
});

test('a driven browser is caught even behind an ordinary Chrome string', () => {
  const headless = CHROME_MAC.replace('Chrome/140', 'HeadlessChrome/140');
  assert.equal(botKindFromUserAgent(headless), 'automation');
  assert.equal(botKindFromUserAgent('python-requests/2.32.3'), 'automation');
  assert.equal(botKindFromUserAgent('curl/8.7.1'), 'automation');
  assert.equal(botKindFromUserAgent('node-fetch/1.0 (+https://github.com/bitinn/node-fetch)'), 'automation');
});

test('link unfurlers are preview, not visitors', () => {
  assert.equal(botKindFromUserAgent('WhatsApp/2.23.20.0'), 'preview');
  assert.equal(botKindFromUserAgent('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'), 'preview');
  assert.equal(botKindFromUserAgent('TelegramBot (like TwitterBot)'), 'preview');
});

test('SEO crawlers and monitors are separated from search', () => {
  assert.equal(botKindFromUserAgent('Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)'), 'seo');
  assert.equal(botKindFromUserAgent('Mozilla/5.0 (compatible; SemrushBot/7~bl)'), 'seo');
  assert.equal(botKindFromUserAgent('Mozilla/5.0 (compatible; UptimeRobot/2.0)'), 'monitor');
  assert.equal(botKindFromUserAgent('Chrome-Lighthouse'), 'monitor');
});

test('anything that announces itself as a bot still gets caught', () => {
  assert.equal(botKindFromUserAgent('SomeNewThing/1.0 (+bot)'), 'other');
  assert.equal(botKindFromUserAgent('Mozilla/5.0 (compatible; UnknownCrawler/3.1)'), 'other');
});

test('a missing user agent counts as automation', () => {
  // Every real browser sends one. A client that does not is a script, or is
  // hiding; neither is a visit.
  assert.equal(botKindFromUserAgent(null), 'automation');
  assert.equal(botKindFromUserAgent(undefined), 'automation');
  assert.equal(botKindFromUserAgent('   '), 'automation');
});

test('isBotUserAgent agrees with botKindFromUserAgent', () => {
  assert.equal(isBotUserAgent(CHROME_MAC), false);
  assert.equal(isBotUserAgent('Mozilla/5.0 (compatible; GPTBot/1.2)'), true);
});

test('every kind the detector can return has a Hebrew label', () => {
  for (const ua of ['GPTBot/1.2', 'Googlebot/2.1', 'AhrefsBot/7.0', 'WhatsApp/2.23',
                    'curl/8.7.1', 'UptimeRobot/2.0', 'UnknownCrawler/1.0']) {
    const kind = botKindFromUserAgent(ua);
    assert.ok(kind, ua);
    assert.ok(BOT_KIND_LABELS[kind], `no label for "${kind}"`);
  }
});
