#!/usr/bin/env bash
# Starts the official Google Ads MCP server (googleads/google-ads-mcp) over stdio,
# limited to its read-only tools.
#
# This script and the files it writes hold no secrets. The OAuth client secret
# and refresh token are stored as network secrets on the cloud environment, and
# the agent proxy attaches them to requests outside the VM. No developer token
# is used: Google sunset them on 2026-09-09 and the API ignores the header.
# The ADC file below carries only the public client id and placeholders.
# See docs/google-ads-mcp-setup.md.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
client_id="${GOOGLE_ADS_CLIENT_ID:-${GSC_CLIENT_ID:-}}"
if [ -z "$client_id" ]; then
  echo "google-ads-mcp: GOOGLE_ADS_CLIENT_ID (or GSC_CLIENT_ID) is not set" >&2
  exit 1
fi

umask 077
adc="$(mktemp -d "${TMPDIR:-/tmp}/google-ads-mcp.XXXXXX")/adc.json"
python3 -I - "$client_id" "$adc" <<'PY'
import json, sys
placeholder = "INJECTED_BY_AGENT_PROXY"
with open(sys.argv[2], "w") as f:
    json.dump({
        "type": "authorized_user",
        "client_id": sys.argv[1],
        "client_secret": placeholder,
        "refresh_token": placeholder,
    }, f)
PY

# Keep the server in stdio mode, and keep any stray developer token out of the
# process (no longer needed; access is tied to the Cloud project instead).
unset GOOGLE_ADS_DEVELOPER_TOKEN GOOGLE_ADS_MCP_OAUTH_CLIENT_ID GOOGLE_ADS_MCP_OAUTH_CLIENT_SECRET
export GOOGLE_APPLICATION_CREDENTIALS="$adc"
export GOOGLE_ADS_MCP_TOOLS_CONFIG="$here/tools_config.yaml"

exec uvx --quiet --from "google-ads-mcp==0.0.5" google-ads-mcp
