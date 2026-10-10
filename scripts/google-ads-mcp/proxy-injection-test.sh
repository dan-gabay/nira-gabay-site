#!/usr/bin/env bash
# Checks how the agent proxy's "Body parameter" network secret rewrites an OAuth
# token-refresh body, using DUMMY secrets on a public echo host. Run it only
# after adding a dummy secret for that host (see docs/google-ads-mcp-setup.md).
#
# It sends the same form body google-auth sends to oauth2.googleapis.com, with
# placeholder values, and reports for each parameter how many times it arrived
# and whether the placeholder was replaced. Values are never printed, only
# their length, so the script is safe even if a real secret was used by mistake.
#
# Usage: bash scripts/google-ads-mcp/proxy-injection-test.sh [echo-host]
set -euo pipefail

host="${1:-httpbin.org}"
placeholder="INJECTED_BY_AGENT_PROXY"

body=$(curl -sS -m 20 -X POST "https://$host/anything" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=refresh_token" \
  --data-urlencode "client_id=dummy-client-id.apps.googleusercontent.com" \
  --data-urlencode "client_secret=$placeholder" \
  --data-urlencode "refresh_token=$placeholder")

python3 -I -c '
import json, sys
placeholder = sys.argv[1]
form = json.loads(sys.stdin.read()).get("form", {})
for name in ("grant_type", "client_id", "client_secret", "refresh_token"):
    vals = form.get(name, [])
    vals = vals if isinstance(vals, list) else [vals]
    states = ["placeholder" if v == placeholder else "other value (len %d)" % len(v) for v in vals]
    print("%-14s count=%d  %s" % (name, len(vals), ", ".join(states) or "missing"))
extra = sorted(set(form) - {"grant_type", "client_id", "client_secret", "refresh_token"})
if extra:
    print("extra params:", ", ".join(extra))
' "$placeholder" <<<"$body"
