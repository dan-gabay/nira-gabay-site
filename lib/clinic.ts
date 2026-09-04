// Facts about the physical clinic, in one place.
//
// Local search is the cheapest channel a therapist with a room has, and it
// runs on specifics: where it is, how you get there, where you park, whether
// you can get in with a pushchair. The site said only "מושב שואבה" until now.
//
// Every field below that is `null` is something nobody has told me. The page
// renders around whatever is null rather than guessing, because a wrong
// parking instruction costs somebody a session they were nervous about
// attending in the first place, and a Google listing that contradicts the
// site is worse than a listing with less on it.
//
// Filling these in is the highest-value five minutes available on this site.

export type ClinicRoute = {
  /** Where the drive starts. */
  from: string;
  /** Roughly how long it takes. Free text so "20-25 דקות" is expressible. */
  duration: string;
  /** How to actually drive it, in Nira's words. */
  directions: string;
};

export const CLINIC = {
  locality: 'מושב שואבה',
  region: 'אזור ירושלים',
  addressCountry: 'IL',
  /** Matches lib/servicesSchema.ts - do not let the two drift. */
  geo: { latitude: '31.7907', longitude: '35.0644' },
  phone: '+972-50-7936681',
  phoneDisplay: '050-7936681',
  photo: 'https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/profile.png',

  /** Established across the existing site copy, so safe to repeat. */
  atmosphere:
    'הקליניקה ממוקמת במושב שואבה, באזור ירושלים, במרחב שקט וירוק. החדר מעוצב ליצירת אווירה חמה ומכילה, והשקט סביבו הוא חלק מהעבודה ולא רק רקע לה.',

  // ─── Unknown. Ask Nira, then fill in. ───────────────────────────────
  /**
   * Street / house number, if the moshav uses them.
   *
   * Stays null by the owner's decision, not for lack of an answer: the
   * Google Business Profile does carry a street address, and it surfaced in
   * the Google Ads preview, but the owner asked for it not to go on the site.
   * Do not fill this in from the business profile or from a map.
   */
  streetAddress: null as string | null,
  /** What a first-time visitor should look for on arrival. */
  arrivalNote: null as string | null,
  /** Where to leave the car. */
  parking: null as string | null,
  /** Steps, ramp, ground floor, pushchair access. */
  accessibility: null as string | null,
  /** Typical working days and hours. */
  hours: null as string | null,
  /** Per-origin driving directions. */
  routes: [] as ClinicRoute[],
} as const;

export const ONLINE = {
  heading: 'ולמי שלא יכול להגיע',
  body: [
    'חלק מהאנשים שאני מלווה לא נכנסים לקליניקה אף פעם. הם גרים רחוק, העבודה לא מאפשרת, יש ילדים קטנים בבית, או שפשוט נוח להם יותר מהבית שלהם.',
    'מפגשים בזום הם אפשרות מלאה ולא פשרה, ואני עובדת כך עם אנשים מכל הארץ. מה שנדרש הוא חדר שאפשר לסגור את דלתו וחיבור סביר, וזהו.',
    'בטיפול זוגי הבקשה היחידה הנוספת היא ששניכם תשבו באותו חדר.',
  ],
};
