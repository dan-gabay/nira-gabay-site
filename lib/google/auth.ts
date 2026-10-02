// Access tokens for the Google APIs the admin reads live (Search Console and
// the GA4 Data API). One OAuth client, two refresh tokens: GSC_REFRESH_TOKEN
// carries the Search Console scope, GA_REFRESH_TOKEN the Analytics one, and
// neither works for the other API. Same refresh as scripts/google-check.ts.

export class GoogleNotConfigured extends Error {
  constructor(missing: string[]) {
    super(`Google not configured: missing ${missing.join(', ')}`);
    this.name = 'GoogleNotConfigured';
  }
}

export type GoogleApi = 'gsc' | 'ga';

const REFRESH_VAR: Record<GoogleApi, string> = { gsc: 'GSC_REFRESH_TOKEN', ga: 'GA_REFRESH_TOKEN' };

// Per server instance. Tokens live an hour; refresh a minute early.
const cache: Partial<Record<GoogleApi, { token: string; expires: number }>> = {};

export function googleConfigured(api: GoogleApi): boolean {
  const vars = ['GSC_CLIENT_ID', 'GSC_CLIENT_SECRET', REFRESH_VAR[api]];
  if (api === 'ga') vars.push('GA_PROPERTY_ID');
  return vars.every((v) => process.env[v]);
}

export async function googleToken(api: GoogleApi): Promise<string> {
  const hit = cache[api];
  if (hit && hit.expires > Date.now()) return hit.token;

  const clientId = process.env.GSC_CLIENT_ID;
  const clientSecret = process.env.GSC_CLIENT_SECRET;
  const refresh = process.env[REFRESH_VAR[api]];
  const missing = [
    !clientId && 'GSC_CLIENT_ID',
    !clientSecret && 'GSC_CLIENT_SECRET',
    !refresh && REFRESH_VAR[api],
  ].filter(Boolean) as string[];
  if (missing.length) throw new GoogleNotConfigured(missing);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refresh!,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  });
  const j = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!j.access_token) throw new Error(`Google token refresh failed (${api}): ${j.error || res.status}`);
  cache[api] = { token: j.access_token, expires: Date.now() + ((j.expires_in || 3600) - 60) * 1000 };
  return j.access_token;
}
