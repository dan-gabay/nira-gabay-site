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

import { SOURCE_SERIES, bucketKeys, clockKey, fillDays, fillSeries } from '@/components/manage/Charts';
import { GROUP_LABELS } from '@/components/manage/TrafficSources';

// ───────────────────────────────────────────────── x axis

// What the dashboard's clock must be, independent of where the browser is.
const inJerusalem = (at: Date, unit: 'day' | 'hour') => {
  const p: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(at)) p[part.type] = part.value;
  const day = `${p.year}-${p.month}-${p.day}`;
  return unit === 'hour' ? `${day}T${p.hour}` : day;
};

test('bucketKeys returns one key per day, oldest first, ending today in Israel', () => {
  const keys = bucketKeys(30, 'day');
  assert.equal(keys.length, 30);
  assert.match(keys[0], /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(keys[keys.length - 1], inJerusalem(new Date(), 'day'));

  // Strictly increasing, no repeats - a duplicate would stack two days on one x.
  assert.deepEqual([...keys].sort(), keys);
  assert.equal(new Set(keys).size, keys.length);
});

test('an hourly range uses the hour-suffixed key the SQL emits', () => {
  const keys = bucketKeys(24, 'hour');
  assert.equal(keys.length, 24);
  for (const k of keys) assert.match(k, /^\d{4}-\d{2}-\d{2}T\d{2}$/);
  assert.equal(new Set(keys).size, 24);
  assert.equal(keys[keys.length - 1], inJerusalem(new Date(), 'hour'));
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

test('every source group the traffic card labels has a segment colour', () => {
  for (const key of Object.keys(GROUP_LABELS)) {
    assert.ok(SOURCE_SERIES[key], `no colour for "${key}" - its segment would draw with no fill`);
  }
});

test('every segment colour belongs to a group the traffic card can name', () => {
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
  // palette quietly stops being colourblind-safe.
  //
  // These are the all-pairs values, not the adjacent ones the line version was
  // checked against. A stack needs the stronger test: a source with no visits
  // in a bucket is a zero-height segment, so its neighbours close up over it
  // and any two groups can end up sharing an edge.
  assert.deepEqual(Object.values(SOURCE_SERIES), [
    '#0D9488', '#eb6834', '#2a78d6', '#166534', '#5B21B6', '#BE185D',
  ]);
});


// ───────────────────────────────────── the clock (regression: 14:48 shown as 11)

test('an instant is bucketed on Israel time, not UTC', () => {
  // The enquiry that started this: stored as 11:48 UTC, which is 14:48 in
  // Jerusalem. The dashboard printed 11:00, because the bucket was UTC on both
  // sides of the wire.
  const at = new Date('2026-09-07T11:48:18.564Z');
  assert.equal(clockKey(at, 'hour'), '2026-09-07T14');
  assert.equal(clockKey(at, 'day'), '2026-09-07');
});

test('a late-evening event belongs to the next day, the way the clock says', () => {
  // 23:04 UTC is 02:04 the following morning in Israel. Counting it on the 5th
  // is the same bug wearing a different hat, and it was silent because nobody
  // checks which day a Saturday-night click landed on.
  const at = new Date('2026-09-05T23:04:27.132Z');
  assert.equal(clockKey(at, 'day'), '2026-09-06');
  assert.equal(clockKey(at, 'hour'), '2026-09-06T02');
});

test('the clock does not follow the machine it runs on', () => {
  // Same instant, whatever TZ node was started with. If this ever fails, the
  // key builder has gone back to reading the local clock.
  const at = new Date('2026-01-15T22:30:00.000Z'); // winter: Israel is UTC+2
  assert.equal(clockKey(at, 'hour'), '2026-01-16T00');
  assert.equal(clockKey(at, 'day'), '2026-01-16');
});

test('fillDays and bucketKeys spell the same key', () => {
  // They used to be two separate pieces of date arithmetic. A row lands in a
  // bucket only if both spell it identically, so they are now one function.
  const days = bucketKeys(7, 'day');
  const filled = fillDays([{ day: days[3], views: 5, visits: 4, conversions: 1 }], 7);
  assert.deepEqual(filled.map((f) => f.day), days);
  assert.equal(filled[3].views, 5);
  assert.equal(filled[0].views, 0);
});
