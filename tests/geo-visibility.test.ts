// Tests for lib/geo/visibility.ts. The point of the module is that it never
// shows a result that was not observed, so most of these are about refusing.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  PROVIDERS,
  buildVisibilityReport,
  loadVisibilityReport,
  validateObservation,
  type Observation,
  type Prompt,
} from '@/lib/geo/visibility';

const PROMPTS: Prompt[] = [
  { id: 'a', text: 'מטפלת CBT באזור מבשרת ציון', service: 'cbt', area: 'מבשרת', active: true, added: '2026-10-24' },
  { id: 'b', text: 'הדרכת הורים באזור ירושלים', service: 'parent-guidance', area: 'ירושלים', active: true, added: '2026-10-24' },
  { id: 'old', text: 'retired', service: 'x', area: 'x', active: false, added: '2026-01-01' },
];

const obs = (o: Partial<Observation>): Observation => ({
  id: 'x',
  prompt_id: 'a',
  provider: 'google_ai_overview',
  observed_at: '2026-10-24T12:00:00Z',
  method: 'serpapi',
  evidence: 'observed',
  answer_present: true,
  nira_mentioned: false,
  nira_linked: false,
  position: null,
  competitors: [],
  cited_sources: ['betipulnet.co.il'],
  observer: 'test',
  ...o,
});

test('every active prompt x provider pair is a cell, and an unmeasured one says so', () => {
  const r = buildVisibilityReport(PROMPTS, []);
  assert.equal(r.totalPairs, 2 * PROVIDERS.length);
  assert.equal(r.measuredPairs, 0);
  assert.ok(r.cells.every((c) => c.latest === null));
  assert.equal(r.lastObserved, null);
  assert.ok(!r.prompts.some((p) => p.id === 'old'));
});

test('latest and previous are by date, not file order', () => {
  const r = buildVisibilityReport(PROMPTS, [
    obs({ id: '1', observed_at: '2026-09-01T00:00:00Z', nira_mentioned: true, position: 2 }),
    obs({ id: '3', observed_at: '2026-11-01T00:00:00Z' }),
    obs({ id: '2', observed_at: '2026-10-01T00:00:00Z' }),
  ]);
  const c = r.cells.find((x) => x.prompt_id === 'a' && x.provider === 'google_ai_overview')!;
  assert.equal(c.latest?.id, '3');
  assert.equal(c.previous?.id, '2');
  assert.equal(c.history.length, 3);
  // Mentioned once, but not in the latest observation: not counted as mentioned now.
  assert.equal(r.mentionedPrompts, 0);
  assert.equal(r.measuredPrompts, 1);
});

test('estimates are kept but never become a result', () => {
  const r = buildVisibilityReport(PROMPTS, [obs({ id: 'e', evidence: 'estimate', nira_mentioned: true, position: 1 })]);
  assert.equal(r.measuredPairs, 0);
  assert.equal(r.mentionedPrompts, 0);
  assert.equal(r.estimates.length, 1);
});

test('ChatGPT cannot be "measured" through an API or SerpApi: generic model output is not ChatGPT Search', () => {
  const errors = validateObservation(obs({ provider: 'chatgpt_search', method: 'api' }), new Set(['a']));
  assert.ok(errors.some((e) => e.includes('cannot be measured')));
  const r = buildVisibilityReport(PROMPTS, [obs({ id: 'bad', provider: 'chatgpt_search', method: 'serpapi' })]);
  assert.equal(r.measuredPairs, 0);
  assert.equal(r.invalid[0].id, 'bad');
});

test('impossible observations are rejected', () => {
  const ids = new Set(['a']);
  assert.ok(validateObservation(obs({ prompt_id: 'nope' }), ids).length);
  assert.ok(validateObservation(obs({ observed_at: 'yesterday' }), ids).length);
  assert.ok(validateObservation(obs({ position: 2, nira_mentioned: false }), ids).length);
  assert.ok(validateObservation(obs({ position: 0, nira_mentioned: true }), ids).length);
  assert.ok(validateObservation(obs({ answer_present: false, nira_mentioned: true }), ids).length);
  assert.deepEqual(validateObservation(obs({ position: 1, nira_mentioned: true }), ids), []);
});

test('cited sources are counted once per observation, across prompts', () => {
  const r = buildVisibilityReport(PROMPTS, [
    obs({ id: '1', cited_sources: ['betipulnet.co.il', 'betipulnet.co.il', 'b144.co.il'] }),
    obs({ id: '2', prompt_id: 'b', cited_sources: ['betipulnet.co.il'] }),
  ]);
  assert.deepEqual(r.sources, [
    { source: 'betipulnet.co.il', count: 2 },
    { source: 'b144.co.il', count: 1 },
  ]);
});

test('the observations committed in the repo are all valid', () => {
  const r = loadVisibilityReport();
  assert.deepEqual(r.invalid, []);
  assert.ok(r.measuredPairs > 0);
  // Every committed observation is evidence, not an estimate.
  assert.equal(r.estimates.length, 0);
});
