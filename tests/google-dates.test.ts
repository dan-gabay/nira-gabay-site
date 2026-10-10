// Tests for the reporting date windows used by ga-query.ts and gsc-query.ts.
//
// Run with `npm test`. The bug these guard against: "last 28 days" used to
// start at the UTC date minus 28 and run to today, so a "28-day" GA4
// breakdown covered 29 days plus a partial day and did not match a true
// 28-day total (483 vs 468 sessions, 2026-10-10).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, daysInclusive, lastCompleteDays, parseWindowArgs, todayInReportTz } from '../scripts/google-dates';

// 2026-10-10 22:43 UTC is already 2026-10-11 01:43 in Asia/Jerusalem (UTC+3).
const LATE_EVENING_UTC = new Date('2026-10-10T22:43:00Z');

test('today is the Asia/Jerusalem date, not the UTC date', () => {
  assert.equal(todayInReportTz(LATE_EVENING_UTC), '2026-10-11');
  assert.equal(todayInReportTz(new Date('2026-10-10T12:00:00Z')), '2026-10-10');
});

test('addDays crosses month ends and DST changes', () => {
  assert.equal(addDays('2026-10-01', -1), '2026-09-30');
  assert.equal(addDays('2026-10-24', 2), '2026-10-26'); // Israel DST ends 25 Oct 2026
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('last N complete days is exactly N days ending yesterday', () => {
  const w = lastCompleteDays(28, LATE_EVENING_UTC);
  assert.deepEqual(w, { start: '2026-09-13', end: '2026-10-10', days: 28 });
  assert.equal(daysInclusive(w.start, w.end), 28);
});

test('positional days still work, defaulting to 28', () => {
  const a = parseWindowArgs(['90', 'query'], 28, LATE_EVENING_UTC);
  assert.equal(a.window.days, 90);
  assert.equal(a.window.end, '2026-10-10');
  assert.deepEqual(a.positionals, ['query']);

  const b = parseWindowArgs(['sessionDefaultChannelGroup', 'sessions'], 28, LATE_EVENING_UTC);
  assert.equal(b.window.days, 28);
  assert.deepEqual(b.positionals, ['sessionDefaultChannelGroup', 'sessions']);
});

test('explicit --start/--end gives an inclusive window and drops a stray days arg', () => {
  const a = parseWindowArgs(['--start', '2026-09-28', '--end', '2026-10-04', 'date', 'sessions'], 28, LATE_EVENING_UTC);
  assert.deepEqual(a.window, { start: '2026-09-28', end: '2026-10-04', days: 7 });
  assert.deepEqual(a.positionals, ['date', 'sessions']);

  const b = parseWindowArgs(['7', '--start=2026-09-01', '--end=2026-09-30', 'page', '--limit', '500'], 28, LATE_EVENING_UTC);
  assert.equal(b.window.days, 30);
  assert.deepEqual(b.positionals, ['page']);
  assert.deepEqual(b.flags, { limit: '500' });
});

test('bad windows are refused, not silently widened', () => {
  assert.throws(() => parseWindowArgs(['--start', '2026-09-28']), /--end/);
  assert.throws(() => parseWindowArgs(['--start', '2026-10-04', '--end', '2026-09-28']), /after/);
  assert.throws(() => parseWindowArgs(['--start', '28/09/2026', '--end', '2026-10-04']), /YYYY-MM-DD/);
});
