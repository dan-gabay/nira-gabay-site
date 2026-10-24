import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, buildWeeks, channelOfEnquiry, israelDay, weekOf } from '../lib/trends';

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

test('enquiry channel: gclid or cpc is paid, a bare search referrer is organic', () => {
  assert.equal(channelOfEnquiry({ gclid: 'x' }), 'paid');
  assert.equal(channelOfEnquiry({ utm_source: 'google', utm_medium: 'cpc' }), 'paid');
  assert.equal(channelOfEnquiry({ referrer: 'https://www.google.com/' }), 'organic');
  assert.equal(channelOfEnquiry({ referrer: 'https://www.google.co.il/search?q=x' }), 'organic');
  assert.equal(channelOfEnquiry({ referrer: 'https://www.facebook.com/' }), 'other');
  assert.equal(channelOfEnquiry({ referrer: 'https://www.google.com/', utm_source: 'newsletter' }), 'other');
  assert.equal(channelOfEnquiry({}), 'other');
});

test('weeks split visits and enquiries by channel', () => {
  const [w] = buildWeeks({
    daily: [{ day: '2026-10-19', visits: 12, views: 15, conversions: 2 }],
    traffic: [
      { day: '2026-10-19', grp: 'google_ads', visits: 8, conversions: 2 },
      { day: '2026-10-19', grp: 'organic_search', visits: 3, conversions: 0 },
      { day: '2026-10-20', grp: 'social', visits: 1, conversions: 0 },
    ],
    enquiries: [
      { day: '2026-10-19', status: 'ongoing', channel: 'paid' },
      { day: '2026-10-20', status: 'irrelevant', channel: 'organic' },
    ],
    today: '2026-10-21',
    windowStart: '2026-10-18',
    firstEvent: '2026-08-23',
  });
  assert.deepEqual(w.channels.paid, { visits: 8, tapped: 2, enquiries: 1, clients: 1 });
  assert.deepEqual(w.channels.organic, { visits: 3, tapped: 0, enquiries: 1, clients: 0 });
  assert.equal(w.channels.other.visits, 1);
  assert.equal(w.clients, 1);
  assert.equal(w.irrelevant, 1);
});
