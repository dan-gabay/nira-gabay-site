// The pure half of the traffic-sources-over-time chart: the x-axis buckets,
// the gap filling, and the colour-to-group mapping.
//
// The chart itself is verified by rendering it (screenshots against a mock
// analytics payload); what is worth pinning here is the arithmetic that decides
// which day a visit lands on, and the invariant that every source group has a
// colour. A group with no colour draws an undefined stroke - an invisible line,
// with a legend entry that points at nothing.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SOURCE_SERIES, bucketKeys, fillSeries } from '@/components/manage/Charts';
import { GROUP_LABELS } from '@/components/manage/TrafficSources';

// ───────────────────────────────────────────────── x axis

test('bucketKeys returns one key per day, oldest first, ending today', () => {
  const keys = bucketKeys(30, 'day');
  assert.equal(keys.length, 30);
  assert.match(keys[0], /^\d{4}-\d{2}-\d{2}$/);

  const today = new Date();
  const todayKey =
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-` +
    `${String(today.getDate()).padStart(2, '0')}`;
  assert.equal(keys[keys.length - 1], todayKey);

  // Strictly increasing, no repeats - a duplicate would stack two days on one x.
  assert.deepEqual([...keys].sort(), keys);
  assert.equal(new Set(keys).size, keys.length);
});

test('an hourly range uses the hour-suffixed key the SQL emits', () => {
  const keys = bucketKeys(24, 'hour');
  assert.equal(keys.length, 24);
  for (const k of keys) assert.match(k, /^\d{4}-\d{2}-\d{2}T\d{2}$/);
  assert.equal(new Set(keys).size, 24);
});

test('a month boundary does not repeat or skip a day', () => {
  // Date arithmetic across the 1st is where a naive implementation loses a day.
  const keys = bucketKeys(60, 'day');
  assert.equal(new Set(keys).size, 60);
  const asDates = keys.map((k) => new Date(`${k}T12:00`).getTime());
  for (let i = 1; i < asDates.length; i++) {
    const gap = (asDates[i] - asDates[i - 1]) / 86_400_000;
    assert.equal(Math.round(gap), 1, `gap of ${gap} days before ${keys[i]}`);
  }
});

// ───────────────────────────────────────────────── gap filling

test('a bucket with no traffic becomes an empty bucket, not a missing one', () => {
  const points = fillSeries(
    [{ day: '2026-09-02', grp: 'social', visits: 25 }],
    ['2026-09-01', '2026-09-02', '2026-09-03'],
  );
  assert.equal(points.length, 3);
  assert.deepEqual(points.map((p) => p.day), ['2026-09-01', '2026-09-02', '2026-09-03']);
  assert.deepEqual(points[0].values, {});
  assert.equal(points[1].values.social, 25);
  assert.deepEqual(points[2].values, {});
});

test('rows outside the range are dropped rather than shifting the axis', () => {
  const points = fillSeries(
    [
      { day: '2026-08-01', grp: 'google_ads', visits: 99 },
      { day: '2026-09-02', grp: 'google_ads', visits: 10 },
    ],
    ['2026-09-01', '2026-09-02'],
  );
  assert.equal(points.length, 2);
  assert.equal(points[1].values.google_ads, 10);
  assert.ok(!points.some((p) => p.values.google_ads === 99));
});

test('two rows for the same bucket and group are summed, not overwritten', () => {
  const points = fillSeries(
    [
      { day: '2026-09-02', grp: 'social', visits: 4 },
      { day: '2026-09-02', grp: 'social', visits: 6 },
      { day: '2026-09-02', grp: 'direct', visits: 1 },
    ],
    ['2026-09-02'],
  );
  assert.equal(points[0].values.social, 10);
  assert.equal(points[0].values.direct, 1);
});

// ───────────────────────────────────────────────── colour mapping

test('every source group the traffic card labels has a line colour', () => {
  for (const key of Object.keys(GROUP_LABELS)) {
    assert.ok(SOURCE_SERIES[key], `no colour for "${key}" - its line would draw with no stroke`);
  }
});

test('every line colour belongs to a group the traffic card can name', () => {
  for (const key of Object.keys(SOURCE_SERIES)) {
    assert.ok(GROUP_LABELS[key], `no label for "${key}" - its legend entry would read as a raw key`);
  }
});

test('no two groups share a colour', () => {
  const colors = Object.values(SOURCE_SERIES);
  assert.equal(new Set(colors).size, colors.length);
});

test('the palette is the validated set, in the validated order', () => {
  // Changing a hex here without re-running the dataviz validator is how a
  // palette quietly stops being colourblind-safe. The order is part of it:
  // the checks are run on adjacent pairs.
  assert.deepEqual(Object.values(SOURCE_SERIES), [
    '#0D9488', '#B45309', '#0369A1', '#15803D', '#7C3AED', '#BE185D',
  ]);
});
