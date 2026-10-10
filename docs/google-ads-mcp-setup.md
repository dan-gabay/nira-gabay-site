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

## Verify the proxy with dummy secrets first

Anthropic's docs describe the "Body parameter" credential type as "a token the
API expects in the request body or query string". They do not say whether one
secret can carry two parameters, whether it replaces an existing parameter or
appends a second copy, or what happens with two secrets on the same host. The
refresh only works if both values are replaced exactly once, so this is tested
with dummy values on a public echo host before any real value is entered.

1. Add a network secret: credential type **Body parameter**, allowed websites
   `httpbin.org`, parameter `client_secret`, value `dummy-secret-1`. If the form
   takes more than one parameter, also add `refresh_token` = `dummy-refresh-1`
   to the same secret; otherwise add a second secret for `refresh_token` on the
   same host.
2. In a new session, run `bash scripts/google-ads-mcp/proxy-injection-test.sh`.
   It sends the exact google-auth body with placeholders and prints, per
   parameter, how many copies arrived and whether each is the placeholder.
   Values are never printed, only their length.
3. Pass: `client_secret` and `refresh_token` each show `count=1  other value`.
   Fail: `count=2` (appended), `placeholder` (not injected), or only one of the
   two replaced.
4. Delete the dummy secrets.

Only on a pass are the real secrets added, with allowed websites
`oauth2.googleapis.com` and the same parameter names.

If the test fails, the fallback that stays out of the VM is a service account:
add the service account's email as a user (Read only) in Google Ads, and store
its JSON key as a **GCP access token (with Service Account Key)** network secret
with scope `https://www.googleapis.com/auth/adwords` on
`googleads.googleapis.com`. The proxy then mints and attaches the access token
itself. Two caveats: the Ads API is gRPC, which the proxy README lists as not
supported for injection (calls do pass through and reach Google), and the
server would need a placeholder credential instead of ADC.

## Verifying the real connection

Without secrets, a call returns `invalid_client: The provided client secret is
invalid` from Google. That is expected and shows the chain reaches Google with
the correct client ID. After the real secrets are added, in a new session:

1. `customers_list_accessible_customers` should list `9813608349`.
2. `search_search` on `customer` with `customer.descriptive_name` for that ID.
