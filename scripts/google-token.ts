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
 * GOOGLE_TOKEN_URL (not a secret) picks the token endpoint, default
 * oauth2.googleapis.com. It exists so a second network secret can sit on
 * another Google token host without touching the Google Ads one.
 *
 * Never prints a token. /manage on Vercel does not use this file
 * (lib/google/auth.ts reads its own env vars there).
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

export const PROXY_PLACEHOLDER = 'INJECTED_BY_AGENT_PROXY';

const DEFAULT_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Google's refresh-token endpoints. Anything else is refused so a typo can
// never send the request (and the injected secret) somewhere unexpected.
const ALLOWED_TOKEN_URLS = [
  DEFAULT_TOKEN_URL,
  'https://accounts.google.com/o/oauth2/token',
  'https://www.googleapis.com/oauth2/v4/token',
];

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

  const url = env.GOOGLE_TOKEN_URL || DEFAULT_TOKEN_URL;
  if (!ALLOWED_TOKEN_URLS.includes(url)) {
    throw new Error(`GOOGLE_TOKEN_URL must be one of: ${ALLOWED_TOKEN_URLS.join(', ')}`);
  }

  const secret = env.GSC_CLIENT_SECRET;
  const refresh = api === 'ga' ? env.GA_REFRESH_TOKEN || env.GSC_REFRESH_TOKEN : env.GSC_REFRESH_TOKEN;
  const local = Boolean(secret && refresh);

  return {
    mode: local ? 'local' : 'proxy',
    url,
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: local ? secret! : PROXY_PLACEHOLDER,
      refresh_token: local ? refresh! : PROXY_PLACEHOLDER,
      grant_type: 'refresh_token',
    }),
  };
}

export type GoogleToken = { token: string; scopes: string[]; mode: 'local' | 'proxy' };

export async function googleToken(api: GoogleApi, opts: { requireScope?: boolean } = {}): Promise<GoogleToken> {
  const req = tokenRequest(api);
  // Node's built-in fetch ignores HTTPS_PROXY unless told otherwise, and a
  // request that skips the proxy reaches Google with the bare placeholder.
  if (req.mode === 'proxy' && (process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) {
    throw new Error('cloud session: run with NODE_USE_ENV_PROXY=1 so the request goes through the agent proxy');
  }
  const res = await fetch(req.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: req.body,
  });
  const j = (await res.json()) as {
    access_token?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  };
  if (!j.access_token) {
    const why = `${j.error || res.status}${j.error_description ? `: ${j.error_description}` : ''}`;
    const hint =
      req.mode === 'proxy'
        ? ' - no local secret, so this relied on a network secret for that token host; check it exists in the cloud environment'
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
