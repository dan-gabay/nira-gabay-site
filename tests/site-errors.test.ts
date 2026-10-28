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

test('every public route passes the visitor user agent to recordSiteError', async () => {
  // Without it botKindFromUserAgent sees no user agent and stores
  // 'automation', and the weekly check (bot_kind IS NULL) never sees a real
  // visitor's failure - which is how the 25 Oct email-notice failure was missed.
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const apiDir = join(__dirname, '..', 'app', 'api');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(dir, e.name));
      else if (e.name === 'route.ts') files.push(join(dir, e.name));
    }
  };
  walk(apiDir);
  let calls = 0;
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/recordSiteError\(\{[\s\S]*?\}\)/g)) {
      calls++;
      assert.match(m[0], /userAgent:/, `${f}: ${m[0]}`);
    }
  }
  assert.ok(calls > 0);
});
