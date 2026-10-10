# Search Console + GA4 in Claude Code cloud sessions (read-only)

The Search Console and GA4 scripts in `scripts/` run in two modes
(`scripts/google-token.ts`):

- **local**: `.env.local` holds `GSC_CLIENT_SECRET` and a refresh token. Unchanged.
- **proxy**: a cloud session. No secret is in the VM. The scripts send the
  placeholder `INJECTED_BY_AGENT_PROXY` to `https://oauth2.googleapis.com/token`
  and the agent proxy swaps in the client secret and refresh token stored as the
  **network secret** for that host: the same secret the Google Ads MCP uses
  (`docs/google-ads-mcp-setup.md`). The refresh runs through `curl`, which
  honours the proxy; Node's own fetch would bypass it. No extra env var needed.

`/manage` on Vercel does not use these scripts. It keeps reading its own env vars
through `lib/google/auth.ts`, and nothing here changes it.

## One OAuth client, one combined refresh token, one network secret

The existing OAuth client (`GSC_CLIENT_ID`) and Google's documented token
endpoint are used for everything. One refresh token carries:

- `https://www.googleapis.com/auth/adwords` (Google Ads MCP)
- `https://www.googleapis.com/auth/webmasters.readonly` (Search Console, read)
- `https://www.googleapis.com/auth/analytics.readonly` (GA4, read)

The scripts check the granted scopes on every refresh and stop with a clear
message when the one they need is missing. They never print a token.

Non-secret env vars in the cloud environment:

| Variable | Value |
|---|---|
| `GA_PROPERTY_ID` | `544891595` (property id; `400597258` is the account id) |
| `GSC_SITE_URL` | `sc-domain:niragabay.com` |

(GA4 > Admin > Property settings > Property details shows the property id.
Search Console's property picker shows a Domain property without `https://`.)

## Why not a second host

An earlier draft staged the combined token on `accounts.google.com/o/oauth2/token`.
Google's discovery document names only `oauth2.googleapis.com/token`, and
injection on another host cannot be proven without adding a secret there, so
that path was dropped in favour of the documented endpoint.

## Migration: swap the Ads network secret's refresh token (owner only)

The combined token replaces only the **refresh token** of the existing
`oauth2.googleapis.com` network secret. The client secret stays as is. The
token must come from the same OAuth client as `GSC_CLIENT_ID`.

Backup and rollback:
- Before editing, make sure the current Ads refresh token is saved somewhere
  safe (password manager). Swapping does not revoke it: it keeps working until
  revoked, so rollback is pasting it back.
- If it was not saved, the fallback rollback is a new OAuth Playground run with
  the `adwords` scope only. Do not revoke anything until the new setup is verified.
- Do the swap away from the routine times (Mon 09:52 and the 1st at 09:47,
  Asia/Jerusalem).

Steps:
1. claude.ai/code > Nira Marketing environment > Edit > Network secrets >
   `oauth2.googleapis.com`: replace the refresh token value with the combined
   token. Save.
2. Environment variables: add `GA_PROPERTY_ID` and `GSC_SITE_URL` as above.
3. Start a fresh session from main and verify (no token is printed):
   ```bash
   npx tsx scripts/google-check.ts   # token OK (proxy); scope ads/gsc/ga all yes; GSC sites; GA4 sessions
   npx tsx scripts/gsc-query.ts 28 query
   npx tsx scripts/ga-query.ts 28 sessionDefaultChannelGroup sessions
   ```
   and the Google Ads MCP: `customers_list_accessible_customers` lists `9813608349`.
4. If Ads fails: put the old refresh token back (rollback), start a fresh session,
   confirm Ads again.

Env vars reach new sessions only. Whether an already-running session (such as
the ones the routines fire into) sees the new secret before it restarts is not
verified; either way Ads keeps working there, because the old token is not
revoked and the new one also carries `adwords`.
