#!/usr/bin/env python3
"""Read-only Google Ads query through the same MCP server, for sessions where
the mcp__google-ads__* tools did not load (the uvx download at session start
can outlast Claude Code's MCP start-up wait).

It starts launch.sh over stdio and calls search_search only: the server's own
read-only allowlist (tools_config.yaml) still applies, and this script refuses
any other tool. Every run prints a FALLBACK notice on stderr so a report can
say the native MCP was missing. See docs/google-ads-mcp-setup.md.

Run from the repo root:
  python3 -I scripts/google-ads-mcp/gaql.py --resource campaign \
    --fields campaign.name metrics.cost_micros metrics.clicks \
    --conditions "segments.date DURING LAST_7_DAYS" [--orderings ...] [--limit 50]
"""
import argparse
import json
import os
import select
import subprocess
import sys
import time

CUSTOMER_ID = "9813608349"
TOOL = "search_search"
HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    ap = argparse.ArgumentParser(description="Read-only GAQL via the Google Ads MCP server")
    ap.add_argument("--customer-id", default=CUSTOMER_ID)
    ap.add_argument("--resource", required=True)
    ap.add_argument("--fields", nargs="+", required=True)
    ap.add_argument("--conditions", nargs="*", default=[])
    ap.add_argument("--orderings", nargs="*", default=[])
    ap.add_argument("--limit", type=int, default=100)
    ap.add_argument("--timeout", type=int, default=180)
    a = ap.parse_args()

    print("FALLBACK: Google Ads queried via scripts/google-ads-mcp/gaql.py "
          "(native mcp__google-ads__* tools not loaded in this session)", file=sys.stderr)

    p = subprocess.Popen(["bash", os.path.join(HERE, "launch.sh")], stdin=subprocess.PIPE,
                         stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)

    def send(msg):
        p.stdin.write(json.dumps(msg) + "\n")
        p.stdin.flush()

    def recv(msg_id):
        end = time.time() + a.timeout
        while time.time() < end:
            ready, _, _ = select.select([p.stdout], [], [], 1)
            if not ready:
                continue
            line = p.stdout.readline()
            if not line:
                return None
            try:
                msg = json.loads(line)
            except ValueError:
                continue
            if msg.get("id") == msg_id:
                return msg
        return None

    try:
        send({"jsonrpc": "2.0", "id": 1, "method": "initialize",
              "params": {"protocolVersion": "2024-11-05", "capabilities": {},
                         "clientInfo": {"name": "gaql-fallback", "version": "1"}}})
        if not recv(1):
            sys.exit("google-ads-mcp: server did not start (see launch.sh)")
        send({"jsonrpc": "2.0", "method": "notifications/initialized"})
        args = {"customer_id": a.customer_id, "resource": a.resource, "fields": a.fields,
                "conditions": a.conditions, "orderings": a.orderings, "limit": a.limit}
        send({"jsonrpc": "2.0", "id": 2, "method": "tools/call",
              "params": {"name": TOOL, "arguments": args}})
        r = recv(2)
        if not r:
            sys.exit("google-ads-mcp: no response to search_search")
        if "error" in r or r.get("result", {}).get("isError"):
            sys.exit("google-ads-mcp: " + json.dumps(r.get("error") or r["result"].get("content"),
                                                     ensure_ascii=False)[:1000])
        result = r["result"]
        rows = (result.get("structuredContent") or {}).get("result")
        if rows is None:
            rows = json.loads(result["content"][0]["text"])
        print(json.dumps(rows, ensure_ascii=False, indent=1))
    finally:
        p.kill()


if __name__ == "__main__":
    main()
