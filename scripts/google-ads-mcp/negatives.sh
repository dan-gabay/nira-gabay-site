#!/usr/bin/env bash
# Adds campaign-level negative keywords to the Nira campaign through the Google
# Ads API, with the same OAuth client and proxy-injected token as launch.sh
# (no new connection, credential or developer token). The MCP server itself
# stays read-only. All rules live in negatives.py; see
# docs/google-ads-negatives.md.
#
#   bash scripts/google-ads-mcp/negatives.sh check  terms.json   # validate_only, writes nothing
#   bash scripts/google-ads-mcp/negatives.sh apply  terms.json   # writes auto-eligible terms only
#   bash scripts/google-ads-mcp/negatives.sh selftest            # offline rule tests
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
pkg="google-ads-mcp==0.0.5"

if [ "${1:-}" != "selftest" ]; then
  client_id="${GOOGLE_ADS_CLIENT_ID:-${GSC_CLIENT_ID:-}}"
  if [ -z "$client_id" ]; then
    echo "negatives: GOOGLE_ADS_CLIENT_ID (or GSC_CLIENT_ID) is not set" >&2
    exit 1
  fi
  umask 077
  adc="$(mktemp -d "${TMPDIR:-/tmp}/google-ads-neg.XXXXXX")/adc.json"
  python3 -I - "$client_id" "$adc" <<'PY'
import json, sys
p = "INJECTED_BY_AGENT_PROXY"
with open(sys.argv[2], "w") as f:
    json.dump({"type": "authorized_user", "client_id": sys.argv[1],
               "client_secret": p, "refresh_token": p}, f)
PY
  unset GOOGLE_ADS_DEVELOPER_TOKEN
  export GOOGLE_APPLICATION_CREDENTIALS="$adc"
fi

# Same pinned package as launch.sh: it already carries the google-ads library.
if uvx --offline --quiet --from "$pkg" python -c "" >/dev/null 2>&1; then
  exec uvx --offline --quiet --from "$pkg" python -I "$here/negatives.py" "$@"
fi
exec uvx --quiet --from "$pkg" python -I "$here/negatives.py" "$@"
