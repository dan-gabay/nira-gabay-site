// IndexNow: tell the participating search engines that a URL changed, instead
// of waiting for them to come back and find out.
//
// The protocol is one POST. What makes an implementation right or wrong is
// mostly what it does NOT send: IndexNow's own guidance is to submit a URL
// when its content actually changed, and submitting the whole site on every
// deploy is the failure mode it warns about. The diffing that prevents that
// lives in lib/indexnowSync.ts; this file is only the wire format.
//
// One submission reaches every participating engine - Bing, Yandex, Seznam,
// Naver - so there is nothing to gain from posting to each endpoint.

/** 8-128 hex characters, per the spec. Public by design: it is served at the key location. */
export const INDEXNOW_KEY = 'f9039251ba6447b2841d485ce150bb67';

export const INDEXNOW_HOST = 'www.niragabay.com';
export const INDEXNOW_KEY_LOCATION = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`;

const ENDPOINT = 'https://api.indexnow.org/indexnow';

/** The spec's per-request ceiling. */
const MAX_URLS_PER_REQUEST = 10_000;

export type IndexNowResult = {
  submitted: number;
  batches: Array<{ count: number; status: number; ok: boolean; body: string }>;
  skipped: string[];
};

/**
 * What each status means, so a caller logging this does not have to guess.
 * 202 is a success: it means the key had not been read yet and validation is
 * pending, which is the normal answer to a first-ever submission.
 */
export function explainStatus(status: number): string {
  switch (status) {
    case 200: return 'OK - URLs accepted';
    case 202: return 'Accepted - key validation pending (normal on a first submission)';
    case 400: return 'Bad request - malformed payload';
    case 403: return 'Forbidden - the key file could not be verified at the key location';
    case 422: return 'Unprocessable - a URL does not belong to the host, or the key does not match';
    case 429: return 'Too many requests - treated as spam, back off';
    default:  return `Unexpected status ${status}`;
  }
}

/**
 * Submits URLs to IndexNow.
 *
 * Anything not on INDEXNOW_HOST is dropped rather than sent: the API answers a
 * single foreign URL with 422 for the whole batch, so one stray localhost URL
 * from a misconfigured run would silently discard every real one with it.
 */
export async function submitToIndexNow(
  urls: readonly string[],
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<IndexNowResult> {
  const skipped: string[] = [];
  const seen = new Set<string>();

  for (const raw of urls) {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      skipped.push(raw);
      continue;
    }
    if (parsed.protocol !== 'https:' || parsed.host !== INDEXNOW_HOST) {
      skipped.push(raw);
      continue;
    }
    seen.add(parsed.toString());
  }

  const urlList = [...seen];
  const batches: IndexNowResult['batches'] = [];

  for (let i = 0; i < urlList.length; i += MAX_URLS_PER_REQUEST) {
    const chunk = urlList.slice(i, i + MAX_URLS_PER_REQUEST);
    const payload = {
      host: INDEXNOW_HOST,
      key: INDEXNOW_KEY,
      keyLocation: INDEXNOW_KEY_LOCATION,
      urlList: chunk,
    };

    if (dryRun) {
      batches.push({ count: chunk.length, status: 0, ok: true, body: '(dry run - nothing sent)' });
      continue;
    }

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
      });
      batches.push({
        count: chunk.length,
        status: res.status,
        // 200 and 202 are both success; everything else is not.
        ok: res.status === 200 || res.status === 202,
        body: (await res.text()).slice(0, 500),
      });
    } catch (err) {
      batches.push({
        count: chunk.length,
        status: 0,
        ok: false,
        body: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { submitted: urlList.length, batches, skipped };
}
