# Google Ads review - niragabay.com (September 2026)

The day-60 optimization review called for in
`docs/google-ads-strategy-2026-07.md` §7. Companion docs: that strategy file
and `docs/ads-keyword-research-2026-07.md`.

**Source of the numbers.** Everything here comes from the site's own
`site_events` and `contact_messages` tables, covering the ~26 days to
2026-09-19. It is click-to-enquiry data. It does NOT include cost: no spend,
no CPC, no CPA figure appears below, because this container has no GA4
credentials. Every recommendation is therefore about *structure*, which is
where the problem turns out to be anyway. Re-run `scripts/ads-check.ts`
when cost data is needed to finish the budget math.

## 1. The finding

**The campaign that is running is not the campaign that was approved.**

The July strategy (§2) approved three ad groups - הדרכת הורים, טיפול רגשי
לילדים, טיפול למתבגרים - and explicitly deferred adult individual therapy,
CBT and couples to a day-60 revisit. The keyword doc repeats it: "Adult
individual therapy + couples terms - deferred".

Where the 340 paid sessions actually went:

| Landing page | Sessions | Share | Enquiries | Status in the approved plan |
|---|---|---|---|---|
| /services/adult-therapy | 270 | 79% | 7 | deferred |
| /about | 33 | 10% | 0 | sitelink, not a landing page |
| /services/couples-therapy | 17 | 5% | 0 | deferred |
| /services/cbt | 10 | 3% | 0 | deferred |
| /clinic | 4 | 1% | 0 | - |
| **/services/parent-guidance** | **4** | **1%** | 0 | **approved ad group 1** |
| /contact | 1 | <1% | 0 | - |
| / | 1 | <1% | 0 | - |
| **/services/teen-therapy** | **0** | **0%** | 0 | **approved ad group 3** |

- **87% of the traffic (297 of 340) went to the three deferred segments.**
- **1.2% (4 of 340) went to the approved ad groups.**
- Ad group 2 cannot be running at all: `/services/child-therapy` does not
  exist. `lib/services.ts` has adult-therapy, couples-therapy,
  parent-guidance, cbt, teen-therapy, sex-therapy. There is no child page.

This is not a bidding problem and it is not a landing-page problem. The
account is advertising a different practice than the one that was planned.

## 2. Keywords

| Keyword | Sessions | Enquiries |
|---|---|---|
| פסיכותרפיה | 269 | 6 |
| מטפלת רגשית | 34 | 1 |
| טיפול פסיכותרפי | 12 | 0 |
| טיפול זוגי | 6 | 0 |
| מטפלת זוגית | 4 | 0 |
| טיפול זוגי בירושלים | 4 | 0 |
| מדריכת הורים | 4 | 0 |
| טיפולים זוגיים | 2 | 0 |
| טיפול רגשי ירושלים | 1 | 0 |
| מדריכת הורים ירושלים | 1 | 0 |
| טיפול זוגי ירושלים | 1 | 0 |
| ייעוץ זוגי | 1 | 0 |
| (none) | 1 | 0 |

Two things stand out.

**`פסיכותרפיה` is 79% of the campaign on its own.** It is a dictionary word.
Nobody types it while looking for a therapist near Shoeva; they type it while
finding out what the word means. A single head term pulling 269 of 340
sessions is also a strong hint that **broad match is on**, which the strategy
(§3) ruled out: "phrase + exact only. No broad match". Under phrase match
this term would not produce this shape of traffic.

**The high-intent long tail is starving.** `מדריכת הורים ירושלים`,
`טיפול זוגי ירושלים`, `טיפול רגשי ירושלים` - one session each across 26 days.
These are the terms with actual local buying intent, and they are getting
nothing while the head term eats the budget.

## 3. Landing pages

| Landing | Sessions | Enquiries | Pages/session | Bounced | Mobile |
|---|---|---|---|---|---|
| /services/adult-therapy | 270 | 7 | 1.50 | 222 (82%) | 262 |
| /about | 33 | 0 | 1.00 | 33 (100%) | 33 |
| /services/couples-therapy | 17 | 0 | 1.65 | 14 | 16 |
| /services/cbt | 10 | 0 | 1.20 | 9 | 10 |
| /clinic | 4 | 0 | 2.00 | 3 | 4 |
| /services/parent-guidance | 4 | 0 | 4.50 | 0 | 3 |
| /contact | 1 | 0 | 1.00 | 1 | 1 |
| / | 1 | 0 | 5.00 | 0 | 1 |

**`/about` is burning budget.** 33 paid clicks, every single one left after a
single page, zero enquiries. Strategy §6 lists a `קצת עליי` sitelink - this is
it. A sitelink is meant to support the ad, not absorb a tenth of the clicks
into a page with no next step.

**`/services/parent-guidance` is the only page that holds anyone.** 4.50 pages
per session and not one bounce. The sample is 4 sessions, so it proves
nothing on its own - but it is the approved landing page, it is the one page
where visitors go deeper, and it is receiving 1% of the traffic.

**82% bounce on the money page.** `/services/adult-therapy` takes 270 sessions
and loses 222 of them immediately, 97% of them on mobile.

## 4. Conversion rate in context

| Source | Sessions | Enquiries | Rate |
|---|---|---|---|
| Paid | 340 | 7 | 2.1% |
| Direct | 120 | 2 | 1.7% |
| Organic | 43 | 1 | 2.3% |
| Social | 33 | 1 | 3.0% |

Paid is not worse than anything else. With 11 enquiries in total the spread
between 1.7% and 3.0% is noise and must not be read as a ranking. The useful
conclusion is only that no channel converts well, which points at the site's
contact step rather than at traffic quality.

## 5. What to change, in order

**1. Stop the deferred segments or re-approve them.** This is the decision that
governs everything else. Either adult/couples/CBT are now a deliberate choice
worth 87% of the budget, or the campaign gets rebuilt on the approved three.
It should not stay accidental. Note that adult therapy produced all 7
enquiries, so "just pause it" is not automatically right - but it was never
chosen, and cost per *qualified* lead (not per enquiry) is what the strategy
says decides this, which needs Nira's `/manage` lead statuses.

**2. Turn off the `/about` sitelink, or point it somewhere with a next step.**
33 clicks, 100% bounce, 0 enquiries. No judgement call needed.

**3. Check the match types.** Strategy §3: phrase + exact only. If
`פסיכותרפיה` is on broad, change it. Then run the search-terms report and
apply the campaign negative list from `docs/ads-keyword-research-2026-07.md`
§4 - it is already written and covers exactly the study/definition queries a
term like `פסיכותרפיה` attracts (קורס, לימודים, הכשרה, תואר, מה זה, ויקיפדיה).

**4. Fund the local long tail.** The ירושלים-modified terms get one session
each. Check whether that is a bid problem or genuinely no volume.

**5. Bidding: not yet, and the strategy already said so.** §3 sets the gate at
~30 conversions before evaluating tCPA; we are at 7 in 26 days, roughly 8 a
month. Target CPA would be learning on noise. Maximize Conversions without a
target is defensible if the campaign is currently on Maximize Clicks - 8 is a
weak signal, but it beats optimising for the wrong thing - and Maximize Clicks
is literally an instruction to buy visitors. Confirm what the campaign is on
before deciding.

**6. Fix `/services/adult-therapy` on mobile** if it stays a paid destination.
82% bounce across 262 mobile sessions is the largest single number in this
review.

## 6. Precondition to verify before any bidding change

Conversions reach Google Ads by importing GA4 key events, not by a conversion
tag in the code (see the comment in `lib/conversions.ts`). Strategy §4 lists
`contact_whatsapp` and `contact_phone` as PRIMARY imports and `generate_lead`
as secondary.

Confirm in the Ads UI that those key events are actually imported and marked
primary. If they are not, Ads has no conversion signal at all, no bidding
change is possible, and that alone explains a campaign that delivers visitors.

## 7. What this review cannot tell you

- **Cost.** No spend, CPC or CPA. Cost per qualified lead per ad group - the
  day-60 gate in the strategy - cannot be computed here.
- **Lead quality.** The strategy is explicit that lead quality outranks volume.
  7 enquiries is not 7 clients. The `/manage` lead statuses
  (new / spoke / started therapy / ongoing / irrelevant) are what turn this
  into a real decision, and they need to be filled in.
- **Anything at keyword level below ~15 clicks.** The strategy's own guardrail:
  no decisions on under 15-20 clicks per keyword. That covers every row in
  section 2 except the top two.
