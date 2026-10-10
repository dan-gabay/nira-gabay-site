# Search Console + GA4 in Claude Code cloud sessions (read-only)

The Search Console and GA4 scripts in `scripts/` run in two modes
(`scripts/google-token.ts`):

- **local**: `.env.local` holds `GSC_CLIENT_SECRET` and a refresh token. Unchanged.
- **proxy**: a cloud session. No secret is in the VM. The scripts send the
  placeholder `INJECTED_BY_AGENT_PROXY` and the agent proxy swaps in the client
  secret and refresh token stored as **network secrets** for the token host,
  the same mechanism as the Google Ads MCP (`docs/google-ads-mcp-setup.md`).

`/manage` on Vercel does not use these scripts. It keeps reading its own env vars
through `lib/google/auth.ts`, and nothing here changes it.

## One OAuth client, one combined refresh token

The existing OAuth client (`GSC_CLIENT_ID`) is used for everything. One refresh
token, granted by the Google account that can see all three, carries:

- `https://www.googleapis.com/auth/adwords` (Google Ads MCP)
- `https://www.googleapis.com/auth/webmasters.readonly` (Search Console, read)
- `https://www.googleapis.com/auth/analytics.readonly` (GA4, read)

The scripts check the granted scopes on every refresh and refuse with a clear
message when the one they need is missing. They never print a token.

## Staging without touching the Google Ads secret

The Ads network secret sits on `oauth2.googleapis.com`. Google also accepts
refresh grants at `https://accounts.google.com/o/oauth2/token`, which nothing
uses today. So the combined token can go in a **second** network secret on
`accounts.google.com`, and the scripts are pointed there with
`GOOGLE_TOKEN_URL`. Ads keeps its current secret until a deliberate swap.

| Setting | Kind | Value |
|---|---|---|
| Network secret, host `accounts.google.com` | secret | client secret of the existing OAuth client + the combined refresh token |
| `GOOGLE_TOKEN_URL` | env var, not secret | `https://accounts.google.com/o/oauth2/token` |
| `NODE_USE_ENV_PROXY` | env var, not secret | `1` (Node's fetch otherwise bypasses the proxy, and the placeholder reaches Google unswapped) |
| `GA_PROPERTY_ID` | env var, not secret | numeric GA4 property id |
| `GSC_SITE_URL` | env var, not secret | `sc-domain:niragabay.com` or `https://www.niragabay.com/` |

`GOOGLE_TOKEN_URL` only accepts Google's three token endpoints.

### Finding the two ids

- **GA_PROPERTY_ID**: GA4 > Admin (gear) > Property settings > Property details,
  "PROPERTY ID" (digits only). Not the `G-...` measurement id.
- **GSC_SITE_URL**: Search Console, property picker at top left. A Domain
  property shows `niragabay.com` with no `https://`, so use
  `sc-domain:niragabay.com`. A URL-prefix property shows the full URL; use it
  exactly, with the trailing slash. Once the token works,
  `scripts/google-check.ts` lists the exact strings Google knows.

## Getting the combined token in a browser (OAuth Playground)

The Playground can only use a **Web application** OAuth client, because Google
redirects back to `https://developers.google.com/oauthplayground`. A Desktop-type
client cannot add that redirect; in that case use `scripts/google-auth-paste.ts`
on a computer instead.

1. Google Cloud Console > APIs & Services > Credentials > the existing OAuth
   client: add `https://developers.google.com/oauthplayground` under
   Authorised redirect URIs. Save. (Existing tokens are not affected.)
2. OAuth consent screen: confirm the three scopes are listed and the app is
   **In production** (Testing-mode refresh tokens expire after 7 days).
   APIs enabled: Google Ads API, Google Search Console API, Google Analytics Data API.
3. developers.google.com/oauthplayground > gear icon > "Use your own OAuth
   credentials" > client id and secret of the existing client. Access type Offline.
4. Step 1: paste the three scopes (space-separated) into the input box >
   Authorize APIs > sign in with the account that has Ads, Search Console and
   GA4 access > allow.
5. Step 2: "Exchange authorization code for tokens". Copy the **refresh token**
   straight into the network secret (next section). Never into chat or a file.
6. Remove the Playground redirect URI from the client again, and clear the
   Playground's stored credentials (gear > uncheck).

## Network secret and env vars

claude.ai/code > Nira Marketing environment > Edit:

1. Network secrets > Add: host `accounts.google.com`, the client secret and the
   combined refresh token. Leave the `oauth2.googleapis.com` secret alone.
2. Environment variables: the four non-secret rows from the table above.

New sessions pick these up; a running session does not.

## Verify (no token is printed)

```bash
npx tsx scripts/google-check.ts        # token OK (proxy), scope ads/gsc/ga: yes, GSC sites, GA4 sessions
npx tsx scripts/gsc-query.ts 28 query
npx tsx scripts/ga-query.ts 28 sessionDefaultChannelGroup sessions
```

Then confirm the Google Ads MCP still lists customer `9813608349`.

## Later, optional: one secret for everything

Once the combined token is proven, the `oauth2.googleapis.com` secret can be
switched to it and the `accounts.google.com` secret plus `GOOGLE_TOKEN_URL`
removed. That edits the Ads credential, so it waits for the owner's approval,
and the old Ads token stays valid until revoked (rollback = put it back).
