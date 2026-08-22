#!/usr/bin/env tsx
/**
 * Google OAuth for Search Console and the GA4 Data API, in the split setup
 * where the browser and the shell are on different machines.
 *
 * scripts/gsc-auth.ts and scripts/ga-auth.ts open a loopback listener on
 * localhost:53682 and wait for the browser to redirect into it. That only
 * works when the browser and the script are the same computer. When Claude
 * runs in a container, the owner's browser cannot reach that port, so the
 * flow never completes.
 *
 * This variant splits the two halves:
 *
 *   step 1  prints the consent URL. The owner opens it and approves.
 *           Google redirects to http://localhost:53682/?code=... which fails
 *           to load - that is expected and fine. The code is in the address
 *           bar.
 *
 *   step 2  the owner pastes that whole URL back, and the code is exchanged
 *           for a refresh token here. The token is appended to .env.local and
 *           never printed.
 *
 * Read-only scopes only. This can look at data; it cannot change anything.
 *
 *   npx tsx scripts/google-auth-paste.ts url
 *   npx tsx scripts/google-auth-paste.ts exchange "http://localhost:53682/?code=..."
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

const ENV_PATH = path.join(process.cwd(), '.env.local');
dotenv.config({ path: ENV_PATH });

const CLIENT_ID = process.env.GSC_CLIENT_ID;
const CLIENT_SECRET = process.env.GSC_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:53682';

// One consent covering both APIs, so this is done once rather than twice.
//
// Default is readonly: this can look at data and change nothing. Passing
// --edit swaps the GA4 scope for analytics.edit, which additionally allows
// creating key events and other property configuration - useful because GA4
// will not offer an event in its pick-list until that event has fired at
// least once, so a conversion that has never happened cannot be marked
// through the UI at all.
const EDIT = process.argv.includes('--edit');

const SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  EDIT
    ? 'https://www.googleapis.com/auth/analytics.edit'
    : 'https://www.googleapis.com/auth/analytics.readonly',
].join(' ');

function requireClient() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      'Missing GSC_CLIENT_ID / GSC_CLIENT_SECRET in .env.local.\n' +
        'Create an OAuth client of type "Desktop app" in Google Cloud Console,\n' +
        'and add http://localhost:53682 as an authorised redirect URI.',
    );
  }
}

function printUrl() {
  requireClient();
  const url =
    'https://accounts.google.com/o/oauth2/v2/auth' +
    `?client_id=${encodeURIComponent(CLIENT_ID!)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    '&response_type=code' +
    `&scope=${encodeURIComponent(SCOPES)}` +
    '&access_type=offline' +
    '&prompt=consent';

  console.log(
    `\nScopes: Search Console (read) + GA4 (${EDIT ? 'READ AND WRITE' : 'read'})`,
  );
  console.log('\nOpen this in the browser, approve, then copy the URL you land on:\n');
  console.log(url);
  console.log(
    '\nThe page will show "site cannot be reached". That is expected - nothing\n' +
      'is listening on that port. Only the address bar matters.\n',
  );
}

async function exchange(raw: string) {
  requireClient();

  let code: string | null = null;
  try {
    code = new URL(raw).searchParams.get('code');
  } catch {
    code = raw.trim() || null; // allow pasting just the code
  }
  if (!code) throw new Error('No ?code= found in what you pasted.');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  const body = (await res.json()) as { refresh_token?: string; error_description?: string; error?: string };
  if (!res.ok || !body.refresh_token) {
    throw new Error(
      `Token exchange failed: ${body.error_description || body.error || res.status}\n` +
        'An authorisation code can only be used once, and expires in minutes. ' +
        'Re-run the url step for a fresh one.',
    );
  }

  const existing = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
  const cleaned = existing
    .split('\n')
    .filter((l) => !/^(GSC_REFRESH_TOKEN|GA_REFRESH_TOKEN)=/.test(l))
    .join('\n')
    .replace(/\n+$/, '');

  // Both scripts read their own variable name; one token serves both.
  fs.writeFileSync(
    ENV_PATH,
    `${cleaned}\nGSC_REFRESH_TOKEN=${body.refresh_token}\nGA_REFRESH_TOKEN=${body.refresh_token}\n`,
  );

  console.log('\nRefresh token saved to .env.local (not printed).');
  console.log('Still needed there: GSC_SITE_URL and GA_PROPERTY_ID.\n');
}

const [cmd, arg] = process.argv.slice(2);
const run =
  cmd === 'url' ? Promise.resolve(printUrl())
  : cmd === 'exchange' ? exchange(arg || '')
  : Promise.reject(new Error('Usage: google-auth-paste.ts url | exchange "<redirect url>"'));

run.catch((e) => {
  console.error(String(e instanceof Error ? e.message : e));
  process.exit(1);
});
