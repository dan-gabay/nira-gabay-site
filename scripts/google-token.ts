/**
 * Access tokens for the Search Console and GA4 scripts, in one place.
 *
 * Two modes, picked from the environment:
 *
 *   local  GSC_CLIENT_SECRET and the refresh token are in .env.local (the
 *          owner's computer). Behaves exactly as the scripts always did:
 *          GSC_REFRESH_TOKEN for Search Console, GA_REFRESH_TOKEN for GA4,
 *          falling back to GSC_REFRESH_TOKEN when only that one is set.
 *
 *   proxy  Claude Code cloud session. No secret is in the VM. The scripts send
 *          the placeholder below and the agent proxy swaps in the client secret
 *          and refresh token stored as network secrets for the token host.
 *          Only GSC_CLIENT_ID (public) is needed. See docs/google-ads-mcp-setup.md.
 *
 * Always Google's documented token endpoint (oauth2.googleapis.com), the
 * same host and network secret the Google Ads MCP uses, so one combined
 * refresh token (adwords + webmasters.readonly + analytics.readonly) serves
 * all three.
 *
 * In proxy mode the refresh goes through curl, which honours HTTPS_PROXY.
 * Node's built-in fetch ignores it unless NODE_USE_ENV_PROXY=1 is set for the
 * whole process, and a request that skips the proxy reaches Google with the
 * bare placeholder.
 *
 * Never prints a token. /manage on Vercel does not use this file
 * (lib/google/auth.ts reads its own env vars there).
 */
import { execFile } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

export const PROXY_PLACEHOLDER = 'INJECTED_BY_AGENT_PROXY';

export const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export const SCOPES = {
  ads: 'https://www.googleapis.com/auth/adwords',
  gsc: 'https://www.googleapis.com/auth/webmasters.readonly',
  ga: 'https://www.googleapis.com/auth/analytics.readonly',
};

export type GoogleApi = 'gsc' | 'ga';

export type TokenRequest = {
  mode: 'local' | 'proxy';
  url: string;
  body: URLSearchParams;
};

export function tokenRequest(api: GoogleApi, env: NodeJS.ProcessEnv = process.env): TokenRequest {
  const clientId = env.GSC_CLIENT_ID;
  if (!clientId) throw new Error('Missing GSC_CLIENT_ID (public OAuth client id)');

  const secret = env.GSC_CLIENT_SECRET;
  const refresh = api === 'ga' ? env.GA_REFRESH_TOKEN || env.GSC_REFRESH_TOKEN : env.GSC_REFRESH_TOKEN;
  const local = Boolean(secret && refresh);

  return {
    mode: local ? 'local' : 'proxy',
    url: TOKEN_URL,
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: local ? secret! : PROXY_PLACEHOLDER,
      refresh_token: local ? refresh! : PROXY_PLACEHOLDER,
      grant_type: 'refresh_token',
    }),
  };
}

type TokenResponse = { access_token?: string; scope?: string; error?: string; error_description?: string };

async function viaFetch(req: TokenRequest): Promise<TokenResponse> {
  const res = await fetch(req.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: req.body,
  });
  return (await res.json()) as TokenResponse;
}

// Arguments carry only the public client id and placeholders; the response
// (with the access token) stays in memory.
function viaCurl(req: TokenRequest): Promise<TokenResponse> {
  const args = ['-sS', '--max-time', '30', '-X', 'POST', req.url];
  for (const [k, v] of req.body) args.push('--data-urlencode', `${k}=${v}`);
  return new Promise((resolve, reject) => {
    execFile('curl', args, (err, stdout) => {
      if (err) return reject(new Error(`token refresh failed (proxy): curl ${err.message.split('\n')[0]}`));
      try {
        resolve(JSON.parse(stdout) as TokenResponse);
      } catch {
        reject(new Error('token refresh failed (proxy): response was not JSON'));
      }
    });
  });
}

export type GoogleToken = { token: string; scopes: string[]; mode: 'local' | 'proxy' };

export async function googleToken(api: GoogleApi, opts: { requireScope?: boolean } = {}): Promise<GoogleToken> {
  const req = tokenRequest(api);
  const j = req.mode === 'proxy' ? await viaCurl(req) : await viaFetch(req);
  if (!j.access_token) {
    const why = `${j.error || 'no access_token'}${j.error_description ? `: ${j.error_description}` : ''}`;
    const hint =
      req.mode === 'proxy'
        ? ' - no local secret, so this relied on a network secret for that token host; check it exists in the cloud environment for oauth2.googleapis.com'
        : '';
    throw new Error(`token refresh failed (${req.mode}): ${why}${hint}`);
  }
  const scopes = (j.scope || '').split(' ').filter(Boolean);
  // Google lists the granted scopes on every refresh; only judge when it did.
  if (opts.requireScope !== false && scopes.length && !scopes.includes(SCOPES[api])) {
    throw new Error(
      `token has no ${api === 'gsc' ? 'Search Console' : 'GA4'} scope (${SCOPES[api]}); ` +
        `it carries: ${scopes.join(', ') || 'unknown'}. Run scripts/google-check.ts.`,
    );
  }
  return { token: j.access_token, scopes, mode: req.mode };
}

export async function accessTokenFor(api: GoogleApi): Promise<string> {
  return (await googleToken(api)).token;
}
