---
name: google-data
description: Pull Search Console, GA4 and Google Ads data for niragabay.com, and know which of the three can answer a given question. Use whenever asked about organic search, impressions, CTR, average position, keywords, ad performance, or "how did people find the site" - and before claiming any of it is unavailable.
---

# Google data for niragabay.com

The tooling exists and works. What is usually missing is the credentials, and
the fastest way to waste a turn is to reason about that instead of checking.

## Check first, always

```bash
for v in GSC_CLIENT_ID GSC_CLIENT_SECRET GSC_REFRESH_TOKEN GA_REFRESH_TOKEN GA_PROPERTY_ID GSC_SITE_URL; do
  [ -n "${!v}" ] && echo "$v set" || echo "$v MISSING"
done; ls .env.local 2>/dev/null || echo "no .env.local"
```

Then run `npx tsx scripts/google-check.ts`. In a cloud session no secret is in
the VM: with only `GSC_CLIENT_ID` set, the scripts run in **proxy mode** and the
agent proxy injects the client secret and refresh token from network secrets
(`scripts/google-token.ts`, `docs/google-data-cloud-setup.md`). The check prints
the mode and which scopes the token carries (ads / gsc / ga, yes or no). It
separates the failures that all look identical in a report - a missing secret,
a token without the scope, an unverified property, and genuinely no data - and
it is the right first move whenever a result looks empty or wrong.

## Which source answers which question

The one that keeps getting confused. All three are "Google data" and they
measure different halves of the same visit.

| Question | Source |
|---|---|
| What did people TYPE into Google | **Search Console** only |
| Impressions, CTR, average position | **Search Console** only |
| How many arrived, what they read, did they enquire | **site_events** (Supabase, always available) |
| Which ad group and keyword a PAID click came from | **GA4** (`ads-check.ts`), or `site_events.utm_term` |
| Spend, cost per conversion, geography, campaigns | **Google Ads MCP** (`google-ads` in `.mcp.json`, read-only; see `docs/google-ads-mcp-setup.md`) |

Two traps worth naming, because both have been hit:

- **`site_events.utm_term` is not a search query.** It is the Google Ads
  keyword on a click that was paid for. It looks exactly like Search Console
  query data and covers none of the organic side.
- **Google Ads impressions are not Search Console impressions.** Ads
  impressions are ad serves; GSC impressions are organic appearances. The
  figures in `docs/ads-review-2026-09.md` are the Ads kind.

## The scripts

All get their token from `scripts/google-token.ts` (local `.env.local`, or proxy mode in a cloud session), all are read-only unless noted. The "Needs" column is the local mode; in proxy mode only `GSC_CLIENT_ID` plus the non-secret ids are needed.

| Script | Needs | Does |
|---|---|---|
| `google-check.ts` | GSC_CLIENT_ID, GSC_CLIENT_SECRET, GSC_REFRESH_TOKEN, GA_PROPERTY_ID | Diagnostic. Exports `accessToken()`, which the GA scripts import. Run first. |
| `gsc-query.ts` | + GSC_SITE_URL | `searchanalytics.query`. `[days] [dimensions]` or `--start/--end`, dimensions from query,page,date,device,country. Prints TOTAL and flags provisional days |
| `gsc-report.ts` | GSC_SITE_URL | Summarised GSC report |
| `ads-check.ts` | GA_PROPERTY_ID (+ the GSC trio, via google-check) | GA4 Paid Search only, by ad group and keyword |
| `ga-query.ts` | GSC_CLIENT_ID, GSC_CLIENT_SECRET, GA_REFRESH_TOKEN, GA_PROPERTY_ID | Arbitrary GA4 report. `[days]` or `--start/--end`; prints the window and a TOTAL row |
| `ga-report.ts` / `ga-verify-setup.ts` | GA_PROPERTY_ID | Standard report / setup audit |
| `ga-list-properties.ts` | GSC client pair + GA_REFRESH_TOKEN | Lists GA4 properties, to find the id |
| `ga-setup.ts`, `ga-add-key-event.ts` | GA_PROPERTY_ID (+ auth) | **Write** to GA4 config. Ask before running. |

Examples:

```bash
npx tsx scripts/gsc-query.ts 28 query,page   # 28 days, query and landing page
npx tsx scripts/gsc-query.ts 90 query        # 90 days, queries only
npx tsx scripts/ads-check.ts                 # GA4 paid search by ad group
npx tsx scripts/ga-query.ts --start 2026-09-28 --end 2026-10-04 sessionDefaultChannelGroup sessions,keyEvents
```

**Date windows.** `[days]` means the last N *complete* days ending yesterday
in Asia/Jerusalem (`scripts/google-dates.ts`). For weekly or monthly reports
pass `--start`/`--end` so every source covers the same days. Search Console
dates are Pacific Time and the last ~3 days are provisional; `gsc-query.ts`
says so and defaults to `--data-state all`. Before this, `ga-query.ts 28`
silently covered 29 days plus today, which is how a 483-session breakdown was
once compared with a 468-session total.

Note the OAuth client is shared: `GSC_CLIENT_ID` and `GSC_CLIENT_SECRET` serve
GA4 too, and only the refresh token differs (`GSC_REFRESH_TOKEN` against
Search Console, `GA_REFRESH_TOKEN` against the GA4 Data API).

## When the credentials are missing

This runs in a cloud container. `.env.local` is gitignored, so a fresh
container never has it and nothing carries over between sessions.

Cloud sessions use network secrets, never env vars, for the client secret and
refresh token. The setup (one combined adwords + webmasters.readonly +
analytics.readonly token on the existing OAuth client, in the same
`oauth2.googleapis.com` network secret the Google Ads MCP uses) is in
`docs/google-data-cloud-setup.md`. `GA_PROPERTY_ID=544891595` (the property;
400597258 is the account id) and `GSC_SITE_URL=sc-domain:niragabay.com` are
plain, non-secret env vars.

**Never ask for a token or secret to be pasted into the chat**, and never print
one. If `google-check.ts` says a scope is "no", the token needs re-granting by
the owner; do not work around it.

For the owner's own computer, `gsc-auth.ts` / `ga-auth.ts` (loopback on
localhost:53682) and `google-auth-paste.ts` still mint local tokens into
`.env.local`.

Network is not the blocker: outbound to `oauth2.googleapis.com`,
`searchconsole.googleapis.com` and `www.googleapis.com` is open. In proxy mode
the token refresh goes through `curl` on purpose: Node's built-in fetch skips
the agent proxy, so the placeholder would reach Google unswapped.

## Gotchas

- **Property form.** `gsc-query.ts` defaults to `https://www.niragabay.com/`.
  If the GSC property is a Domain property, `GSC_SITE_URL=sc-domain:niragabay.com`
  is required or the API answers 403 for a property it does not recognise.
- **`npx next <anything>` is forbidden in this repo** without a pinned version.
  `npx tsx scripts/...` is fine - tsx is a dependency.

## "Did we already pull this?"

When the owner says data was already pulled and it is not in context, check the
transcript - but do not match your own search. Grepping the session transcript
for a term writes that term INTO the transcript, and the next grep finds it.
This has produced two false positives already, one of which was reported as a
correction before being retracted.

Cut the file before the current turn and search only that:

```bash
T=~/.claude/projects/-home-user-nira-gabay-site/<session-id>.jsonl
head -c $(( $(wc -c < "$T") - 200000 )) "$T" > /tmp/pre.jsonl
grep -c -F "searchanalytics" /tmp/pre.jsonl
```

Markers that prove a real run rather than a file read: `dimensionHeaders` and
`metricValues` in a tool result (GA4 responses), `searchanalytics` in a command
(GSC), and script output strings with values interpolated into them. Reading a
script's source puts its error strings and usage comments in the transcript
too, so their presence proves nothing on its own.
