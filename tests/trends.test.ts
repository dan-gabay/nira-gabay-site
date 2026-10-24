import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, buildWeeks, israelDay, weekOf } from '../lib/trends';

test('weeks start on Sunday', () => {
  assert.equal(weekOf('2026-10-24'), '2026-10-18'); // Saturday
  assert.equal(weekOf('2026-10-18'), '2026-10-18'); // Sunday
  assert.equal(weekOf('2026-10-25'), '2026-10-25');
  assert.equal(addDays('2026-10-25', -90 + 1), '2026-07-28');
});

test('an enquiry late on Saturday evening UTC is Sunday in Israel', () => {
  assert.equal(israelDay(new Date('2026-10-24T22:30:00Z')), '2026-10-25');
});

test('weeks: window stub dropped, measurement start and current week counted', () => {
  const weeks = buildWeeks({
    daily: [
      { day: '2026-08-23', visits: 10, views: 15, conversions: 1 },
      { day: '2026-08-29', visits: 5, views: 5, conversions: 0 },
      { day: '2026-10-20', visits: 7, views: 9, conversions: 2 },
    ],
    enquiries: [
      { day: '2026-10-19', status: 'started_therapy' },
      { day: '2026-10-21', status: 'irrelevant' },
      { day: '2026-10-22', status: 'spoke' },
      { day: '2026-10-22', status: null },
    ],
    today: '2026-10-21',
    windowStart: '2026-07-24',
    firstEvent: '2026-08-25',
  });
  assert.equal(weeks[0].week, '2026-08-23');
  assert.equal(weeks[0].days, 5);
  assert.equal(weeks[0].visits, 15);
  const last = weeks[weeks.length - 1];
  assert.equal(last.week, '2026-10-18');
  assert.equal(last.current, true);
  assert.equal(last.days, 4);
  assert.deepEqual(
    [last.taps, last.enquiries, last.clients, last.irrelevant, last.open],
    [2, 4, 1, 1, 2],
  );
  assert.equal(weeks.length, 9);
});
