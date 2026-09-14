// Tests for lib/visitor.ts.
//
// The bug this module was written to fix is the one worth pinning hardest: the
// old counter lived in an effect keyed on `pathname`, so reading three articles
// in one sitting recorded three visits. Every "one visit" test below is a guard
// against that coming back.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Imported statically: lib/visitor.ts only touches window and storage inside
// its functions, so the fakes below are in place long before anything calls
// them.
import { visitorState, daysSinceFirst, MAX_AGE_MS } from '@/lib/visitor';

class FakeStorage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
}

const local = new FakeStorage();
let session = new FakeStorage();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any;
g.window = g.window ?? {};
g.localStorage = local;
Object.defineProperty(g, 'sessionStorage', { get: () => session, configurable: true });

/** A new browser session, same browser: what a returning visitor really is. */
const newSession = () => { session = new FakeStorage(); };

beforeEach(() => { local.clear(); newSession(); });

test('the first visit is visit 1, day 0', () => {
  const now = Date.parse('2026-09-14T09:00:00Z');
  const s = visitorState(now);
  assert.equal(s?.visit, 1);
  assert.equal(daysSinceFirst(s, now), 0);
});

test('many calls inside one session are still one visit', () => {
  // Reading three articles in one sitting fires page_view, article_read and
  // more, each of which asks for the state. The count must not move.
  const now = Date.parse('2026-09-14T09:00:00Z');
  assert.equal(visitorState(now)?.visit, 1);
  for (let i = 0; i < 12; i++) visitorState(now + i * 1000);
  assert.equal(visitorState(now + 60_000)?.visit, 1);
});

test('a new session on the same browser is the next visit', () => {
  const day1 = Date.parse('2026-09-14T09:00:00Z');
  assert.equal(visitorState(day1)?.visit, 1);

  newSession();
  const day3 = Date.parse('2026-09-17T21:00:00Z');
  const second = visitorState(day3);
  assert.equal(second?.visit, 2);
  assert.equal(daysSinceFirst(second, day3), 3);

  newSession();
  assert.equal(visitorState(day3)?.visit, 3);
});

test('the first-visit timestamp never moves forward', () => {
  const first = Date.parse('2026-09-01T09:00:00Z');
  visitorState(first);
  newSession();
  const later = Date.parse('2026-09-20T09:00:00Z');
  const s = visitorState(later);
  assert.equal(s?.first, first);
  assert.equal(daysSinceFirst(s, later), 19);
});

test('past 90 days the visitor counts as new again', () => {
  const first = Date.parse('2026-01-01T09:00:00Z');
  visitorState(first);
  newSession();

  const s = visitorState(first + MAX_AGE_MS + 1);
  assert.equal(s?.visit, 1, 'the window expired, so this is a first visit');
  assert.equal(daysSinceFirst(s, first + MAX_AGE_MS + 1), 0);
});

test('just inside 90 days the history is kept', () => {
  const first = Date.parse('2026-01-01T09:00:00Z');
  visitorState(first);
  newSession();
  assert.equal(visitorState(first + MAX_AGE_MS - 1000)?.visit, 2);
});

test('corrupt storage is treated as a fresh visitor, not a crash', () => {
  local.setItem('visitor_v1', 'not json at all');
  assert.equal(visitorState(Date.now())?.visit, 1);

  newSession();
  local.setItem('visitor_v1', JSON.stringify({ visit: 'seven', first: null }));
  assert.equal(visitorState(Date.now())?.visit, 1);
});

test('daysSinceFirst is null when there is no state to speak of', () => {
  assert.equal(daysSinceFirst(null), null);
});
