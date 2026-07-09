#!/usr/bin/env tsx
/**
 * One-time Google Analytics (GA4) OAuth authorization.
 *
 * Reuses the same GSC_CLIENT_ID / GSC_CLIENT_SECRET OAuth client already set
 * up for Search Console (same Google Cloud project - an OAuth client isn't
 * scoped to one API, it just needs the target API enabled on the project and
 * the scope registered on the consent screen). Starts a loopback listener
 * (Google's desktop-app flow), prints the authorization URL, and when the
 * browser redirects back it exchanges the code and appends GA_REFRESH_TOKEN
 * to .env.local. Read-only scope. Never prints tokens.
 *
 * Before running, in the same Google Cloud project used for GSC:
 *   1. APIs & Services > Library > enable "Google Analytics Data API" and
 *      "Google Analytics Admin API"
 *   2. APIs & Services > OAuth consent screen > Data Access > Add or remove
 *      scopes > add https://www.googleapis.com/auth/analytics.readonly > Save
 *
 *   npx tsx scripts/ga-auth.ts          # read-only (reporting)
 *   npx tsx scripts/ga-auth.ts --edit   # + Admin API writes (scripts/ga-setup.ts)
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';

const ENV_PATH = path.join(process.cwd(), '.env.local');
dotenv.config({ path: ENV_PATH });

const CLIENT_ID = process.env.GSC_CLIENT_ID;
const CLIENT_SECRET = process.env.GSC_CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('Missing GSC_CLIENT_ID / GSC_CLIENT_SECRET in .env.local');

// Same port as scripts/gsc-auth.ts on purpose - it's already registered as an
// authorized redirect URI on this OAuth client, so reusing it avoids a trip
// back to the Cloud Console to register a second one.
const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}`;
// --edit adds the config-write scope needed once by scripts/ga-setup.ts
// (key events, custom dimensions, data retention). readonly stays in the
// grant either way so the same token keeps working for ga-query.ts.
const SCOPE = process.argv.includes('--edit')
  ? 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/analytics.edit'
  : 'https://www.googleapis.com/auth/analytics.readonly';

const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth' +
  `?client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  '&response_type=code' +
  `&scope=${encodeURIComponent(SCOPE)}` +
  '&access_type=offline' +
  '&prompt=consent';

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', REDIRECT_URI);
  const code = url.searchParams.get('code');
  const err = url.searchParams.get('error');

  if (err) {
    res.end('Authorization failed: ' + err + ' - you can close this tab.');
    console.error('Authorization error:', err);
    server.close();
    process.exit(1);
  }
  if (!code) {
    res.end('Waiting for Google redirect...');
    return;
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = (await tokenRes.json()) as { refresh_token?: string; error?: string; error_description?: string };
    if (!tokens.refresh_token) {
      throw new Error(`Token exchange failed: ${tokens.error} ${tokens.error_description || ''}`);
    }

    let env = fs.readFileSync(ENV_PATH, 'utf8');
    if (/^GA_REFRESH_TOKEN=/m.test(env)) {
      env = env.replace(/^GA_REFRESH_TOKEN=.*$/m, `GA_REFRESH_TOKEN=${tokens.refresh_token}`);
    } else {
      env += `${env.endsWith('\n') ? '' : '\n'}GA_REFRESH_TOKEN=${tokens.refresh_token}\n`;
    }
    fs.writeFileSync(ENV_PATH, env);

    res.end('Authorized! You can close this tab and go back to the terminal.');
    console.log('SUCCESS: refresh token saved to .env.local');
    server.close();
    process.exit(0);
  } catch (e) {
    res.end('Token exchange failed - check the terminal.');
    console.error(e);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log('Open this URL in your browser and approve access:');
  console.log('');
  console.log(authUrl);
  console.log('');
  console.log(`Listening on ${REDIRECT_URI} for the redirect...`);
});
