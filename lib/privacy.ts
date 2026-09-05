// The privacy policy, as data rather than as JSX.
//
// Two reasons it lives here. The page at /privacy renders it, and the
// `Accept: text/markdown` representation of that page renders it too - one
// source, so the two cannot drift into saying different things about what the
// site collects. And every claim below is checkable against code in this repo,
// which is the only way a privacy policy stays true: the file names are in the
// comments so the next person to add a tracker knows what they also have to
// edit.
//
// Owner review: the factual content is derived from the code. The legal
// framing (Israeli Privacy Protection Law) should be confirmed by Nira before
// anyone treats it as advice.

export const PRIVACY_UPDATED = '2026-09-05';

export type PrivacySection = {
  heading: string;
  /** Prose paragraphs, in order. */
  body?: string[];
  /** Bullet list rendered after the prose. */
  bullets?: string[];
};

export const PRIVACY_INTRO = [
  'האתר הזה שייך לנירה גבאי, מטפלת בפסיכותרפיה ומדריכת הורים. אנשים שמגיעים לכאן עושים זאת לרוב ברגע לא פשוט בחיים שלהם, ולכן חשוב לי שיהיה כתוב בפירוש איזה מידע נאסף באתר, למה, ומה לא נאסף בו.',
  'המסמך הזה מתאר את האתר בלבד. מידע שנמסר בתוך טיפול עצמו חוסה תחת חובת הסודיות המקצועית ואינו נוגע לדף הזה.',
];

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    // app/api/contact/route.ts
    heading: 'מידע שאתם מוסרים ביוזמתכם',
    body: [
      'טופס יצירת הקשר באתר מבקש שם, טלפון והודעה, ומאפשר להשאיר גם כתובת אימייל. הפרטים האלה נשמרים במסד הנתונים של האתר ונשלחים אליי במייל, כדי שאוכל לחזור אליכם.',
      'לצד הפנייה נשמר גם מידע טכני על הדרך שבה הגעתם לאתר - מאיזה עמוד נשלחה הפנייה, ואם הגעתם דרך מודעה, פרטי הקמפיין שלה. זה משמש רק כדי להבין אילו ערוצים מביאים אנשים לאתר.',
      'טופס ההרשמה לרשימת התפוצה שומר את כתובת האימייל בלבד.',
    ],
  },
  {
    heading: 'למה המידע הזה משמש',
    bullets: [
      'ליצירת קשר חוזר בעקבות פנייה.',
      'לשליחת תוכן לרשימת התפוצה, למי שנרשם אליה.',
      'להבנה כללית של השימוש באתר ושל האפקטיביות של הפרסום.',
    ],
  },
  {
    heading: 'מה לא נאסף',
    body: [
      'אני לא מוכרת, משכירה או מעבירה את הפרטים שלכם לצד שלישי לצורכי שיווק. אין באתר מכירה של רשימות ואין העברה של פניות לגורמים אחרים.',
      'מדידת הגלישה הפנימית של האתר לא שומרת כתובת IP, לא שומרת את מחרוזת הדפדפן ולא שומרת כתובות אימייל. היא מזהה ביקור באמצעות מספר אקראי שנוצר לאותו ביקור בלבד ואינו מקושר לשום פרט מזהה.',
    ],
  },
  {
    // lib/siteEvents.ts, app/api/track/route.ts
    heading: 'מדידה פנימית',
    body: [
      'האתר מודד בעצמו נתוני שימוש בסיסיים: איזה עמוד נצפה, מאיזה סוג עמוד מדובר, האם הגלישה מהטלפון או מהמחשב, מאיזה אתר הגעתם, ופרטי קמפיין אם היו כאלה. המידע הזה נשמר ללא זיהוי אישי ומשמש אותי כדי להבין אילו מאמרים נקראים ואיפה אנשים מתקשים למצוא את מה שחיפשו.',
    ],
  },
  {
    // components/GoogleAnalytics.tsx, GoogleTagManager.tsx, MetaPixel.tsx, Clarity.tsx, app/layout.tsx
    heading: 'שירותים חיצוניים',
    body: [
      'לצד המדידה הפנימית, האתר עושה שימוש בשירותי מדידה חיצוניים. כל אחד מהם פועל לפי מדיניות הפרטיות שלו, וייתכן שהוא שומר עוגיות בדפדפן שלכם:',
    ],
    bullets: [
      'Google Analytics ו-Google Tag Manager - מדידת תנועה וביצועי פרסום.',
      'Meta Pixel - מדידת ביצועי פרסום בפייסבוק ובאינסטגרם.',
      'Microsoft Clarity - ניתוח שימושיות ברמת העמוד.',
      'Vercel Analytics ו-Speed Insights - מדידת ביצועים וזמני טעינה.',
    ],
  },
  {
    heading: 'עוגיות והשליטה שלכם בהן',
    body: [
      'אפשר לחסום עוגיות או למחוק אותן דרך הגדרות הדפדפן, וכן להשתמש בדפדפן במצב פרטי. חסימה של עוגיות המדידה לא פוגעת בשימוש באתר: כל התוכן, המאמרים וטופס יצירת הקשר ממשיכים לעבוד במלואם.',
    ],
  },
  {
    heading: 'שמירה ואבטחה',
    body: [
      'הפניות ורשימת התפוצה נשמרות בשירות מסד נתונים מנוהל, עם גישה מוגבלת. האתר מוגש כולו בחיבור מוצפן (HTTPS). המידע נשמר כל עוד הוא נדרש לצורך הקשר איתכם, ואפשר לבקש למחוק אותו בכל שלב.',
    ],
  },
  {
    heading: 'הזכויות שלכם',
    body: [
      'אתם רשאים לבקש לדעת איזה מידע נשמר עליכם, לתקן אותו, או לבקש שיימחק. אפשר גם להסיר את עצמכם מרשימת התפוצה בכל עת. פנייה בכל אחד מהנושאים האלה תיענה תוך זמן סביר.',
    ],
  },
  {
    heading: 'קטינים',
    body: [
      'האתר אינו מיועד לשימוש עצמאי של ילדים. פנייה בנוגע לקטין אמורה להישלח על ידי הורה או אפוטרופוס.',
    ],
  },
  {
    heading: 'שינויים במדיניות',
    body: [
      'אם המדיניות תתעדכן, התאריך שבראש העמוד ישתנה בהתאם. שינוי מהותי יופיע בגוף העמוד ולא רק בתאריך.',
    ],
  },
  {
    heading: 'יצירת קשר בנושא פרטיות',
    bullets: [
      'אימייל: niraga1123@gmail.com',
      'טלפון: 050-7936681',
    ],
  },
];
