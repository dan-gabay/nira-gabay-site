import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  sendLeadEmail,
  ownerOnlyAddress,
  isUnverifiedDomain,
  SITE_SENDER,
  RESEND_TEST_SENDER,
} from '../lib/leadNotify';

// Fake lead only: no real enquiry data in tests.
const lead = { name: 'בדיקה', phone: '0500000000', message: 'הודעת בדיקה' };
const OWNER_ONLY =
  '{"message":"You can only send testing emails to your own email address (owner@example.com). To send emails to other recipients, please verify a domain at resend.com/domains, and change the `from` address to an email using this domain.","name":"validation_error","statusCode":403}';
const UNVERIFIED =
  '{"message":"The niragabay.com domain is not verified. Please, add and verify your domain on https://resend.com/domains","name":"validation_error","statusCode":403}';

type Call = { from: string; to: string[]; subject: string; html: string };
let calls: Call[];
const realFetch = globalThis.fetch;

function fakeResend(answer: (c: Call) => { status: number; text?: string }) {
  globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
    const c = JSON.parse(String(init?.body)) as Call;
    calls.push(c);
    const a = answer(c);
    return new Response(a.text ?? '{"id":"x"}', { status: a.status });
  }) as typeof fetch;
}

beforeEach(() => {
  calls = [];
  process.env.RESEND_API_KEY = 'test-key';
  process.env.CONTACT_NOTIFY_EMAIL = 'nira@example.com';
  delete process.env.CONTACT_NOTIFY_FROM;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

test('parses the owner address out of the test-sender refusal', () => {
  assert.equal(ownerOnlyAddress({ status: 403, text: OWNER_ONLY }), 'owner@example.com');
  assert.equal(ownerOnlyAddress({ status: 403, text: UNVERIFIED }), null);
  assert.ok(isUnverifiedDomain({ status: 403, text: UNVERIFIED }));
  assert.ok(!isUnverifiedDomain({ status: 500, text: UNVERIFIED }));
});

test('verified domain: one send, from the site sender, to Nira', async () => {
  fakeResend(() => ({ status: 200 }));
  const r = await sendLeadEmail(lead);
  assert.deepEqual(r, { ok: true, to: ['nira@example.com'] });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].from, SITE_SENDER);
});

test('unverified domain, owner-only test sender: reaches the owner, flagged', async () => {
  fakeResend((c) =>
    c.from !== RESEND_TEST_SENDER
      ? { status: 403, text: UNVERIFIED }
      : c.to.includes('owner@example.com')
        ? { status: 200 }
        : { status: 403, text: OWNER_ONLY },
  );
  const r = await sendLeadEmail(lead);
  assert.equal(calls.length, 3);
  assert.equal(calls[1].from, RESEND_TEST_SENDER);
  assert.deepEqual(calls[2].to, ['owner@example.com']);
  assert.match(calls[2].subject, /לא הגיע לנירה/);
  assert.match(calls[2].html, /nira@example\.com/);
  assert.ok(r.ok && r.ownerOnly === true);
});

test('CONTACT_NOTIFY_FROM set to the test sender skips the domain retry', async () => {
  process.env.CONTACT_NOTIFY_FROM = RESEND_TEST_SENDER;
  fakeResend((c) => (c.to.includes('owner@example.com') ? { status: 200 } : { status: 403, text: OWNER_ONLY }));
  const r = await sendLeadEmail(lead);
  assert.equal(calls.length, 2);
  assert.ok(r.ok && r.ownerOnly);
});

test('any other refusal is reported as send_failed with Resend\'s reason', async () => {
  fakeResend(() => ({ status: 401, text: 'API key is invalid' }));
  const r = await sendLeadEmail(lead);
  assert.equal(calls.length, 1);
  assert.deepEqual(r, { ok: false, reason: 'send_failed', detail: '401: API key is invalid' });
});
