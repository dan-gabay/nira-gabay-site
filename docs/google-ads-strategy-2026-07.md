# Google Ads Strategy - niragabay.com (July 2026)

Owner-approved strategy for the first paid campaigns. Companion docs:
`docs/ads-keyword-research-2026-07.md` (keywords + negatives),
`docs/lead-handling-sop.md` (Nira's lead process, Hebrew).

## 1. Goal and economics (owner interview, 2026-07-10)

- Business goal: **ongoing therapy clients**, not raw lead volume.
  5 new ongoing clients/month = success; capacity ~20; no waiting time.
- Client value: weekly sessions x ~6 months x 400 ILS => **LTV ~10,000 ILS**.
  A cost-per-acquired-client of 1,000-2,000 ILS would be clearly profitable.
- Only disqualifier: affordability (private practice, 400 ILS/session).
  Filters: "private practice" framing, insurance-receipt note, free
  15-minute intro call where fit and cost come up naturally. No price on
  pages (owner decision; revisit if poor-fit calls burden the intro-call time).
- Budget: **1,000-1,500 ILS/month proof of concept**, scaling only after
  lead-quality data exists.

## 2. What we advertise (and what we don't)

Launch ad groups (parents are the searchers/decision-makers for all three):

1. הדרכת הורים -> /services/parent-guidance
2. טיפול רגשי לילדים (8+) -> /services/child-therapy
3. טיפול למתבגרים (copy addresses the parent) -> /services/teen-therapy

Deferred: adult individual/CBT, couples (add after 60-day review or budget
scale-up). Excluded from paid: sex therapy (sensitive category; organic
only - owner decision), crisis searches (ethics + poor fit).

## 3. Account & campaign structure

- One Hebrew **Search-only** campaign, 3 tightly themed ad groups (above).
  At this budget more structure = data spread too thin.
- Match types: phrase + exact only. No broad match, no Display, no
  Performance Max, no auto-applied recommendations (all amplify
  irrelevant-lead risk in a sensitive vertical).
- Bidding: Maximize Clicks with a CPC ceiling (or Manual CPC) until
  ~30 conversions accumulated, then evaluate tCPA. Never let automated
  bidding train on zero-conversion noise.
- Geography: ~30-minute drive radius around Moshav Shoeva - Jerusalem,
  Mevaseret Zion, Beit Shemesh, Modi'in corridor (list in the keyword doc).
  "Presence" targeting only (not "interest"). Zoom is a supporting message,
  not a separate campaign at launch.
- Language: Hebrew. Schedule: start all-day, review by-hour data at day 30;
  call asset limited to working hours.
- Auto-tagging ON (GCLID flows into contact_messages via lib/attribution.ts).

### Final URL convention

```
https://www.niragabay.com/services/<slug>
  ?utm_source=google&utm_medium=cpc
  &utm_campaign={campaignid}&utm_term={keyword}&utm_content={creative}
```

ValueTrack fills the braces; the site stores these + gclid on each lead
(contact_messages), which is what lets us judge campaigns by lead QUALITY
(status column) rather than click volume.

## 4. Conversions (owner priority order)

| # | Action | GA4 event | In Google Ads |
|---|---|---|---|
| 1 | WhatsApp click | `contact_whatsapp` | import as PRIMARY conversion |
| 2 | Phone click / call asset | `contact_phone` | import as PRIMARY conversion |
| 3 | Contact form submit | `generate_lead` | import as secondary (still a lead, just less preferred) |

- Import the GA4 key events into Google Ads (property 544891595 is already
  wired sitewide); add a Google Ads call asset with forwarding number if
  available in Israel - verify during account setup.
- Google Signals stays OFF; no remarketing lists; nothing health-related is
  ever sent to Google (policy + ethics; see measurement plan in
  docs/ga4-measurement-plan.md).
- Lead quality feedback loop: Nira logs each lead's status in /manage
  (new / spoke / started therapy / ongoing / irrelevant) + "how did you
  hear about me". Offline conversion upload by GCLID is a P2 decision,
  opt-in, and would carry zero personal/health fields.

## 5. Budget scenarios and formulas

Formulas:
- inquiries = budget / CPC x landing-page conversion rate
- clients = inquiries x qualified% x close%
- CAC = budget / clients; compare to LTV ~10,000 ILS

**Every number below is an ASSUMPTION to validate with Keyword Planner and
then replace with live data. Do not treat as forecasts.**

| Scenario | Budget/mo | CPC 8-20 ILS -> clicks | 4-8% conv -> inquiries | ~50% qualified, ~50% close -> clients |
|---|---|---|---|---|
| Test (chosen) | 1,000-1,500 | ~60-180 | ~3-12 | ~1-3 |
| Next step | 2,000-2,500 | ~110-300 | ~5-20 | ~1-5 |
| Growth | 3,500-4,500 | ~200-550 | ~9-40 | ~2-10 |

At the test budget the 5-clients/month goal is probably out of reach; the
test's job is to measure real CPC, lead quality and conversion rates and
decide whether scaling is justified.

## 6. Ads - message pillars and drafts

Pillars (all pages/ads): warm professional credentials (M.A. ייעוץ חינוכי,
הכשרת CBT אוניברסיטת חיפה, שנות ניסיון); parents-as-partners framing; free
15-min intro call; clinic in the Jerusalem corridor + Zoom option;
insurance-receipt note. Hard rules: no outcome promises, no diagnosis
language, no fear/urgency, compliant with Google healthcare policy and
therapist ethics.

RSA drafts (validate character limits when building; headlines <=30 chars,
descriptions <=90):

**הדרכת הורים**
- Headlines: הדרכת הורים אישית | מדריכת הורים מוסמכת | שיחת היכרות ללא עלות |
  כלים מעשיים להורים | קליניקה באזור ירושלים | נירה גבאי - הדרכת הורים |
  אפשרות למפגשים בזום
- Descriptions:
  - ליווי אישי להורים: גבולות, התקפי זעם וחיזוק הקשר. שיחת היכרות של 15 דקות ללא עלות.
  - מדריכת הורים ומטפלת בפסיכותרפיה, שנות ניסיון עם משפחות. קליניקה בשואבה וגם בזום.

**טיפול רגשי לילדים**
- Headlines: טיפול רגשי לילדים | מטפלת רגשית לילדים | לילדים מגיל 8 ומעלה |
  שיחת היכרות ללא עלות | בשיתוף מלא עם ההורים | קליניקה באזור ירושלים
- Descriptions:
  - מרחב בטוח לילד שמתמודד עם חרדה, ביטחון נמוך או קושי חברתי. בשיתוף קרוב עם ההורים.
  - מטפלת בפסיכותרפיה עם הכשרת CBT. שיחת היכרות טלפונית ללא עלות - נבדוק יחד אם זה מתאים.

**טיפול למתבגרים** (parent-addressed)
- Headlines: טיפול רגשי למתבגרים | המתבגר שלכם מסתגר? | מטפלת מנוסה לבני נוער |
  שיחת היכרות להורים חינם | ליווי גם להורים | קליניקה באזור ירושלים
- Descriptions:
  - מרחב בטוח לבני נוער, וליווי להורים לאורך הדרך. ניסיון רב שנים כיועצת חינוכית.
  - מתלבטים אם לפנות לטיפול? שיחת היכרות טלפונית ללא עלות תעזור להחליט.

Assets: sitelinks (קצת עליי / מאמרים בנושא / צרו קשר / שאלות נפוצות),
callouts (שיחת היכרות חינם, קבלות לביטוח משלים, אפשרות זום, מענה אישי),
structured snippet (סוגי שירות), call asset (working hours only).

## 7. 90-day plan

- **Weeks 0-1 (prep):** P0 repo tasks live + verified; Ads account +
  billing; GA4 link + conversion import; Keyword Planner validation; final
  keyword list; campaign built PAUSED; test conversions recorded.
- **Weeks 2-5 (launch + collect):** enable; touch nothing except negatives
  from the search-terms report (review 2x/week). Nira logs source + status
  on every inquiry (see SOP).
- **Weeks 6-9 (optimize):** pause keywords with >150 ILS spend and zero
  conversions; shift budget toward the ad group with the best cost per
  QUALIFIED lead (status >= spoke); one landing-page A/B max.
- **Decision gates:**
  - Day 30: is tracking trustworthy end-to-end? are search terms relevant?
  - Day 60: cost per qualified lead per ad group; drop/swap the weakest.
  - Day 90: cost per started-therapy client -> scale / hold / stop.
    Scaling also requires the lead-status data to be consistently filled.
- **Guardrails:** no decisions on <15-20 clicks per keyword or <2 weeks of
  data; lead quality outranks volume in every call; budget increases only
  after the day-90 gate (owner rule).

## 8. Known risks

- Low budget = slow learning; expect 2-3 months before confident decisions.
- WhatsApp conversions measure the CLICK, not a conversation; Nira's
  "how did you hear about me" + /manage statuses close that gap.
- Healthcare ad policy reviews can be strict; keep copy factual and calm,
  expect occasional disapprovals and appeal with policy-compliant wording.
- GA4 history starts 2026-07-09: no behavioral baseline; all early CVR
  numbers are noisy.
