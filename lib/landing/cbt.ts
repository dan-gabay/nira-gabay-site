// Copy for the paid-traffic landing page /lp/cbt (the CBT ad group's landing
// page; the organic CBT page is /services/cbt and is not changed).
//
// DRAFT - NOT APPROVED FOR PUBLISHING. Nira or Dan must approve every string
// below before this page receives traffic. Each block notes where its wording
// comes from:
//   [adult-lp]  approved final copy of /lp/adult-therapy (lib/landing/adultTherapy.ts)
//   [services]  text already live on /services/cbt (lib/services.ts)
//   [new]       new wording, built only from verified facts
//               (nira-growth/nira-credentials.md); needs approval.
//
// Rules kept: "מטפלת בפסיכותרפיה", never "פסיכולוגית"; no price, no
// testimonials, no outcome promises, no fixed session length or weekly
// frequency, no street address. DBT is described only as part of the CBT
// training (no separate DBT certificate).

import {
  LP_CERTIFICATES_MORE,
  LP_CERTIFICATES_PRIMARY,
  type Certificate,
  type Training,
} from './adultTherapy';

export const LP_CBT_PATH = '/lp/cbt';

/** Sent as `page_variant` on this page's analytics events (lib/analytics.ts). */
export const LP_CBT_VARIANT = 'cbt_lp';

/** sourceId for the form: analytics label and `contact_form_submit` event_label. */
export const LP_CBT_FORM_SOURCE = 'lp_cbt';

// [new] Document title / meta description.
export const LP_CBT_META = {
  title: 'טיפול CBT בחרדה ובדיכאון | נירה גבאי',
  description:
    'טיפול קוגניטיבי־התנהגותי (CBT) עם נירה גבאי, מטפלת בפסיכותרפיה עם הכשרה דו־שנתית ב־CBT. קליניקה במושב שואבה באזור ירושלים ואפשרות לטיפול בזום.',
};

export const LP_CBT_HERO = {
  // [services] the live H1 of /services/cbt.
  h1: 'טיפול CBT בחרדה ובדיכאון',
  // [services] the live tagline of /services/cbt.
  subtitle: 'גישה ממוקדת ומעשית לחרדה, לדיכאון ולדפוסי חשיבה שחוזרים',
  paragraphs: [
    // [services] intro, paragraph 1.
    'CBT הוא טיפול ממוקד ומעשי. במקום לצלול שנים אחורה, הוא מתחיל במה שקורה לכם עכשיו: מה אתם חושבים ברגע שהחרדה עולה, מה אתם עושים בעקבות זה, ואיך המעגל הזה מתחזק את עצמו.',
    // [new] built from the adult-LP intro line + the verified CBT training.
    'אני נירה גבאי, מטפלת בפסיכותרפיה, בעלת הכשרה דו־שנתית ב־CBT שכללה גם DBT. אני מציעה מרחב אישי וקשוב, שבו אפשר להבין מה קורה ולמצוא יחד כלים שמתאימים לכם.',
  ],
  // [adult-lp]
  practical: 'בקליניקה במושב שואבה, באזור ירושלים, או בזום.',
};

/**
 * [adult-lp] The three primary trainings, CBT first. CBT line worded by Dan
 * (8 Nov 2026). DBT is mentioned in the hero paragraph instead.
 */
export const LP_CBT_TRAININGS: Training[] = [
  {
    title: 'פסיכותרפיה קוגניטיבית־התנהגותית (CBT)',
    body: 'בוגרת תוכנית הכשרה דו־שנתית, בהיקף של 348 שעות לימוד אקדמיות, מאוניברסיטת חיפה.',
  },
  {
    title: 'פסיכותרפיה אינדיבידואלית',
    body: 'בוגרת תוכנית הכשרה תלת־שנתית במכון אדלר, בהיקף של 790 שעות.',
  },
  {
    title: 'תואר שני (M.A) בייעוץ חינוכי',
    body: 'בוגרת המכללה האקדמית לישראל ברמת גן.',
  },
];

/** Certificate viewer order for this page: the CBT certificate first. */
export const LP_CBT_CERTIFICATES_PRIMARY: Certificate[] = [
  LP_CERTIFICATES_PRIMARY[1],
  LP_CERTIFICATES_PRIMARY[0],
  LP_CERTIFICATES_PRIMARY[2],
];
export const LP_CBT_CERTIFICATES_MORE: Certificate[] = LP_CERTIFICATES_MORE;

export const LP_CBT_WHEN = {
  // [new] heading.
  h2: 'מתי CBT יכול להתאים?',
  // [adult-lp]
  intro:
    'לא צריך לחכות למשבר גדול כדי לפנות לטיפול. לפעמים די בתחושה שמשהו מעסיק אתכם כבר הרבה זמן, ושאתם רוצים להבין אותו אחרת.',
  // [services] the live "signs" list of /services/cbt.
  items: [
    'חרדה שמלווה אתכם ברקע כל היום, או מגיעה בהתקפים',
    'הימנעות: יש מקומות, מצבים או שיחות שאתם כבר לא מגיעים אליהם',
    'מחשבות שחוזרות בלולאה ואי אפשר לעצור אותן',
    'חרדה חברתית, חרדת בחינות או פחד מדיבור מול קהל',
    'דיכאון: אובדן עניין, עייפות, תחושת כבדות שלא עוברת',
    'פרפקציוניזם וביקורת עצמית שלא נותנת מנוחה',
  ],
  // [adult-lp]
  closing: 'לא תמיד קל להגדיר במילים מה בדיוק מפריע. אפשר להתחיל גם משם.',
};

export const LP_CBT_HOW = {
  // [new] heading.
  h2: 'איך עובד טיפול CBT?',
  // [services] "איך זה עובד", all three paragraphs.
  paragraphs: [
    'בשלב הראשון אנחנו ממפים את המעגל. חרדה כמעט תמיד פועלת באותו אופן: מחשבה מפעילה תחושה גופנית, התחושה מפעילה התנהגות, ולרוב ההתנהגות היא הימנעות. ההימנעות מרגיעה לרגע, ובדיוק בגלל זה היא מלמדת את המוח שהסכנה הייתה אמיתית. כך המעגל מתהדק.',
    'אחר כך עובדים בשני כיוונים במקביל. בכיוון אחד לומדים לזהות את המחשבה האוטומטית ולבחון אותה, לא כדי "לחשוב חיובי" אלא כדי לבדוק אם היא באמת מדויקת. בכיוון השני חוזרים בהדרגה למה שנמנע ממנו, בקצב שאתם קובעים ובצעדים קטנים.',
    'בין המפגשים יש לרוב תרגול קצר. זה לא שיעורי בית ואף אחד לא בודק, אבל זה מה שהופך שיחה בחדר לשינוי אמיתי בחוץ.',
  ],
  // [services] intro, paragraph 2 (names the training as already on the site).
  integrative:
    'יש לי הכשרה מקצועית ב-CBT וב-DBT מאוניברסיטת חיפה, ואני משלבת אותה בעבודה טיפולית רחבה יותר. בפועל זה אומר שאנחנו לא מסתפקים בטכניקות, אבל גם לא נשארים בהבנה בלי כלים.',
  // [services] the "טיפול DBT" section (Nira's own wording).
  dbtH3: 'ומה לגבי DBT?',
  dbt: 'טיפול DBT מיועד לבני נוער ולמבוגרים שיש להם התפרצויות זעם, שמתקשים לווסת את עצמם או שהם אימפולסיביים בתגובותיהם, וגם לאנשים שאובחנו עם הפרעת אישיות גבולית.',
  // [adult-lp] heading.
  firstSessionH3: 'ומה קורה בפגישה הראשונה?',
  firstSession: [
    // [services] first-session line 1.
    'במפגש הראשון נבין מה מטריד, מתי זה התחיל, ובאילו מצבים זה מופיע הכי חזק.',
    // [adult-lp] first-session paragraph 2.
    'אין צורך להתכונן מראש או לדעת להסביר הכול. אשאל שאלות כדי להכיר ולהבין את התמונה, ובסיום נוכל לדבר על המשך הדרך ולבחון אם הטיפול שאני מציעה מתאים לכם.',
  ],
  // [adult-lp]
  cta: 'אפשר להתחיל בשיחה',
};

export const LP_CBT_FAQ = {
  h2: 'שאלות נפוצות',
  items: [
    {
      // [adult-lp]
      q: 'האם את פסיכולוגית?',
      a: 'לא. אני מטפלת בפסיכותרפיה ומדריכת הורים, בעלת תואר שני בייעוץ חינוכי והכשרה מקצועית ב־CBT. כאשר נדרשים אבחון או טיפול שאינם בתחום עיסוקי, אני מפנה לגורם המקצועי המתאים.',
    },
    {
      // [new] question; [adult-lp] answer (no fixed length or frequency).
      q: 'כמה זמן נמשך טיפול CBT ובאיזו תדירות נפגשים?',
      a: 'כל תהליך טיפולי הוא אישי. משך הטיפול ותדירות המפגשים משתנים ממטופל למטופל ומותאמים לצרכים, למטרות ולנסיבות האישיות. בשיחת ההיכרות נוכל לבחון יחד את המסגרת המתאימה, ולעדכן אותה בהמשך לפי הצורך.',
    },
    {
      // [services]
      q: 'זה מתאים גם למי שכבר היה בטיפול?',
      a: 'כן, ולעיתים קרובות דווקא כן. אנשים שהיו בטיפול שיחתי והבינו הרבה על עצמם אבל נשארו עם אותה חרדה מוצאים ב-CBT את החלק המעשי שהיה חסר.',
    },
    {
      // [services]
      q: 'צריך לקחת תרופות?',
      a: 'אני מטפלת ולא רופאה, ואיני רושמת תרופות. יש מצבים שבהם שילוב עם טיפול תרופתי מסייע מאוד, וזו החלטה שמתקבלת מול רופא. אם אחשוב שכדאי לשקול את זה, אומר את זה בפתיחות.',
    },
    {
      // [services]
      q: 'אפשר CBT אונליין?',
      a: 'כן. CBT מתאים במיוחד לעבודה אונליין, כי חלק גדול ממנו מובנה וניתן לעשות אותו היטב גם במסך.',
    },
  ],
};
