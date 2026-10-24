// Tests for lib/geo/crawl.ts: the folding of bot_hits rows into the GEO page.
//
// The rows are plain objects with fixed timestamps, so every figure below can
// be checked by hand. Israel is UTC+3 in October 2026, which matters for the
// first test: a crawl at 22:30 UTC belongs to the NEXT Israel day.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCrawlReport,
  invalidReason,
  normalisePath,
  pathStatus,
  unreadListedPages,
  type BotHit,
  type PathCheck,
} from '@/lib/geo/crawl';

const CHECK: PathCheck = {
  listed: new Set(['/', '/about', '/articles', '/articles/panic-attacks-what-helps', '/services/cbt']),
  valid: new Set(['/articles/topic/sexuality']),
  redirects: new Set(['/blog', '/articles/birth-order-family-dynamics']),
};

const hit = (created_at: string, bot_kind: string, path: string | null, bot_agent?: string): BotHit => ({
  created_at,
  bot_kind,
  path,
  bot_agent,
});

test('rows are bucketed by Israel day, not UTC day', () => {
  const r = buildCrawlReport({
    rows: [hit('2026-10-20T22:30:00Z', 'ai_crawler', '/')],
    today: '2026-10-24',
    days: 7,
    check: CHECK,
  });
  const d21 = r.daily.find((d) => d.day === '2026-10-21');
  assert.equal(d21?.ai_crawler, 1);
  assert.equal(r.daily.find((d) => d.day === '2026-10-20')?.ai_crawler, 0);
});

test('the window has one row per day, oldest first, and ignores rows outside it', () => {
  const r = buildCrawlReport({
    rows: [hit('2026-09-01T10:00:00Z', 'ai_crawler', '/'), hit('2026-10-24T10:00:00Z', 'search', '/')],
    today: '2026-10-24',
    days: 7,
    check: CHECK,
  });
  assert.equal(r.daily.length, 7);
  assert.equal(r.daily[0].day, '2026-10-18');
  assert.equal(r.totals.ai_crawler, 0);
  assert.equal(r.totals.search, 1);
});

test('crawler, answer and search stay apart; other kinds are counted but not paged', () => {
  const r = buildCrawlReport({
    rows: [
      hit('2026-10-23T10:00:00Z', 'ai_crawler', '/about'),
      hit('2026-10-23T11:00:00Z', 'ai_answer', '/about'),
      hit('2026-10-23T12:00:00Z', 'search', '/about'),
      hit('2026-10-23T13:00:00Z', 'seo', '/about'),
    ],
    today: '2026-10-24',
    days: 7,
    check: CHECK,
  });
  assert.deepEqual(
    { c: r.totals.ai_crawler, a: r.totals.ai_answer, s: r.totals.search, o: r.totals.other },
    { c: 1, a: 1, s: 1, o: 1 },
  );
  const about = r.pages.find((p) => p.path === '/about')!;
  assert.deepEqual(about.counts, { ai_crawler: 1, ai_answer: 1, search: 1 });
  assert.equal(about.last.ai_answer, '2026-10-23T11:00:00Z');
});

test('last crawl per page and kind is the latest timestamp, whatever the row order', () => {
  const r = buildCrawlReport({
    rows: [
      hit('2026-10-23T10:00:00Z', 'ai_crawler', '/services/cbt'),
      hit('2026-10-24T09:00:00Z', 'ai_crawler', '/services/cbt'),
      hit('2026-10-22T09:00:00Z', 'ai_crawler', '/services/cbt'),
    ],
    today: '2026-10-24',
    days: 7,
    check: CHECK,
  });
  assert.equal(r.pages[0].last.ai_crawler, '2026-10-24T09:00:00Z');
  assert.equal(r.lastSeen.ai_crawler, '2026-10-24T09:00:00Z');
  assert.equal(r.lastSeen.ai_answer, null);
});

test('/articles/null is an invalid path with its own reason, and never a "most crawled" page', () => {
  const r = buildCrawlReport({
    rows: [
      hit('2026-10-23T10:00:00Z', 'ai_crawler', '/articles/null'),
      hit('2026-10-23T10:01:00Z', 'ai_crawler', '/articles/null'),
      hit('2026-10-23T10:02:00Z', 'automation', '/null'),
      hit('2026-10-23T10:03:00Z', 'ai_crawler', '/articles/panic-attacks-what-helps'),
    ],
    today: '2026-10-24',
    days: 7,
    check: CHECK,
  });
  assert.ok(!r.pages.some((p) => p.path.endsWith('/null')));
  const inv = r.invalid.find((i) => i.path === '/articles/null')!;
  assert.equal(inv.hits, 2);
  assert.equal(inv.reason, 'null_segment');
  assert.deepEqual(r.invalid.find((i) => i.path === '/null')?.kinds, ['automation']);
});

test('path status and invalid reasons', () => {
  assert.equal(pathStatus('/about/', CHECK), 'listed');
  assert.equal(pathStatus('/blog/some-old-post', CHECK), 'redirect');
  assert.equal(pathStatus('/articles/topic/sexuality', CHECK), 'valid');
  assert.equal(pathStatus('/articles/topic/null', CHECK), 'invalid');
  assert.equal(normalisePath(''), '/');
  assert.equal(invalidReason('/articles/topic/undefined'), 'null_segment');
  assert.equal(invalidReason('/.git/config'), 'probe');
  assert.equal(invalidReason('/post/%D7%90'), 'old_url');
  assert.equal(invalidReason('/careers'), 'unknown');
});

test('a day far above the two weeks before it is a spike; a busy but normal day is not', () => {
  const rows: BotHit[] = [];
  // 14 baseline days of 30 crawls, then a normal day of 40 and a burst of 2,000.
  for (let i = 0; i < 16; i++) {
    const day = new Date(Date.UTC(2026, 9, 1 + i, 9)).toISOString().slice(0, 10);
    const n = i === 15 ? 2000 : i === 14 ? 40 : 30;
    for (let j = 0; j < n; j++) rows.push(hit(`${day}T09:00:00Z`, 'ai_crawler', '/'));
  }
  const r = buildCrawlReport({ rows, today: '2026-10-16', days: 2, check: CHECK, measuredFrom: '2026-09-15' });
  assert.deepEqual(
    r.spikes.map((s) => [s.day, s.kind, s.count, s.baseline]),
    [['2026-10-16', 'ai_crawler', 2000, 30]],
  );
});

test('a small absolute jump is not a spike, however large the ratio', () => {
  const rows: BotHit[] = [hit('2026-10-16T09:00:00Z', 'ai_answer', '/'), hit('2026-10-16T09:01:00Z', 'ai_answer', '/'), hit('2026-10-16T09:02:00Z', 'ai_answer', '/')];
  const r = buildCrawlReport({ rows, today: '2026-10-16', days: 1, check: CHECK, measuredFrom: '2026-09-15' });
  assert.equal(r.spikes.length, 0);
});

test('no spike is judged against days before measurement began', () => {
  const rows: BotHit[] = Array.from({ length: 500 }, () => hit('2026-09-16T09:00:00Z', 'ai_crawler', '/'));
  const r = buildCrawlReport({ rows, today: '2026-09-16', days: 2, check: CHECK, measuredFrom: '2026-09-15' });
  assert.equal(r.spikes.length, 0);
});

test('weeks run Sunday to Saturday and the running week is marked', () => {
  const r = buildCrawlReport({
    rows: [hit('2026-10-17T09:00:00Z', 'ai_crawler', '/'), hit('2026-10-18T09:00:00Z', 'ai_crawler', '/')],
    today: '2026-10-24',
    days: 14,
    check: CHECK,
  });
  // 2026-10-18 is a Sunday.
  const w = r.weekly.find((x) => x.week === '2026-10-18')!;
  assert.equal(w.ai_crawler, 1);
  assert.equal(w.days, 7);
  assert.equal(r.weekly.find((x) => x.week === '2026-10-11')!.ai_crawler, 1);
  assert.equal(r.weekly.find((x) => x.week === '2026-10-25'), undefined);
});

test('crawler names are counted only when rows carry them', () => {
  const none = buildCrawlReport({ rows: [hit('2026-10-23T09:00:00Z', 'ai_crawler', '/')], today: '2026-10-24', days: 7, check: CHECK });
  assert.equal(none.agentRows, 0);
  assert.deepEqual(none.agents, []);

  const named = buildCrawlReport({
    rows: [
      hit('2026-10-23T09:00:00Z', 'ai_crawler', '/', 'OAI-SearchBot'),
      hit('2026-10-23T10:00:00Z', 'ai_crawler', '/', 'OAI-SearchBot'),
      hit('2026-10-23T11:00:00Z', 'ai_crawler', '/', 'GPTBot'),
    ],
    today: '2026-10-24',
    days: 7,
    check: CHECK,
  });
  assert.equal(named.agentRows, 3);
  assert.deepEqual(named.agents.map((a) => [a.agent, a.hits]), [['OAI-SearchBot', 2], ['GPTBot', 1]]);
});

test('sitemap pages nobody read are listed', () => {
  const r = buildCrawlReport({ rows: [hit('2026-10-23T09:00:00Z', 'search', '/about')], today: '2026-10-24', days: 7, check: CHECK });
  assert.deepEqual(unreadListedPages(r, CHECK.listed), ['/', '/articles', '/articles/panic-attacks-what-helps', '/services/cbt']);
});

test('weeks before measurement began are left out, and the first week counts only measured days', () => {
  const r = buildCrawlReport({
    rows: [hit('2026-09-16T09:00:00Z', 'ai_crawler', '/')],
    today: '2026-09-26',
    days: 21,
    check: CHECK,
    measuredFrom: '2026-09-15',
  });
  assert.deepEqual(r.weekly.map((w) => [w.week, w.days]), [['2026-09-13', 5], ['2026-09-20', 7]]);
});
