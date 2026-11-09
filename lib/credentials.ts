// Nira's verified qualifications: the one list the About page, the Person
// JSON-LD (`hasCredential`) and the Markdown version of /about all read from,
// so the three can never disagree.
//
// Source: certificate photos checked on 6 Nov 2026 (project file
// nira-growth/nira-credentials.md). Only what a certificate states is here:
// title, issuer, year and hours. No ID, certificate or licence-holder details
// beyond the public licence category.
//
// Two rules that are easy to break when editing:
// - DBT is not a separate certificate. It was part of the University of Haifa
//   CBT program, so it appears only inside that entry.
// - Healthy sexuality (מיניות בריאה) is experience from workshops Nira led. It
//   is NOT a training, certification or specialisation and must never be
//   added to this list. See `HEALTHY_SEXUALITY_EXPERIENCE` below.
//
// Nira is not a psychologist, a social worker or any Ministry of Health
// licensed profession. Nothing here may suggest otherwise.

export type Credential = {
  /** Short Hebrew title, as shown on the About page and in the schema name. */
  title: string;
  /** Issuing institution(s), in Hebrew. */
  institution: string;
  /** Year the credential was completed, or a range for a multi-year program. */
  year: string;
  /** Scope in hours, when the certificate states it. */
  hours?: number;
  /** schema.org credentialCategory. */
  category: 'degree' | 'certificate' | 'license';
  /** One-line plain-language note for readers: what this means for them. */
  note: string;
};

export const CREDENTIALS: Credential[] = [
  {
    title: 'בוגרת התוכנית התלת-שנתית בפסיכותרפיה אינדיבידואלית',
    institution: 'מכון אדלר, בית הספר לפסיכותרפיה',
    year: '2019',
    hours: 790,
    category: 'certificate',
    note: 'הבסיס לעבודה הטיפולית עם מבוגרים ומתבגרים.',
  },
  {
    title: 'הכשרה דו-שנתית בטיפול קוגניטיבי התנהגותי (CBT), כולל DBT',
    institution: 'אוניברסיטת חיפה, בית הספר לפסיכולוגיה',
    year: '2022-2024',
    hours: 348,
    category: 'certificate',
    note: 'כלים ממוקדים לחרדה, דפוסי מחשבה וויסות רגשי.',
  },
  {
    title: 'הסמכה להנחיית קבוצות הורים ומשפחה (תוכנית תלת-שנתית)',
    institution: 'מכון אדלר ומשרד החינוך',
    year: '2012',
    hours: 1004,
    category: 'certificate',
    note: 'הבסיס להדרכת ההורים, אישית ובקבוצה.',
  },
  {
    title: 'קורס הכשרה בטיפול זוגי',
    institution: 'מכון אדלר, בית הספר לפסיכותרפיה',
    year: '2021',
    hours: 108,
    category: 'certificate',
    note: 'עבודה עם זוגות על תקשורת, משברים וקשר.',
  },
  {
    title: 'תואר שני (M.A) בייעוץ חינוכי',
    institution: 'המכללה האקדמית לישראל ברמת גן',
    year: '2015',
    category: 'degree',
    note: 'הבנה של ילדים, מתבגרים ומשפחות בתוך מערכת החינוך.',
  },
  {
    title: 'רישיון קבוע לייעוץ חינוכי',
    institution: 'משרד החינוך',
    year: '2017',
    category: 'license',
    note: 'יועצת חינוכית מוסמכת.',
  },
  {
    title: 'הכשרת מדריכים בתחום לקויות למידה ו-ADHD',
    institution: 'אוניברסיטת תל אביב ומשרד החינוך',
    year: '2021',
    hours: 120,
    category: 'certificate',
    note: 'ליווי מתבגרים והורים כשלקות למידה או קשב הם חלק מהתמונה.',
  },
  {
    title: 'כלים בסכמה תרפיה',
    institution: 'מכון מפרשים, המכללה האקדמית תל אביב-יפו',
    year: '2026',
    hours: 30,
    category: 'certificate',
    note: 'השתלמות בכלים מעולם הסכמה תרפיה.',
  },
];

/** "מכון אדלר, 2019, 790 שעות" - the compact form used in lists. */
export function credentialDetails(c: Credential): string {
  const hours = c.hours ? `, ${c.hours.toLocaleString('en-US')} שעות` : '';
  return `${c.institution}, ${c.year}${hours}`;
}

/** One line per credential, for Markdown and plain-text summaries. */
export function credentialLine(c: Credential): string {
  return `${c.title} - ${credentialDetails(c)}`;
}

/**
 * The only accepted way to describe healthy sexuality. Workshop experience,
 * never a qualification.
 */
export const HEALTHY_SEXUALITY_EXPERIENCE = 'ניסיון בהעברת סדנאות למיניות בריאה';

/**
 * The one-sentence professional summary, shared by the Person schema and the
 * Markdown pages. Matches the "safe public wording" in nira-credentials.md.
 */
export const PROFESSIONAL_SUMMARY =
  'מטפלת בפסיכותרפיה (בוגרת התוכנית התלת-שנתית של מכון אדלר) ומדריכת הורים מוסמכת (מכון אדלר ומשרד החינוך). בעלת תואר שני (M.A) בייעוץ חינוכי ורישיון קבוע לייעוץ חינוכי, הכשרה דו-שנתית ב-CBT וב-DBT מאוניברסיטת חיפה והכשרה בטיפול זוגי ממכון אדלר.';

/**
 * Third-party therapist-directory profiles of Nira, each checked live on
 * 9 Nov 2026. These are `sameAs` links on the Person node: they tell a search
 * engine or an AI system that the therapist on these directories is the same
 * person as the one on this site.
 */
export const DIRECTORY_PROFILES = [
  // פסיכולוגיה עברית - verified educational-counsellor badge
  'https://www.hebpsy.net/showprofile.asp?id=68495',
  // כל טיפול
  'https://www.koltipul.co.il/therapist/parental-guidance/9426',
  // mentalytics (טיפול חכם)
  'https://www.mentalytics.co.il/therapists/%D7%A0%D7%99%D7%A8%D7%94-%D7%92%D7%91%D7%90%D7%99-e61fb5cf-6c0a-4ab0-951a-7b4b0f0fe1be',
];

/**
 * Business listings of the practice (not the person), for `sameAs` on the
 * practice node, next to the Google Business Profile. B144 is a business-
 * directory listing of the clinic, checked live on 9 Nov 2026. It still shows
 * a house number that Dan is having B144 remove; the site itself, and this
 * schema, still carry no street address.
 */
export const BUSINESS_LISTINGS = ['https://www.b144.co.il/b144_sip/401D0D1A4370655D4017011143/'];
