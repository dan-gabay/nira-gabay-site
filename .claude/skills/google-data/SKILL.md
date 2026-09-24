---
name: google-data
description: Pull Search Console, GA4 and Google Ads data for niragabay.com, and know which of the three can answer a given question. Use whenever asked about organic search, impressions, CTR, average position, keywords, ad performance, or "how did people find the site" - and before claiming any of it is unavailable.
---

# Google data for niragabay.com

The tooling exists and works. What is usually missing is the credentials, and
the fastest way to waste a turn is to reason about that instead of checking.

## Check first, always

```bash
for v in GSC_CLIENT_ID GSC_CLIENT_SECRET GSC_REFRESH_TOKEN GA_REFRESH_TOKEN GA_PROPERTY_ID; do
  [ -n "${!v}" ] && echo "$v set" || echo "$v MISSING"
done; ls .env.local 2>/dev/null || echo "no .env.local"
```

If anything is set, run `npx tsx scripts/google-check.ts`. It separates the
three failures that all look identical in a report - a broken token, an
unverified property, and genuinely no data - and it is the right first move
whenever a result looks empty or wrong.

## Which source answers which question

The one that keeps getting confused. All three are "Google data" and they
measure different halves of the same visit.

| Question | Source |
|---|---|
| What did people TYPE into Google | **Search Console** only |
| Impressions, CTR, average position | **Search Console** only |
| How many arrived, what they read, did they enquire | **site_events** (Supabase, always available) |
| Which ad group and keyword a PAID click came from | **GA4** (`ads-check.ts`), or `site_events.utm_term` |
| Spend, cost per conversion, geography | Google Ads UI - not scripted here |

Two traps worth naming, because both have been hit:

- **`site_events.utm_term` is not a search query.** It is the Google Ads
  keyword on a click that was paid for. It looks exactly like Search Console
  query data and covers none of the organic side.
- **Google Ads impressions are not Search Console impressions.** Ads
  impressions are ad serves; GSC impressions are organic appearances. The
  figures in `docs/ads-review-2026-09.md` are the Ads kind.

## The scripts

All read `.env.local` via dotenv, all are read-only unless noted.

| Script | Needs | Does |
|---|---|---|
| `google-check.ts` | GSC_CLIENT_ID, GSC_CLIENT_SECRET, GSC_REFRESH_TOKEN, GA_PROPERTY_ID | Diagnostic. Exports `accessToken()`, which the GA scripts import. Run first. |
| `gsc-query.ts` | + GSC_SITE_URL | `searchanalytics.query`. `[days] [dimensions]`, dimensions from query,page,date,device,country |
| `gsc-report.ts` | GSC_SITE_URL | Summarised GSC report |
| `ads-check.ts` | GA_PROPERTY_ID (+ the GSC trio, via google-check) | GA4 Paid Search only, by ad group and keyword |
| `ga-query.ts` | GSC_CLIENT_ID, GSC_CLIENT_SECRET, GA_REFRESH_TOKEN, GA_PROPERTY_ID | Arbitrary GA4 report |
| `ga-report.ts` / `ga-verify-setup.ts` | GA_PROPERTY_ID | Standard report / setup audit |
| `ga-list-properties.ts` | GSC client pair + GA_REFRESH_TOKEN | Lists GA4 properties, to find the id |
| `ga-setup.ts`, `ga-add-key-event.ts` | GA_PROPERTY_ID (+ auth) | **Write** to GA4 config. Ask before running. |

Examples:

```bash
npx tsx scripts/gsc-query.ts 28 query,page   # 28 days, query and landing page
npx tsx scripts/gsc-query.ts 90 query        # 90 days, queries only
npx tsx scripts/ads-check.ts                 # GA4 paid search by ad group
```

Note the OAuth client is shared: `GSC_CLIENT_ID` and `GSC_CLIENT_SECRET` serve
GA4 too, and only the refresh token differs (`GSC_REFRESH_TOKEN` against
Search Console, `GA_REFRESH_TOKEN` against the GA4 Data API).

## When the credentials are missing

This runs in a cloud container. `.env.local` is gitignored, so a fresh
container never has it and nothing carries over between sessions.

Ask the owner to add the variables in the environment settings - the cloud
environment menu in the session title bar, then Edit. **Never ask for a token
to be pasted into the chat.** A new session picks them up.

Two auth routes to the refresh token, and the choice matters here:

- `gsc-auth.ts` / `ga-auth.ts` open a loopback listener on localhost:53682.
  That only works when the browser and the shell are the same machine, so it
  works on the owner's computer and never in the container.
- `google-auth-paste.ts` exists for the split case: step `url` prints a consent
  URL, the owner approves, the redirect to localhost fails (expected), and the
  code sits in the address bar for step `exchange`. Usable from the container
  with only the client id and secret, but it routes a credential through the
  chat - prefer having the owner run the loopback script locally and copy the
  token into the environment settings.

Network is not the blocker: outbound to `oauth2.googleapis.com`,
`searchconsole.googleapis.com` and `www.googleapis.com` is open.

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
