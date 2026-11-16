import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeBySourceName, sourceName } from '../lib/sourceNames';

test('a directory is named the same by its tag and by its host', () => {
  assert.equal(sourceName('hebpsy'), 'פסיכולוגיה עברית');
  assert.equal(sourceName('www.hebpsy.net'), 'פסיכולוגיה עברית');
  assert.equal(sourceName('koltipul'), 'כל טיפול');
  assert.equal(sourceName('www.koltipul.co.il'), 'כל טיפול');
  assert.equal(sourceName('mentalytics'), 'מנטליטיקס');
  assert.equal(sourceName('alhasapa'), 'על הספה');
  assert.equal(sourceName('www.alhasapa.co.il'), 'על הספה');
});

test('map listings are named by their platform', () => {
  assert.equal(sourceName('osm'), 'OpenStreetMap (מפה)');
  assert.equal(sourceName('www.openstreetmap.org'), 'OpenStreetMap (מפה)');
  assert.equal(sourceName('waze'), 'Waze');
  assert.equal(sourceName('foursquare'), 'Foursquare');
  assert.equal(sourceName('apple'), 'Apple Maps');
  assert.equal(sourceName('maps.apple.com'), 'Apple Maps');
});

test('an unknown source is still shown, never blank', () => {
  assert.equal(sourceName('www.example.org'), 'example.org');
  assert.equal(sourceName('newsletter'), 'newsletter');
  assert.equal(sourceName(null), '');
});

test('rows for the same site under two spellings are summed', () => {
  const rows = mergeBySourceName([
    { detail: 'hebpsy', visits: 2, conversions: 1 },
    { detail: 'www.hebpsy.net', visits: 3, conversions: 0 },
    { detail: 'www.example.org', visits: 1, conversions: 0 },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, 'פסיכולוגיה עברית');
  assert.equal(rows[0].visits, 5);
  assert.equal(rows[0].conversions, 1);
});
