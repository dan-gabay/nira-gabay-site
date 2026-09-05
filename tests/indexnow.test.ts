// IndexNow: the wire format, the host guard, and the diff that decides whether
// anything is sent at all.
//
// The submission itself is verified by stubbing globalThis.fetch and asserting
// the exact request - method, endpoint, Content-Type and JSON body - because
// that request is the entire protocol, and the live API answers a malformed
// one with a 4xx that is easy to miss in a build log.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  submitToIndexNow,
  explainStatus,
  INDEXNOW_KEY,
  INDEXNOW_HOST,
  INDEXNOW_KEY_LOCATION,
} from '@/lib/indexnow';
import { syncIndexNow } from '@/lib/indexnowSync';

const ROOT = process.cwd();

type Captured = { url: string; init: RequestInit };

/** Runs `fn` with fetch replaced, returning what it was asked to send. */
async function withFetch<T>(
  status: number,
  fn: () => Promise<T>,
): Promise<{ calls: Captured[]; value: T }> {
  const calls: Captured[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response('', { status });
  }) as unknown as typeof fetch;
  try {
    return { calls, value: await fn() };
  } finally {
    globalThis.fetch = original;
  }
}

// ───────────────────────────────────────────────── the key file

test('the key file is served at the key location and holds exactly the key', () => {
  const body = readFileSync(join(ROOT, 'public', `${INDEXNOW_KEY}.txt`), 'utf8');
  assert.equal(body, INDEXNOW_KEY, 'file content is the key, with nothing around it');
  assert.match(INDEXNOW_KEY, /^[a-f0-9]{8,128}$/i, 'key is 8-128 hex characters, per the spec');
  assert.equal(INDEXNOW_KEY_LOCATION, `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`);
});

// ───────────────────────────────────────────────── the request

test('a submission is one POST with the documented body', async () => {
  const { calls } = await withFetch(200, () =>
    submitToIndexNow([`https://${INDEXNOW_HOST}/articles/one`, `https://${INDEXNOW_HOST}/about`]),
  );

  assert.equal(calls.length, 1, 'one request for one batch');
  const [call] = calls;
  assert.equal(call.url, 'https://api.indexnow.org/indexnow');
  assert.equal(call.init.method, 'POST');
  assert.equal(
    (call.init.headers as Record<string, string>)['Content-Type'],
    'application/json; charset=utf-8',
  );

  const body = JSON.parse(String(call.init.body));
  assert.deepEqual(Object.keys(body).sort(), ['host', 'key', 'keyLocation', 'urlList']);
  assert.equal(body.host, INDEXNOW_HOST);
  assert.equal(body.key, INDEXNOW_KEY);
  assert.equal(body.keyLocation, INDEXNOW_KEY_LOCATION);
  assert.deepEqual(body.urlList.sort(), [
    `https://${INDEXNOW_HOST}/about`,
    `https://${INDEXNOW_HOST}/articles/one`,
  ]);
});

test('202 is a success, not a failure', async () => {
  const { value } = await withFetch(202, () =>
    submitToIndexNow([`https://${INDEXNOW_HOST}/about`]),
  );
  assert.equal(value.batches[0].ok, true);
  assert.match(explainStatus(202), /pending/i);
});

test('403 and 422 are failures and say what they mean', async () => {
  const { value } = await withFetch(422, () =>
    submitToIndexNow([`https://${INDEXNOW_HOST}/about`]),
  );
  assert.equal(value.batches[0].ok, false);
  assert.match(explainStatus(403), /key file/i);
  assert.match(explainStatus(422), /host|key/i);
});

test('foreign and non-https URLs are dropped instead of poisoning the batch', async () => {
  // The API answers a single foreign URL with 422 for the whole request, so one
  // stray localhost URL would discard every real one alongside it.
  const { calls, value } = await withFetch(200, () =>
    submitToIndexNow([
      `https://${INDEXNOW_HOST}/about`,
      'http://localhost:3000/about',
      'https://example.com/about',
      `http://${INDEXNOW_HOST}/about`,
      'not a url',
    ]),
  );
  const body = JSON.parse(String(calls[0].init.body));
  assert.deepEqual(body.urlList, [`https://${INDEXNOW_HOST}/about`]);
  assert.equal(value.skipped.length, 4);
});

test('duplicate URLs are sent once', async () => {
  const { calls } = await withFetch(200, () =>
    submitToIndexNow([
      `https://${INDEXNOW_HOST}/about`,
      `https://${INDEXNOW_HOST}/about`,
    ]),
  );
  assert.deepEqual(JSON.parse(String(calls[0].init.body)).urlList, [
    `https://${INDEXNOW_HOST}/about`,
  ]);
});

test('a dry run sends nothing', async () => {
  const { calls, value } = await withFetch(200, () =>
    submitToIndexNow([`https://${INDEXNOW_HOST}/about`], { dryRun: true }),
  );
  assert.equal(calls.length, 0);
  assert.equal(value.submitted, 1);
});

// ───────────────────────────────────────────────── the diff

/** Enough of a Supabase client for getSiteUrls + syncIndexNow. */
function fakeSupabase(articles: unknown[], known: Array<{ url: string; content_key: string }>) {
  const upserted: Array<{ url: string; content_key: string }> = [];
  const client = {
    upserted,
    from(table: string) {
      if (table === 'articles') {
        const q = {
          select: () => q,
          eq: () => Promise.resolve({ data: articles, error: null }),
        };
        return q;
      }
      return {
        select: () => Promise.resolve({ data: known, error: null }),
        upsert: (rows: Array<{ url: string; content_key: string }>) => {
          upserted.push(...rows);
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  return client as unknown as Parameters<typeof syncIndexNow>[0] & { upserted: typeof upserted };
}

const ARTICLE = {
  slug: 'anxiety-in-teens',
  updated_date: '2026-04-01T00:00:00Z',
  created_date: '2026-03-01T00:00:00Z',
  tags: 'חרדה',
};

test('a first run submits everything and records what it sent', async () => {
  const supabase = fakeSupabase([ARTICLE], []);
  const { calls, value } = await withFetch(200, () => syncIndexNow(supabase));

  assert.equal(calls.length, 1);
  assert.ok(value.changed.includes(`https://${INDEXNOW_HOST}/articles/anxiety-in-teens`));
  assert.equal(value.recorded, value.changed.length);
  assert.equal(supabase.upserted.length, value.changed.length);
});

test('a run that changed nothing sends nothing', async () => {
  const first = fakeSupabase([ARTICLE], []);
  await withFetch(200, () => syncIndexNow(first));

  // Second run starts from what the first one recorded.
  const second = fakeSupabase([ARTICLE], first.upserted);
  const { calls, value } = await withFetch(200, () => syncIndexNow(second));

  assert.equal(calls.length, 0, 'no request at all');
  assert.deepEqual(value.changed, []);
  assert.equal(value.reason, 'nothing changed');
});

test('editing one article submits that article and nothing else', async () => {
  const first = fakeSupabase([ARTICLE], []);
  await withFetch(200, () => syncIndexNow(first));

  const edited = { ...ARTICLE, updated_date: '2026-05-05T00:00:00Z' };
  const second = fakeSupabase([edited], first.upserted);
  const { value } = await withFetch(200, () => syncIndexNow(second));

  assert.deepEqual(value.changed, [`https://${INDEXNOW_HOST}/articles/anxiety-in-teens`]);
});

test('a failed submission is not recorded, so the next run retries it', async () => {
  const supabase = fakeSupabase([ARTICLE], []);
  const { value } = await withFetch(429, () => syncIndexNow(supabase));

  assert.ok(value.changed.length > 0);
  assert.equal(value.recorded, 0);
  assert.equal(supabase.upserted.length, 0);
  assert.match(value.errors.join(' '), /429/);
});

test('if the state table cannot be read, nothing is submitted', async () => {
  // Failing open would post the whole sitemap, which is the one outcome the
  // protocol penalises. Better to send nothing and say why.
  const broken = {
    from(table: string) {
      if (table === 'articles') {
        const q = { select: () => q, eq: () => Promise.resolve({ data: [ARTICLE], error: null }) };
        return q;
      }
      return { select: () => Promise.resolve({ data: null, error: { message: 'boom' } }) };
    },
  } as unknown as Parameters<typeof syncIndexNow>[0];

  const { calls, value } = await withFetch(200, () => syncIndexNow(broken));
  assert.equal(calls.length, 0);
  assert.match(String(value.reason), /could not read/);
});

test('a dry run through the sync records nothing', async () => {
  const supabase = fakeSupabase([ARTICLE], []);
  const { calls, value } = await withFetch(200, () => syncIndexNow(supabase, { dryRun: true }));
  assert.equal(calls.length, 0);
  assert.equal(value.recorded, 0);
  assert.equal(supabase.upserted.length, 0);
});

// ───────────────────────────────────────────────── the shared URL list

test('the sitemap and IndexNow read the same list', () => {
  const src = readFileSync(join(ROOT, 'app/sitemap.ts'), 'utf8');
  assert.ok(src.includes('getSiteUrls'), 'sitemap projects the shared list');
  assert.ok(!src.includes('/articles/topic/'), 'sitemap no longer builds URLs of its own');
});
