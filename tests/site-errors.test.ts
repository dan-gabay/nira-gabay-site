import { test } from 'node:test';
import assert from 'node:assert/strict';
import { siteErrorSource, isSiteErrorSource, isTrackedEvent, isConversion } from '../lib/siteEvents';

test('siteErrorSource builds action:reason for known actions only', () => {
  assert.equal(siteErrorSource('contact_form', 'phone_rejected'), 'contact_form:phone_rejected');
  assert.equal(siteErrorSource('contact_form', 'http_502'), 'contact_form:http_502');
  assert.equal(siteErrorSource('client_js', 'TypeError'), 'client_js:typeerror');
  assert.equal(siteErrorSource('not_an_action', 'x'), null);
});

test('reason is reduced to a short lowercase code', () => {
  // Callers pass codes of ours; this only guarantees the shape the ingest
  // route accepts, whatever a future caller hands it.
  const s = siteErrorSource('comment', 'Not A Code!'.repeat(10));
  assert.ok(s && /^comment:[a-z0-9_]{1,40}$/.test(s));
});

test('ingest accepts only sources siteErrorSource could make', () => {
  assert.ok(isSiteErrorSource('contact_notify_email:send_failed'));
  assert.ok(!isSiteErrorSource('contact_form:hello world'));
  assert.ok(!isSiteErrorSource('whatever:x'));
  assert.ok(!isSiteErrorSource(null));
  assert.ok(!isSiteErrorSource('contact_form'));
});

test('site_error is stored but never a conversion', () => {
  assert.ok(isTrackedEvent('site_error'));
  assert.ok(!isConversion('site_error'));
});
