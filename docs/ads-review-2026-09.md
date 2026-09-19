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

**`פסיכותרפיה` is 80% of the campaign and bounces 84% of it.** One keyword
absorbing 291 sessions is the signature of broad match, which strategy §3
ruled out ("phrase + exact only"). Those 291 sessions are 291 search terms
nobody has looked at.

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
the rate. At these counts that is not noise.

## 6. Why: the traffic is substantially not in Israel

Google's own audience insight for this campaign:

| Segment | Share of clicks | Index |
|---|---|---|
| **Trips to Israel** (in-market) | 21.5% | **452.7x** |
| Romance & Drama Movie Fans | 42.5% | 4.9x |
| TV Drama Fans | 28.7% | 3.5x |
| Shopping Enthusiasts | 52.5% | 2.9x |
| Mother's Day Flowers & Greeting Cards | 45.2% | 2.8x |

A 452x index on "planning a trip to Israel" is not a local clinic's audience.

**01:00-07:00 in Israel is 18:00-00:00 on the US east coast.** The six
overnight WhatsApp taps land squarely in North American evening hours. The
hour anomaly in §5 and the audience anomaly here are the same fact seen twice.

The likely cause is a campaign setting. Strategy §3 specifies
**"Presence" targeting only (not "interest")**. Google's default is "presence
or interest", which shows ads to people merely *interested in* the targeted
locations - diaspora, tourists, anyone reading about Jerusalem. That is
precisely what produces a "Trips to Israel" segment at 452x.

**Two readings, and they lead to opposite actions.**

**(a) Waste.** Out-of-area clicks that can never become clinic clients, with
overnight WhatsApp taps that are accidental or invalid. Then this is roughly a
fifth of the budget to cut, and the real September CPA is around ₪597 for one
enquiry rather than the ₪49.80 Ads reports.

**(b) A market.** Hebrew speakers abroad looking for therapy in Hebrew over
Zoom, messaging in their evening. Strategy §3 already treats Zoom as a
supporting message. If real, these are genuine enquiries that the campaign is
reaching by accident and serving badly, and the right response is a separate
campaign built for them, not a geo cut.

Both readings fit every number in this document. They are separated by one
question, in §7.

## 7. The open question, and how to close it

**Did WhatsApp messages actually arrive at these times?** 02.09 ~01:04 and
~03:59, 04.09 ~06:51, 06.09 ~02:04, 15.09 ~05:51, 16.09 ~04:36. Nira's phone
answers this in two minutes and it decides reading (a) versus reading (b).

Two further gaps worth closing:

- **The search terms report.** Not obtainable from our data: `utm_term` stores
  the matched keyword, not the query. It exists only in Google Ads
  (Insights & reports → Search terms). The account's own category widget shows
  **101 uncategorized search terms**, which is where the 291 head-term sessions
  actually went.
- **The location report** (Locations → where users were located) confirms or
  refutes §6 directly, in seconds.

## 8. What to change

**Before anything else**

1. **Locations → "Presence" only.** The single highest-impact setting, and it
   restores what strategy §3 already specified.
2. **Open the location report** and quantify how much spend went out of area.
3. **Ask Nira about the overnight WhatsApp messages** (§7).

**Reject all three of Google's current recommendations**

4. Search Partners (+2.5%) and Display expansion (+0.9%) are off and should
   stay off; strategy §3 is Search-only.
5. **Maximize Conversions (+10.5%): not yet.** Not because WhatsApp is a weak
   channel, but because the conversion signal currently being counted is
   dominated by six overnight taps of unknown validity. Automated bidding
   trains on whatever it is fed. Revisit the moment §7 is answered: if the
   WhatsApp enquiries are real, the signal is sound and this becomes a
   reasonable move well before the 30-conversion gate in strategy §3.

**Then**

6. **Match types.** Move `פסיכותרפיה` to phrase. Negatives are whack-a-mole
   while broad match keeps finding new queries.
7. **Turn off the `/about` sitelink** or point it at a page with a next step.
8. **Fix the tracking template** so `{campaignid}` and `{creative}` populate
   `utm_campaign` and `utm_content`, which makes ad-level analysis possible.
9. **Consolidate or close the couples keywords** (§3).
10. **`/services/adult-therapy` on mobile.** 82% bounce across 262 mobile
    sessions is the largest single number in this review, and it is a site
    job rather than an Ads one.

## 9. What this review cannot tell you

- **Cost per keyword or per ad.** Ads reports account-level spend; the
  tracking template gaps in §1 prevent finer attribution from our side.
- **Lead quality.** Strategy §7 makes cost per *qualified* lead the day-60
  gate. That needs the `/manage` lead statuses
  (new / spoke / started therapy / ongoing / irrelevant) filled in. One row
  exists, at status `new`.
- **Anything per-keyword below ~15 clicks**, per the strategy's own guardrail.
  That covers every row in §3 except the top two.
