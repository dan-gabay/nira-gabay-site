// Tests for lib/countableDeployment.ts: preview and local visits must never
// reach the analytics tables, and the live site must always count.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCountableDeployment } from '@/lib/countableDeployment';

test('the live Vercel deployment counts', () => {
  assert.equal(isCountableDeployment({ VERCEL_ENV: 'production', NODE_ENV: 'production' }), true);
});

test('a pull-request preview does not count, although it is a production build', () => {
  assert.equal(isCountableDeployment({ VERCEL_ENV: 'preview', NODE_ENV: 'production' }), false);
});

test('vercel dev does not count', () => {
  assert.equal(isCountableDeployment({ VERCEL_ENV: 'development', NODE_ENV: 'development' }), false);
});

test('off Vercel, a local dev server does not count', () => {
  assert.equal(isCountableDeployment({ NODE_ENV: 'development' }), false);
});

test('off Vercel, a production build counts', () => {
  assert.equal(isCountableDeployment({ NODE_ENV: 'production' }), true);
});
