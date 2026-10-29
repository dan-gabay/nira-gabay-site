import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageType, trafficType } from '../lib/clarity';

test('trafficType: ad clicks are paid', () => {
  assert.equal(trafficType('?gclid=abc', ''), 'paid');
  assert.equal(trafficType('?utm_source=google&utm_medium=cpc', 'https://www.google.com/'), 'paid');
  assert.equal(trafficType('?gbraid=x', ''), 'paid');
});

test('trafficType: search, AI, referral and direct', () => {
  assert.equal(trafficType('', 'https://www.google.co.il/'), 'organic');
  assert.equal(trafficType('', 'https://chatgpt.com/'), 'ai');
  assert.equal(trafficType('', 'https://www.m-y-net.co.il/article/1'), 'referral');
  assert.equal(trafficType('', ''), 'direct');
  assert.equal(trafficType('', 'https://www.niragabay.com/about'), 'direct');
  assert.equal(trafficType('', 'not a url'), 'direct');
});

test('pageType', () => {
  assert.equal(pageType('/'), 'home');
  assert.equal(pageType('/services/cbt'), 'service');
  assert.equal(pageType('/articles'), 'articles');
  assert.equal(pageType('/articles/some-slug'), 'article');
  assert.equal(pageType('/contact'), 'contact');
  assert.equal(pageType('/accessibility'), 'other');
});
