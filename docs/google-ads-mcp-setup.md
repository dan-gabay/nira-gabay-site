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

## Where the secrets live

Nothing secret is in the repo, the environment variables, the setup script, or
the VM. Three values are stored as **network secrets** on the cloud environment.
The agent proxy attaches them to outgoing requests after they leave the VM:

| Network secret | Credential type | Allowed websites | Carries |
|---|---|---|---|
| Google OAuth refresh | Body parameter | `oauth2.googleapis.com` | `client_secret`, `refresh_token` |
| Google Ads developer token | Bearer, header `developer-token`, prefix cleared | `googleads.googleapis.com` | developer token |

The launcher writes a temporary ADC `authorized_user` file (mode 0600). It holds
the client ID and the placeholder `INJECTED_BY_AGENT_PROXY` where the secret and
refresh token would go. google-auth refreshes against `oauth2.googleapis.com`,
the proxy supplies the real values, and only the resulting 1-hour access token
exists inside the VM, in memory.

Network secrets need a Pro or Max plan and the organization admin role. They are
added in claude.ai/code: environment menu, Edit, Network secrets, Add secret.

## Verifying

Without secrets, a call returns `invalid_client: The provided client secret is
invalid` from Google. That is expected and shows the chain reaches Google with
the correct client ID. After the secrets are added, in a new session:

1. `customers_list_accessible_customers` should list `9813608349`.
2. `search_search` on `customer` with `customer.descriptive_name` for that ID.

Not yet confirmed (only testable once the secrets exist): whether the Body
parameter type replaces the placeholder values rather than appending duplicates,
and whether one Body parameter secret can carry two parameters.
