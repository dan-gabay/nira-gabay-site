# Google Ads review - niragabay.com (September 2026)

The day-60 optimization review called for in
`docs/google-ads-strategy-2026-07.md` §7. Companion docs: that strategy file
and `docs/ads-keyword-research-2026-07.md`.

Last updated 2026-09-19.

## 0. Owner decisions recorded in this review

1. **The adult / couples / CBT segments are approved.** They were deferred in
   the July strategy and started running anyway (see §2). As of 2026-09-19 the
   owner approves what is live. The deferral in
   `docs/google-ads-strategy-2026-07.md` §2 is superseded.
2. **A WhatsApp enquiry counts as a conversion.** Consistent with strategy §4,
   which already lists the WhatsApp click as a PRIMARY conversion. Nothing in
   §5 below argues against WhatsApp as a channel; the open question is
   narrower and is stated in §7.

## 1. The account as it stands

| | |
|---|---|
| Campaign | חיפוש - מקומי - אוגוסט 2026 (one campaign, Search only) |
| Budget | ₪30/day, ₪912/month, pacing "on plan" |
| Spend 1-19 Sept | ₪596.82 |
| Search Partners | off (Google is recommending joining, so it is not on) |
| Display expansion | off |
| Bidding | not automated (Google is recommending Maximize Conversions) |
| Ads-reported, 13-19 Sept | ₪199, 4 conversions, CPA ₪49.80 |
| Campaign to date (12 Jul - 20 Sep) | ₪866.70, 388 clicks, 9,182 impressions |
| CTR / avg CPC / cost per conversion | 4.23% / **₪2.23** / **₪96.30** |

`utm_campaign` arrives as the literal string `search-he`, not `{campaignid}`
as the strategy's URL convention specifies, and `utm_content` is empty on
every row, so `{creative}` is missing from the final URLs. Consequence: no
ad-level breakdown is possible from our own data. Worth fixing in the tracking
template before the next review.

## 2. Structure: what was approved vs what ran

The July strategy approved three ad groups - הדרכת הורים, טיפול רגשי לילדים,
טיפול למתבגרים - and deferred adult, CBT and couples. What actually ran:

| Landing page | Sessions | Share | Plan status |
|---|---|---|---|
| /services/adult-therapy | 270 | 79% | was deferred |
| /about | 33 | 10% | sitelink, not a landing page |
| /services/couples-therapy | 17 | 5% | was deferred |
| /services/cbt | 10 | 3% | was deferred |
| /clinic | 4 | 1% | - |
| /services/parent-guidance | 4 | 1% | approved ad group 1 |
| /contact, / | 2 | <1% | - |
| /services/teen-therapy | 0 | 0% | approved ad group 3 |

87% of traffic went to the deferred segments, 1.2% to the approved ones.
Ad group 2 cannot have run at all: `/services/child-therapy` does not exist.
`lib/services.ts` has adult-therapy, couples-therapy, parent-guidance, cbt,
teen-therapy, sex-therapy, and no child page.

**Resolved by owner decision §0.1.** Recorded here because it explains why the
account looks nothing like the plan, and because the three approved ad groups
still have no traffic and no ads.

## 3. Keywords

13 keywords, 363 paid sessions, 26 days. Bots excluded. `utm_term` holds the
matched KEYWORD, not the user's search term; see §7.

| Keyword | Sessions | Conv. events | Pages/session | Bounced | Mobile |
|---|---|---|---|---|---|
| פסיכותרפיה | 291 | 7 | 1.45 | 244 (84%) | 284 |
| מטפלת רגשית | 35 | 1 | 1.49 | 29 | 35 |
| טיפול פסיכותרפי | 12 | 0 | 1.33 | 11 | 10 |
| טיפול זוגי | 6 | 0 | 1.00 | 6 | 6 |
| טיפול זוגי בירושלים | 4 | 0 | 2.50 | 2 | 4 |
| מדריכת הורים | 4 | 0 | 3.00 | 1 | 3 |
| מטפלת זוגית | 4 | 0 | 2.25 | 3 | 3 |
| טיפולים זוגיים | 2 | 0 | 1.00 | 2 | 2 |
| מדריכת הורים ירושלים | 1 | 0 | 7.00 | 0 | 1 |
| ייעוץ זוגי בירושלים | 1 | 0 | 1.00 | 1 | 1 |
| טיפול רגשי ירושלים | 1 | 0 | 1.00 | 1 | 1 |
| ייעוץ זוגי | 1 | 0 | 1.00 | 1 | 1 |
| טיפול זוגי ירושלים | 1 | 0 | 1.00 | 1 | 1 |

**`פסיכותרפיה` is 80% of the campaign and bounces 84% of it - but it is not
underperforming.** It converts at 2.4% (7 events on 291 sessions) against
`מטפלת רגשית` at 2.9% (1 on 35); every other keyword has too little volume to
rate. The head term is simply the only one with reach, and at ₪2.23 a click
(§6) a high bounce rate is affordable. The real objection is visibility, not
waste: one keyword absorbing 291 sessions is the signature of broad match,
which strategy §3 ruled out ("phrase + exact only"), and those 291 sessions
are 291 search terms nobody has looked at.

**Engagement rises as the term narrows, and budget does the opposite.**
`מדריכת הורים ירושלים` 7.00 pages and no bounce on 1 session,
`מדריכת הורים` 3.00, `טיפול זוגי בירושלים` 2.50, against the head term's 1.45.
The terms that hold people get 1-4 sessions in 26 days.

**Couples: 19 sessions across 7 keywords, no conversions.** No single one
clears the strategy's own 15-20 click guardrail, so none can be judged alone.
They need consolidating into one funded ad group or closing.

Negative keywords were updated by the owner on 2026-09-19.

**Do not bid on `פסיכולוג` / `פסיכולוגית`.** Nira is not a psychologist. If
`פסיכותרפיה` is on broad match it may already be matching those queries, which
is both wasted spend and a misrepresentation. These belong in the negative
list.

## 4. Landing pages

| Landing | Sessions | Pages/session | Bounced | Mobile |
|---|---|---|---|---|
| /services/adult-therapy | 270 | 1.50 | 222 (82%) | 262 |
| /about | 33 | 1.00 | 33 (100%) | 33 |
| /services/couples-therapy | 17 | 1.65 | 14 | 16 |
| /services/cbt | 10 | 1.20 | 9 | 10 |
| /clinic | 4 | 2.00 | 3 | 4 |
| /services/parent-guidance | 4 | 4.50 | 0 | 3 |
| /contact | 1 | 1.00 | 1 | 1 |
| / | 1 | 5.00 | 0 | 1 |

`/about` takes a tenth of the paid clicks and every single visitor leaves
after one page. Strategy §6 lists a `קצת עליי` sitelink; this is it.

`/services/parent-guidance` is the only page that holds anyone (4.50 pages, no
bounces). The sample is 4 sessions and proves nothing alone, but it is the
approved landing page and it receives 1% of the traffic.

## 5. Conversions: the click is not the conversation

Eight conversion events on paid traffic in 26 days:

| When (IDT) | Event | Landing |
|---|---|---|
| 24.08 10:25 | contact_phone | /services/adult-therapy |
| 02.09 01:04 | contact_whatsapp | /services/cbt |
| 02.09 03:59 | contact_whatsapp | /about |
| 04.09 06:51 | contact_whatsapp | /services/adult-therapy |
| 06.09 02:04 | contact_whatsapp | /services/adult-therapy |
| 15.09 05:51 | contact_whatsapp | /services/adult-therapy |
| 16.09 04:36 | contact_whatsapp | /services/adult-therapy |
| 18.09 10:05 | contact_form_submit | /services/adult-therapy |

All mobile. Six of the eight are WhatsApp taps between 01:04 and 06:51.

`contact_messages` - where an actual enquiry leaves a record - holds exactly
one row from paid traffic in this period: the form submit of 18.09 10:05, from
`פסיכותרפיה`, landing `/services/adult-therapy`, status `new`, with a gclid.
WhatsApp and phone taps leave no row by construction, because they hand off to
another app. Strategy §8 flagged this gap in advance.

By hour:

| Hours (IDT) | Sessions | Conversion events | Rate |
|---|---|---|---|
| 00:00-07:59 | 66 | 6 | 9.1% |
| 08:00-23:59 | 298 | 2 | 0.7% |

18% of the traffic produces 75% of the conversion events, at thirteen times
the rate. With 8 events and an 18% overnight share, the chance of six landing
there by accident is about 0.07%, so the pattern is real.

What it is *not* is evidence about location: paid traffic runs 18.1% overnight
against 13.7% for organic and direct, a gap of 1.4 standard errors and not
significant, and §6 shows every click came from inside the radius. The
ordinary reading is the right one - people reach out about therapy at night.

## 6. Geo targeting: checked, and it is working

An earlier version of this review argued from Google's audience insight
("Trips to Israel" at 21.5% of clicks and a 452.7x index) plus the overnight
conversion clustering in §5 that a large share of the traffic was outside the
clinic's catchment. **That was wrong.** The location report settles it:

| Location | Clicks | Impressions | Cost |
|---|---|---|---|
| 25.0 km around הדולב 132, שואבה | 388 | 9,182 | ₪866.70 |
| **All other locations** | **0** | **0** | **₪0.00** |

Not one click came from outside the radius. The geo setting is correct and
needs no change. The "Trips to Israel" segment is people inside the radius
whom Google classifies that way; it was over-read.

Two conclusions follow, and both matter more than the thing I got wrong.

**The overnight conversions are local people.** Once location is ruled out,
the ordinary explanation is the right one: people reach out about therapy at
night. Someone awake and distressed at 3am is a plausible enquirer, not noise.
§5's hour anomaly is real but it is a fact about when people ask for help,
not about where they are.

**The economics are much better than the July plan assumed.**

| | Planned | Actual |
|---|---|---|
| CPC | 8-20 ILS (assumption) | **₪2.23** |
| Clicks | ~60-180/month | 388 over the campaign |
| CTR | - | 4.23% |
| Cost per conversion | - | **₪96.30** |

Total spend 12 July to 20 September: ₪866.70 for 388 clicks and 9 conversions.
Against the strategy's target of ₪1,000-2,000 CAC per acquired client, an
enquiry-to-client rate of even 1 in 4 puts CAC around ₪385, well inside
target. At ₪2.23 a click and ₪30/day, the campaign buys about 13 clicks a day,
which makes **budget the binding constraint rather than campaign quality** -
conditional on §7.

## 7. The one open question

**Did the six overnight WhatsApp taps become conversations?** 02.09 ~01:04 and
~03:59, 04.09 ~06:51, 06.09 ~02:04, 15.09 ~05:51, 16.09 ~04:36. Nira's phone
answers this in two minutes, and with geo ruled out in §6 it is now the only
thing standing between this campaign and a verdict:

- **They arrived.** Cost per enquiry is ₪96.30, the campaign is working, and
  the correct move is more budget (§8.1).
- **They did not.** Then ₪866.70 bought one verified enquiry, the conversion
  signal in Ads is inflated roughly ninefold, and the work is on the tap-to-
  conversation step rather than on the campaign.

Note the question is no longer about invalid traffic. It is the ordinary
question of how many people who tap a WhatsApp button actually send the
message, which strategy §8 anticipated ("WhatsApp conversions measure the
CLICK, not a conversation").

One further gap worth closing: **the search terms report**, which is not
obtainable from our data because `utm_term` stores the matched keyword rather
than the query. It exists only in Google Ads (Insights & reports → Search
terms). The account's own category widget shows **101 uncategorized search
terms**, which is where the 291 head-term sessions went.

## 8. What to change

**First, because it decides everything else**

1. **Ask Nira about the overnight WhatsApp messages** (§7). If they arrived,
   the next action is a budget increase, not an optimisation: at ₪2.23 a click
   and ₪30/day the campaign buys ~13 clicks a day, and the strategy's own
   scaling gate (day 90, cost per started-therapy client) is within reach.

**Settled, no action needed**

2. **Geo targeting is correct.** 388 of 388 clicks came from inside the 25 km
   radius (§6). Leave it alone.
3. **Search Partners (+2.5%) and Display expansion (+0.9%) are off** and should
   stay off; strategy §3 is Search-only. Decline both recommendations.

**Worth doing regardless of §7**

4. **Turn off the `/about` sitelink** or point it at a page with a next step.
   33 paid clicks, 100% bounce, no enquiries (§4).
5. **Move `פסיכותרפיה` to phrase match.** Not because it performs badly - it
   converts at 2.4%, in line with everything else - but because 291 sessions
   behind one broad-matched keyword means nobody can see what is being bought.
   Pair with the search terms report.
6. **Add `פסיכולוג` and `פסיכולוגית` as negatives.** Nira is not a
   psychologist; these queries are both wasted spend and a misrepresentation.
7. **Fix the tracking template** so `{campaignid}` and `{creative}` populate
   `utm_campaign` and `utm_content`, which makes ad-level analysis possible at
   the next review.
8. **Consolidate or close the couples keywords** (§3): 19 sessions across 7
   keywords, none clearing the strategy's 15-20 click guardrail.

**Hold**

9. **Maximize Conversions (+10.5%): wait for §7.** Not because WhatsApp is a
   weak channel - it is a primary conversion by owner decision and by strategy
   §4 - but because automated bidding trains on whatever it is fed, and six of
   the nine conversions are taps nobody has verified. If Nira confirms them,
   the signal is sound and this becomes reasonable well before the
   30-conversion gate in strategy §3.

**Site work, not Ads work**

10. **`/services/adult-therapy` on mobile.** 82% bounce across 262 mobile
    sessions. Lower priority than it looks: the page still converts at 2.4%
    and clicks cost ₪2.23, so the bounce is affordable. It matters if and only
    if §7 comes back negative.

## 9. What this review cannot tell you

- **Cost per keyword or per ad.** Ads reports account-level spend; the
  tracking template gaps in §1 prevent finer attribution from our side.
- **Lead quality.** Strategy §7 makes cost per *qualified* lead the day-60
  gate. That needs the `/manage` lead statuses
  (new / spoke / started therapy / ongoing / irrelevant) filled in. One row
  exists, at status `new`.
- **Anything per-keyword below ~15 clicks**, per the strategy's own guardrail.
  That covers every row in §3 except the top two.
