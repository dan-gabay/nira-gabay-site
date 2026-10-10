// Tests for how the Google data scripts build their token refresh request.
//
// Run with `npm test`. No network: only the request is built and inspected.
//
// The point is the mode switch. Locally the real secret goes in the body; in a
// cloud session the body must carry only the proxy placeholder, so no secret
// ever exists in the VM, and the request only goes to Google's documented token endpoint.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenRequest, PROXY_PLACEHOLDER } from '../scripts/google-token';

const CLIENT = 'client-id.apps.googleusercontent.com';

test('local mode: uses the .env.local secret and the per-API refresh token', () => {
  const env = { GSC_CLIENT_ID: CLIENT, GSC_CLIENT_SECRET: 's', GSC_REFRESH_TOKEN: 'r-gsc', GA_REFRESH_TOKEN: 'r-ga' };
  const gsc = tokenRequest('gsc', env);
  assert.equal(gsc.mode, 'local');
  assert.equal(gsc.body.get('refresh_token'), 'r-gsc');
  assert.equal(tokenRequest('ga', env).body.get('refresh_token'), 'r-ga');
  assert.equal(gsc.url, 'https://oauth2.googleapis.com/token');
});

test('local mode: GA falls back to the Search Console refresh token', () => {
  const env = { GSC_CLIENT_ID: CLIENT, GSC_CLIENT_SECRET: 's', GSC_REFRESH_TOKEN: 'r-gsc' };
  assert.equal(tokenRequest('ga', env).body.get('refresh_token'), 'r-gsc');
});

test('proxy mode: only the public client id and placeholders leave the VM', () => {
  const req = tokenRequest('gsc', { GSC_CLIENT_ID: CLIENT });
  assert.equal(req.mode, 'proxy');
  assert.equal(req.body.get('client_id'), CLIENT);
  assert.equal(req.body.get('client_secret'), PROXY_PLACEHOLDER);
  assert.equal(req.body.get('refresh_token'), PROXY_PLACEHOLDER);
  assert.equal(req.body.get('grant_type'), 'refresh_token');
});

test('proxy mode: a secret without a refresh token is not sent half-filled', () => {
  const req = tokenRequest('ga', { GSC_CLIENT_ID: CLIENT, GSC_CLIENT_SECRET: 's' });
  assert.equal(req.mode, 'proxy');
  assert.equal(req.body.get('client_secret'), PROXY_PLACEHOLDER);
});

test('always the documented token endpoint, in both modes', () => {
  assert.equal(tokenRequest('gsc', { GSC_CLIENT_ID: CLIENT }).url, 'https://oauth2.googleapis.com/token');
  assert.equal(
    tokenRequest('ga', { GSC_CLIENT_ID: CLIENT, GOOGLE_TOKEN_URL: 'https://example.com/token' }).url,
    'https://oauth2.googleapis.com/token',
  );
});

test('client id is required', () => {
  assert.throws(() => tokenRequest('gsc', {}), /GSC_CLIENT_ID/);
});
