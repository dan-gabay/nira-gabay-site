# Google Ads Keyword Research - niragabay.com (July 2026)

Seed lists for the launch campaign (see docs/google-ads-strategy-2026-07.md).

**STATUS: UNVALIDATED.** Every keyword below is a hypothesis. Before the
campaign is built, run each list through Google Keyword Planner (location:
the campaign's Jerusalem-corridor radius; language: Hebrew) and record real
volume/CPC. Keywords with near-zero local volume get cut; CPCs feed the
budget math. Nothing in this file contains invented volume or CPC numbers.

## 1. Methodology

1. Buckets by intent (below); only commercial/high-intent buckets get bids.
   Informational searches are the article library's job (organic), not paid.
2. Validate in Keyword Planner -> keep terms with meaningful local volume.
3. Launch phrase + exact only; mine the search-terms report 2x/week; every
   irrelevant query becomes a negative within days, not weeks.
4. Rebuild this doc's "validated" section after the first Keyword Planner
   pass and again at day 30 from real search terms.

## 2. Seed keywords by ad group

### Ad group 1: הדרכת הורים -> /services/parent-guidance

High intent (commercial):
- הדרכת הורים
- הדרכת הורים אישית
- מדריכת הורים
- הדרכת הורים מחיר
- ייעוץ הורי / יועצת הורית
- הדרכת הורים אונליין / הדרכת הורים בזום

Problem-driven (parent searching about the child, still strong intent):
- התקפי זעם אצל ילדים - מה עושים
- הצבת גבולות לילדים
- ילד לא מקשיב - מה עושים
- מריבות בין אחים - עזרה

Location-modified:
- הדרכת הורים ירושלים / מבשרת ציון / בית שמש / מודיעין

### Ad group 2: טיפול רגשי לילדים -> /services/child-therapy

High intent:
- טיפול רגשי לילדים
- מטפלת רגשית לילדים
- טיפול רגשי לילד
- פסיכותרפיה לילדים
- טיפול בחרדה אצל ילדים
- טיפול CBT לילדים

Problem-driven:
- חרדה אצל ילדים - טיפול
- ילד עם ביטחון עצמי נמוך - איך עוזרים
- ילד עם קשיים חברתיים - עזרה
- פחדים אצל ילדים - טיפול

Location-modified:
- טיפול רגשי לילדים ירושלים / בית שמש / מבשרת / מודיעין

### Ad group 3: טיפול למתבגרים -> /services/teen-therapy

High intent:
- טיפול רגשי למתבגרים
- מטפלת למתבגרים
- פסיכותרפיה למתבגרים
- טיפול לבני נוער
- טיפול CBT למתבגרים
- מטפל רגשי לנוער

Problem-driven (parents searching):
- מתבגר מסתגר בחדר - מה עושים
- דיכאון אצל בני נוער - עזרה
- חרדת בחינות אצל בני נוער - טיפול
- בן נוער עצוב / מתבגר עצבני

Location-modified:
- טיפול למתבגרים ירושלים / בית שמש / מבשרת / מודיעין

## 3. Geo targeting

Included (~30-min drive from Shoeva; verify exact radius in Ads):
Jerusalem (west), Mevaseret Zion, Beit Shemesh, Modi'in, Tzur Hadassah,
Abu Ghosh, Har Adar, Ma'ale HaHamisha corridor towns.
Presence-only targeting.

Geo negatives (keyword-level, for searches that name far cities):
חיפה, תל אביב*, באר שבע, אילת, נתניה, אשדוד, אשקלון, טבריה, צפת.
(*Tel Aviv is deliberately excluded at launch; Zoom demand can be tested
later with a dedicated online campaign, not by leaking budget from local.)

## 4. Negative keywords (campaign level, launch list)

Training/study intent: קורס, קורסים, לימודים, ללמוד, הכשרה, הכשרת, תעודה,
תואר, סטאז, התמחות, סדנה למטפלים, אוניברסיטה, מכללה

Jobs: דרושים, משרה, משרות, עבודה, שכר, קריירה

Free/public/insurance-funded (owner: private practice only):
חינם, בחינם, ללא תשלום, מסובסד, קופת חולים, כללית, מכבי, מאוחדת, לאומית,
סל בריאות, התחייבות, טופס 17, מכון ציבורי, שירות ציבורי, טיפול ציבורי

Definitions/self-help-only intent: מה זה, הגדרה, ויקיפדיה, PDF, ספר,
ספרים, סיכום, מצגת, שאלון, מבחן, אבחון עצמי, טסט

Services not offered: פסיכיאטר, תרופות, ריטלין, אבחון ADHD, אבחון
פסיכודידקטי, נוירופידבק, טיפול בבעלי חיים, רכיבה טיפולית

Crisis/acute (ethics: a private-practice ad must not answer these):
התאבדות, אובדנות, אובדני, קו חירום, ער"ן, מיון פסיכיאטרי, אשפוז

Other platforms/comparison-shopping noise: פורום, המלצות גולשים, זול

Note on אבחון (assessments): excluded as "not offered" - confirm with Nira
that she indeed does not do formal אבחונים before launch; if she does,
move the term to a keyword list instead.

## 5. Buckets we deliberately do NOT bid on

- Purely informational ("סימנים לחרדה אצל ילדים", "שלבי גיל ההתבגרות") -
  the article library captures these organically; paying for them buys
  readers, not clients.
- Crisis/urgent searches - see negatives; ethically these need public
  emergency resources, not a private clinic ad.
- Sex-therapy terms - owner decision to keep organic-only at launch.
- Adult individual therapy + couples terms - deferred, revisit at day 60.
