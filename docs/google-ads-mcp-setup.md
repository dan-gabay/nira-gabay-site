# Google Ads MCP (read-only) in Claude Code cloud sessions

Server: official `googleads/google-ads-mcp`, PyPI `google-ads-mcp==0.0.5`, run over
stdio by `scripts/google-ads-mcp/launch.sh` and registered in `.mcp.json`.

- Google Cloud project: `project-7b24914a-d3f7-4f87-83b` (no billing, no Cloud Run)
- Google Ads customer ID: `9813608349` (env `GOOGLE_ADS_CUSTOMER_ID`, pass it per tool call)
- OAuth client ID: env `GOOGLE_ADS_CLIENT_ID`, falling back to `GSC_CLIENT_ID`

## Read-only

The server has no write tools: `customers_list_accessible_customers`,
`search_search` (GAQL `search_stream`) and `metadata_get_resource_metadata`.
`scripts/google-ads-mcp/tools_config.yaml` allowlists exactly those three, so a
future release that adds write tools exposes nothing until it is listed there.
The version is pinned for the same reason.

Google Ads has no read-only OAuth scope (`adwords` is read-write), so read-only
access is enforced by what this server can call. For defense in depth, the Google
user behind the refresh token can be given "Read only" access in Google Ads.

## No developer token

Google sunset Google Ads API developer tokens on 2026-09-09. The
`developer-token` header is now optional and ignored, and API access levels
(Test, Explorer, Basic, Standard) belong to the Google Cloud project that owns
the OAuth client. Access here is Explorer, on `project-7b24914a-d3f7-4f87-83b`.
The server only sends the header when `GOOGLE_ADS_DEVELOPER_TOKEN` is set, and
the launcher unsets it, so no token is needed or stored anywhere.

## Where the secrets live

Nothing secret is in the repo, the environment variables, the setup script, or
the VM. The OAuth client secret and refresh token are stored as **network
secrets** on the cloud environment, and the agent proxy attaches them to the
token-refresh request after it leaves the VM.

The launcher writes a temporary ADC `authorized_user` file (mode 0600). It holds
the client ID and the placeholder `INJECTED_BY_AGENT_PROXY` where the secret and
refresh token would go. google-auth POSTs a form body
(`grant_type=refresh_token&client_id=...&client_secret=...&refresh_token=...`)
to `https://oauth2.googleapis.com/token`. The proxy has to swap in the real
values, and only the resulting 1-hour access token exists inside the VM, in
memory.

Network secrets need a Pro or Max plan and the organization admin role. They are
added in claude.ai/code: environment menu, Edit, Network secrets, Add secret.

## Proxy injection (verified 2026-10-10)

The network secrets for `oauth2.googleapis.com` supply `client_secret` and
`refresh_token`. They do NOT supply `client_id`: a refresh body without it fails
with `invalid_request: Could not determine client ID from request`. The client
ID is not secret and comes from `GSC_CLIENT_ID` (written into the ADC file by
the launcher, so google-auth always sends it). With `client_id` present the
proxy injects the other two and Google returns an `adwords`-scoped token.

Any manual check must send the full body, for example:

    curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://oauth2.googleapis.com/token \
      --data-urlencode grant_type=refresh_token \
      --data-urlencode "client_id=$GSC_CLIENT_ID" \
      --data-urlencode client_secret=INJECTED_BY_AGENT_PROXY \
      --data-urlencode refresh_token=INJECTED_BY_AGENT_PROXY

Expect `200`. Never print the response body: it holds the access token.

## Session registration

`.mcp.json` registers the server; `.claude/settings.json` pre-approves it
(`enabledMcpjsonServers`) and allows its three tools, so a new cloud session
loads `mcp__google-ads__*` without a prompt. The files must be on the branch the
session starts from.

## Verifying the real connection

Verified 2026-10-10 through the MCP server over stdio:

1. `customers_list_accessible_customers` should list `9813608349`.
2. `search_search` on `customer` with `customer.descriptive_name` for that ID.

## When `mcp__google-ads__*` is missing from a session

`launch.sh` runs the server with `uvx`, which downloads `google-ads-mcp` the
first time it runs in a fresh container. If that takes longer than Claude Code
waits for an MCP server at session start, the server is dropped for the whole
session (seen 2026-10-21), even though the launcher works when run later.

Fallback: `scripts/google-ads-mcp/gaql.py` starts the same launcher over stdio
and calls only `search_search` (still behind `tools_config.yaml`), so a
routine can keep reading Ads data:

    python3 -I scripts/google-ads-mcp/gaql.py --resource campaign \
      --fields campaign.name metrics.cost_micros metrics.clicks \
      --conditions "segments.date DURING LAST_7_DAYS"

It is pre-approved in `.claude/settings.json`, so it runs without a prompt.
Every run prints a `FALLBACK:` line on stderr, and a report that used it must
say so: the fallback is a stopgap, not the normal path. The weekly connections
check reports a missing native MCP as a failure until it is fixed.

Fix: warm the `uvx` cache in the cloud environment's Setup script so the
download happens before the session starts (keep the version in step with
`launch.sh`; only sessions started after the change pick it up):

    uvx --quiet --from "google-ads-mcp==0.0.5" google-ads-mcp --help </dev/null >/dev/null 2>&1 || true

## Search Console and GA4

The same OAuth client also serves the Search Console and GA4 scripts in cloud
sessions, through a combined refresh token. See `docs/google-data-cloud-setup.md`.
