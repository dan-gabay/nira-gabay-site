// Copy for the paid-traffic landing page /lp/adult-therapy (variant B of the
// adult-therapy A/B test; variant A is /services/adult-therapy, unchanged).
//
// Every string below is the approved final copy from the landing-page handoff
// (section 4), entered verbatim. Do not rewrite, extend or "improve" it here:
// a change of wording is a change to the experiment and needs the owner's
// approval first.

export const LP_ADULT_PATH = '/lp/adult-therapy';

/** Sent as `page_variant` on this page's analytics events (lib/analytics.ts). */
export const LP_ADULT_VARIANT = 'adult_lp_b';

/** sourceId for the form: analytics label and `contact_form_submit` event_label. */
export const LP_ADULT_FORM_SOURCE = 'lp_adult_therapy';

/** The anchor every CTA on the page scrolls to: the hero form. */
export const LP_FORM_ANCHOR = 'contact-form';

export const LP_META = {
  title: 'טיפול רגשי למבוגרים | נירה גבאי',
  description:
    'טיפול רגשי ופסיכותרפיה למבוגרים עם נירה גבאי. קליניקה במושב שואבה באזור ירושלים ואפשרות לטיפול בזום. אפשר להתחיל בשיחה.',
};

export const LP_HERO = {
  h1: 'טיפול רגשי ופסיכותרפיה למבוגרים',
  subtitle: 'מקום אחד בשבוע שבו לא צריך להיות בסדר',
  paragraphs: [
    'לפעמים הכול נראה כרגיל מבחוץ. ממשיכים לעבוד, לדאוג לאחרים ולנהל את היום, אבל בפנים יש חרדה, שחיקה, תחושת עומס או משהו שמרגיש תקוע.',
    'אני נירה גבאי, מטפלת בפסיכותרפיה. אני מציעה מרחב אישי וקשוב, שבו אפשר לעצור, להבין מה עובר עליכם ולמצוא יחד דרך שמתאימה לכם.',
  ],
  practical: 'בקליניקה במושב שואבה, באזור ירושלים, או בזום.',
};

export const LP_FORM = {
  title: 'אפשר להתחיל בשיחה',
  nameLabel: 'שם מלא',
  phoneLabel: 'טלפון',
  messageLabel: 'הודעה קצרה',
  submit: 'השאירו פרטים ואחזור אליכם',
  microcopy: 'אין צורך לפרט את סיבת הפנייה בטופס.',
  whatsappAlt: 'אפשר גם לפנות אליי ב־WhatsApp.',
};

export const LP_ABOUT = {
  h2: 'נעים להכיר, אני נירה גבאי',
  paragraphs: [
    'אני מטפלת בפסיכותרפיה ומדריכת הורים, בעלת תואר שני בייעוץ חינוכי והכשרות מקצועיות בגישות טיפול שונות.',
    'לאורך השנים עבדתי עם מתבגרים, מבוגרים וזוגות במסגרות טיפוליות וחינוכיות. אני מביאה איתי לחדר הטיפול לא רק ידע מקצועי, אלא גם ניסיון חיים והקשבה לאדם שמולי.',
    'אני מאמינה בקשר טיפולי שמאפשר לדבר בפתיחות, בלי שיפוטיות ובלי צורך להגיע עם תשובות מוכנות.',
  ],
  trainingHeading: 'ההכשרה המקצועית שלי',
  certificatesLink: 'לצפייה בתעודות ובהכשרות נוספות',
  aboutLink: 'עוד עליי',
};

/**
 * "Free, no-commitment intro call": the offer in Nira's live Google Ads
 * headline, repeated on the page so the ad's promise is visible after the
 * click. Added 7 Nov 2026 with Dan's approval (competitor review, item 3).
 */
export const LP_INTRO_CALL = 'שיחת היכרות ללא התחייבות';

export type Training = { title: string; body: string };

export const LP_TRAININGS: Training[] = [
  {
    title: 'פסיכותרפיה אינדיבידואלית',
    body: 'בוגרת תוכנית הכשרה תלת־שנתית במכון אדלר, בהיקף של 790 שעות.',
  },
  {
    title: 'פסיכותרפיה קוגניטיבית־התנהגותית (CBT)',
    body: 'בוגרת תוכנית הכשרה דו־שנתית, בהיקף של 348 שעות לימוד אקדמיות, מאוניברסיטת חיפה.',
  },
  {
    title: 'תואר שני (M.A) בייעוץ חינוכי',
    body: 'בוגרת המכללה האקדמית לישראל ברמת גן.',
  },
];

/**
 * The certificate viewer. Images are redacted exports (ID numbers, licence and
 * certificate numbers and the postal address covered with solid fills, then
 * re-encoded from raw pixels with no metadata); the original photographs are
 * private and never go in the repo. Captions use only the facts listed for
 * each file in the handoff (section 5).
 */
export type Certificate = {
  src: string;
  /** What the certificate is, as written in the handoff. */
  caption: string;
  /** Its field, so the secondary five read as clearly labelled. */
  field: string;
  width: number;
  height: number;
};

export const LP_CERTIFICATES_PRIMARY: Certificate[] = [
  {
    src: '/images/certificates/adler-individual-psychotherapy-2019.webp',
    caption: 'פסיכותרפיה אינדיבידואלית, מכון אדלר, 790 שעות, 2019',
    field: 'פסיכותרפיה',
    width: 1000,
    height: 1333,
  },
  {
    src: '/images/certificates/cbt-haifa-2022-2024.webp',
    caption: 'פסיכותרפיה קוגניטיבית־התנהגותית, 348 שעות, 2022–2024',
    field: 'CBT',
    width: 1000,
    height: 1333,
  },
  {
    src: '/images/certificates/ma-educational-counseling-2015.webp',
    caption: 'תואר שני (M.A) בייעוץ חינוכי, 2015',
    field: 'ייעוץ חינוכי',
    width: 1000,
    height: 1333,
  },
];

export const LP_CERTIFICATES_MORE: Certificate[] = [
  {
    src: '/images/certificates/adler-parent-family-groups-2012.webp',
    caption: 'הנחיית קבוצות הורים ומשפחה, מכון אדלר, 1,004 שעות, 2012',
    field: 'הדרכת הורים',
    width: 1000,
    height: 1333,
  },
  {
    src: '/images/certificates/adler-couples-therapy-2021.webp',
    caption: 'טיפול זוגי, מכון אדלר, 108 שעות, 2021',
    field: 'טיפול זוגי',
    width: 1000,
    height: 1250,
  },
  {
    src: '/images/certificates/schema-therapy-tools-2026.webp',
    caption: 'כלים בסכמה תרפיה ליועצות חינוכיות, 30 שעות, 2026',
    field: 'סכמה תרפיה',
    width: 1000,
    height: 1250,
  },
  {
    src: '/images/certificates/moe-educational-counseling-license-2017.webp',
    caption: 'רישיון קבוע לייעוץ חינוכי, משרד החינוך, 2017',
    field: 'ייעוץ חינוכי',
    width: 1000,
    height: 1250,
  },
  {
    src: '/images/certificates/learning-disabilities-adhd-instructors-2021.webp',
    caption: 'הכשרת מדריכים בתחום לקויות למידה והפרעת קשב, 120 שעות',
    field: 'הדרכת מדריכים',
    width: 1000,
    height: 1333,
  },
];

export const LP_WHEN = {
  h2: 'מתי כדאי לפנות לטיפול?',
  intro:
    'לא צריך לחכות למשבר גדול כדי לפנות לטיפול. לפעמים די בתחושה שמשהו מעסיק אתכם כבר הרבה זמן, ושאתם רוצים להבין אותו אחרת.',
  items: [
    { title: 'חרדה ומתח', body: 'מחשבות שלא מפסיקות, דאגות מתמשכות או התקפי חרדה.' },
    {
      title: 'עצב או אובדן עניין',
      body: 'תחושת כבדות, ריקנות או קושי למצוא הנאה בדברים שפעם היו משמעותיים.',
    },
    { title: 'דפוסים שחוזרים', body: 'קשיים שמופיעים שוב ושוב בזוגיות, במשפחה או בעבודה.' },
    { title: 'משברים ושינויים', body: 'פרידה, אובדן, שינוי בעבודה או תקופה של חוסר ודאות.' },
    {
      title: 'שחיקה וקושי להציב גבולות',
      body: 'התחושה שאתם דואגים לכולם ומתקשים לפנות מקום לעצמכם.',
    },
    {
      title: 'התמודדות אחרי תקופה מורכבת',
      body: 'קשיים שעולים בעקבות שירות מילואים או תקופה ממושכת של מתח וחוסר ודאות.',
    },
  ],
  closing: 'לא תמיד קל להגדיר במילים מה בדיוק מפריע. אפשר להתחיל גם משם.',
};

/**
 * Specific difficulties people search for, shown as short tags under the
 * section 3 cards. Added 7 Nov 2026 with Dan's approval (competitor review,
 * item 5). Every tag is taken from what the live site already says Nira works
 * with (lib/services.ts, adult-therapy and CBT `signs`); do not add a
 * condition here that the site does not already list.
 */
export const LP_WHEN_TOPICS = {
  heading: 'עוד נושאים שאפשר להגיע איתם:',
  items: [
    'התקפי חרדה',
    'חרדה חברתית',
    'חרדת בחינות',
    'פחד מדיבור מול קהל',
    'מחשבות שחוזרות בלולאה',
    'הימנעות ממקומות או ממצבים',
    'פרפקציוניזם וביקורת עצמית',
    'דיכאון',
  ],
};

export const LP_HOW = {
  h2: 'איך נראה הטיפול?',
  paragraphs: [
    'כל תהליך טיפולי הוא אישי, ואין דרך אחת שמתאימה לכולם.',
    'בעבודה שלי אני משלבת התבוננות והבנה של רגשות ודפוסים עמוקים, לצד כלים מעשיים מעולם הטיפול הקוגניטיבי־התנהגותי (CBT), כשיש בכך צורך. לפעמים נתמקד בהבנה של מה שמתרחש, ולפעמים בדרכים מעשיות להתמודד עם מה שקורה עכשיו.',
    'העבודה מתקדמת בהתאם לצרכים ולקצב שלכם.',
  ],
  firstSessionH3: 'ומה קורה בפגישה הראשונה?',
  firstSession: [
    'המפגש הראשון הוא הזדמנות להכיר. תוכלו לספר מה הביא אתכם לטיפול, מה מעסיק אתכם ומה הייתם רוצים שיהיה אחרת.',
    'אין צורך להתכונן מראש או לדעת להסביר הכול. אשאל שאלות כדי להכיר ולהבין את התמונה, ובסיום נוכל לדבר על המשך הדרך ולבחון אם הטיפול שאני מציעה מתאים לכם.',
  ],
  cta: 'לתיאום שיחת היכרות',
};

export const LP_WHERE = {
  h2: 'איפה נפגשים?',
  clinicH3: 'בקליניקה במושב שואבה',
  clinic:
    'הקליניקה נמצאת באזור הרי ירושלים, ומיועדת למגיעים מירושלים, מבשרת ציון והיישובים בסביבה.',
  zoomH3: 'אפשר גם להיפגש בזום',
  zoom: 'למי שמתגורר רחוק או מעדיף להיפגש מהבית, קיימת אפשרות לטיפול מקוון.',
  note: 'פרטים נוספים על אופן המפגשים והמסגרת הטיפולית יימסרו בשיחת ההיכרות.',
};

export const LP_FAQ = {
  h2: 'שאלות נפוצות',
  items: [
    {
      q: 'איך יודעים אם הקושי שלי מצדיק טיפול?',
      a: 'לא צריך להמתין עד שהמצב מחמיר. אם משהו מעסיק אתכם, משפיע על ההרגשה או חוזר שוב ושוב בחיים, אפשר לפנות ולבדוק אם טיפול מתאים.',
    },
    {
      q: 'האם את פסיכולוגית?',
      a: 'לא. אני מטפלת בפסיכותרפיה ומדריכת הורים, בעלת תואר שני בייעוץ חינוכי והכשרה מקצועית ב־CBT. כאשר נדרשים אבחון או טיפול שאינם בתחום עיסוקי, אני מפנה לגורם המקצועי המתאים.',
    },
    {
      q: 'כמה זמן נמשך הטיפול ובאיזו תדירות נפגשים?',
      a: 'כל תהליך טיפולי הוא אישי. משך הטיפול ותדירות המפגשים משתנים ממטופל למטופל ומותאמים לצרכים, למטרות ולנסיבות האישיות. בשיחת ההיכרות נוכל לבחון יחד את המסגרת המתאימה, ולעדכן אותה בהמשך לפי הצורך.',
    },
    {
      q: 'אפשר להגיע לטיפול גם בזום?',
      a: 'כן. אפשר לקיים מפגשים מקוונים, גם אם אינכם מתגוררים באזור ירושלים.',
    },
  ],
};

export const LP_CLOSING = {
  h2: 'אפשר להתחיל בשיחה',
  body: 'אם אתם שוקלים לפנות לטיפול, אתם מוזמנים ליצור איתי קשר. אין צורך להגיע עם הסבר מסודר או החלטה סופית. אפשר לשוחח, לשאול שאלות ולבדוק אם הטיפול מתאים לכם.',
  primary: 'השאירו פרטים ואחזור אליכם',
  whatsapp: 'שלחו לי הודעה ב־WhatsApp',
  signatureName: 'נירה גבאי | מטפלת בפסיכותרפיה ומדריכת הורים',
  signaturePlace: 'מושב שואבה | טיפול בקליניקה ובזום',
};
