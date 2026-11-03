# Campaign negative keywords (Google Ads API)

`scripts/google-ads-mcp/negatives.sh` adds campaign-level negative keywords to
campaign `24176893630` (customer `9813608349`). It uses the same OAuth client and
proxy-injected token as the read-only MCP server (`launch.sh`), and the
`google-ads` library already inside the pinned `google-ads-mcp==0.0.5` env. No new
connection, credential or developer token. The MCP server itself stays read-only.

Write access was verified on 2026-11-03 with a `validate_only` request (accepted,
nothing written; an over-long keyword was rejected, so validation is real).

## Usage

    bash scripts/google-ads-mcp/negatives.sh selftest
    bash scripts/google-ads-mcp/negatives.sh check terms.json        # validate_only, writes nothing
    bash scripts/google-ads-mcp/negatives.sh apply terms.json --log /mnt/project-files/nira-growth/change-log.md

`terms.json`:

    [{"text": "משרות פסיכותרפיסט", "match": "EXACT", "category": "jobs",
      "reason": "job seeker", "cost_ils": 6.2}]

`category` is one of `jobs`, `studies`, `free`, `other_profession`,
`therapist_name`, `other`.

## Rules (Dan, 2026-11-03)

| Decision | When |
|---|---|
| **auto** (written by `apply`) | EXACT match, category `jobs` / `studies` / `free` / `other_profession` / `therapist_name` |
| **needs_approval** (reported, never written without `--approved`) | PHRASE match; category `other`; any CBT word (CBT is a service, commercial CBT is never blocked); a therapist name with fewer than two words; anything over 15 per run |
| **blocked** (never written, even with `--approved`) | Nira's own name (נירה, גבאי, nira, gabay); BROAD match; empty or longer than 80 characters; unknown category |
| **skipped** | the text is already a campaign negative in any match type |

`apply` always runs `validate_only` first and writes only if the whole batch
validates. It never removes or changes an existing negative. `--approved` is used
only when Dan approved every term in the file by name in the thread. Each apply
appends one line to the change log given with `--log`; the result lists each
new criterion's resource name, so a mistaken term can be removed in the Ads UI.

Child-therapy searches are a real service (Nira treats children) and must not be
sent as negatives in any category.

## Consumer

The daily search-terms routine (thread "בדיקת חיפושים שבועית") classifies
irrelevant terms, runs `apply` for the auto categories, and reports what was added
plus the `needs_approval` list with Dan's negatives link and a paste-ready list.
