# GEO monitoring (/manage/analytics, under מקורות)

Backlog B-49. A folded section "נראות במנועי AI" under מקורות on /manage/analytics, behind the existing `/manage` gate, that answers three questions:

1. **Which AI crawlers and search engines read the site, and what did they read?** Folded from `public.bot_hits` by `lib/geo/crawl.ts`.
2. **Does Nira appear in AI answers to the prompts we care about?** Read from the repo files `lib/geo/visibility-prompts.json` and `lib/geo/visibility-observations.json` by `lib/geo/visibility.ts`.
3. **Does the site serve crawlers correctly right now?** The quick checks in `lib/geo/siteChecks.ts` run live on every load. The full check runs as `npm run verify:agent-readiness`.

The page reads everything through `GET /api/manage/geo?range=7|30|56|90`, which returns 401 without the admin cookie.

## What the numbers are, and what they are not

- A crawler row is one automated request. It is not a reader, an impression or a recommendation.
- `ai_answer` (ChatGPT-User, Perplexity-User, Claude-User and similar) is a fetch made while the tool was answering someone. It is still not a click and not a person.
- AI referral visits come from `manage_analytics` (the `ai_referral` group). These are real visits from a link in an AI tool.
- `bot_hits` holds no IP address, no user agent and no session. The optional `bot_agent` column (see below) holds only a crawler name from a fixed allowlist, and only for the ai_answer, ai_crawler and search kinds.

## Adding a visibility observation

Observations are append-only. Never edit or delete a past entry; add a new one, and review it in a PR.

1. Use a prompt id from `visibility-prompts.json`. If you add a prompt, add it there first.
2. Choose the method the provider allows (`PROVIDERS` in `lib/geo/visibility.ts`):
   - Google AI Overview: `serpapi` (run `engine=google` with the Jerusalem location, then `engine=google_ai_overview` with the returned `page_token` straight away, because the token expires within minutes) or `manual`.
   - ChatGPT Search, Perplexity, Gemini, Copilot, Claude and Google AI Mode: `manual` only. A generic model API answer is not a search result, so it is rejected by `validateObservation`.
3. Record what was seen: `answer_present`, `nira_mentioned` (`null` if you could not tell), `nira_linked`, `position` (only when Nira is mentioned), `competitors` as written (`null` if not recorded), `cited_sources` as domains, plus `observer` and `notes`.
4. Use `evidence: "estimate"` for anything not actually seen. Estimates are shown apart and never counted as results.
5. Run `npm test`. `tests/geo-visibility.test.ts` fails on any invalid entry in the repo file.

## Crawler names

Per-crawler counts use the nullable `bot_agent` column, added on 2026-10-25 by `db/2026-10-24-bot-hits-agent.sql`. The proxy writes it for every ai_answer, ai_crawler and search hit whose user agent matches the allowlist. Rows from before that date have no name.

## Production check

```bash
npm run verify:agent-readiness -- https://www.niragabay.com          # full
npm run verify:agent-readiness -- https://www.niragabay.com --quick  # same checks as the page
```

The check sends a `niragabay-healthcheck` user agent. It is classified as `monitor` and left out of the crawl figures.
