import type { Metadata } from 'next';
import Link from 'next/link';
import { CLINIC } from '@/lib/clinic';

// The accessibility statement (הצהרת נגישות), linked from the footer next to
// the accessibility menu.
//
// Every factual claim here is checkable in the repo: the menu options are the
// ones in components/AccessibilityMenu.tsx, the skip link is in app/layout.tsx.
// It deliberately does not claim full conformance to IS 5568: nobody has
// audited the site against it, and a statement that overstates is worse than
// one that says what was done.
//
// Owner review: the contact person and the clinic paragraph need Nira's
// confirmation. The clinic's street address stays off the site (owner
// decision, see lib/clinic.ts), so physical access details are by request.

const UPDATED = '2026-10-11';

export const metadata: Metadata = {
  title: { absolute: 'הצהרת נגישות - נירה גבאי' },
  description:
    'הצהרת הנגישות של האתר של נירה גבאי: מה נעשה כדי שהאתר יהיה נגיש, אילו התאמות זמינות, ולמי לפנות אם משהו לא נגיש.',
  alternates: { canonical: 'https://www.niragabay.com/accessibility' },
};

const MENU_OPTIONS = [
  'הגדלה והקטנה של גודל הטקסט',
  'ניגודיות גבוהה',
  'הדגשת קישורים',
  'גופן קריא (מותאם לדיסלקציה)',
  'עצירת אנימציות',
  'מצב אפור',
  'סמן עכבר גדול',
];

export default function AccessibilityStatementPage() {
  return (
    <div style={{ paddingTop: '80px' }}>
      <section className="py-12 md:py-20 bg-gradient-to-br from-stone-100 to-amber-50">
        <div className="container mx-auto px-4 md:px-8 max-w-3xl">
          <h1 className="text-2xl md:text-4xl font-bold text-stone-800 mb-3">הצהרת נגישות</h1>
          <p className="text-xs md:text-sm text-stone-500">
            עודכן: <time dateTime={UPDATED}>{new Date(UPDATED).toLocaleDateString('he-IL')}</time>
          </p>
        </div>
      </section>

      <section className="py-10 md:py-16 bg-white">
        <div className="container mx-auto px-4 md:px-8 max-w-3xl space-y-8 md:space-y-12 text-sm md:text-lg text-stone-600 leading-relaxed">
          <p>
            חשוב לי שכל מי שמגיע לאתר יוכל לקרוא בו, להתמצא בו וליצור קשר בנוחות, גם אם הוא נעזר
            בקורא מסך, גולש באמצעות המקלדת בלבד או זקוק לטקסט גדול יותר. האתר נבנה מתוך שאיפה לעמוד
            בדרישות תקן ישראלי 5568 (המבוסס על הנחיות WCAG 2.0 ברמה AA), ואני ממשיכה לשפר אותו.
          </p>

          <div>
            <h2 className="text-lg md:text-2xl font-bold text-stone-800 mb-3 md:mb-4">מה נעשה באתר</h2>
            <ul className="space-y-2">
              {[
                'האתר כתוב בעברית ומוצג מימין לשמאל, עם מבנה כותרות ברור.',
                'קישור "דלגו לתוכן הראשי" בתחילת כל עמוד, למי שגולש עם מקלדת או קורא מסך.',
                'אפשר לנווט באתר באמצעות המקלדת.',
                'האתר מותאם לצפייה בטלפון, בטאבלט ובמחשב.',
                'כפתורים שיש בהם אייקון בלבד מתוארים בטקסט עבור קוראי מסך.',
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span aria-hidden="true" className="text-amber-500 flex-shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-lg md:text-2xl font-bold text-stone-800 mb-3 md:mb-4">תפריט הנגישות</h2>
            <p>
              בתחתית כל עמוד יש כפתור &quot;נגישות&quot; שפותח תפריט התאמות. ההגדרות נשמרות בדפדפן שלכם
              ונשארות בתוקף גם במעבר בין עמודים:
            </p>
            <ul className="mt-3 md:mt-4 space-y-2">
              {MENU_OPTIONS.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span aria-hidden="true" className="text-amber-500 flex-shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-lg md:text-2xl font-bold text-stone-800 mb-3 md:mb-4">מה עדיין עשוי להיות לא נגיש</h2>
            <p>
              למרות המאמץ, ייתכן שחלקים מהאתר עדיין אינם נגישים במלואם, למשל מאמרים ותמונות ותיקים
              שהועברו מאתר קודם. אם נתקלתם בבעיה, אשמח מאוד לשמוע ולתקן.
            </p>
          </div>

          <div>
            <h2 className="text-lg md:text-2xl font-bold text-stone-800 mb-3 md:mb-4">נגישות הקליניקה</h2>
            <p>
              הקליניקה נמצאת ב{CLINIC.locality}. לפרטים על הגעה ונגישות פיזית של המקום, אפשר לפנות
              אליי לפני הפגישה ואשמח לעזור.
            </p>
          </div>

          <div>
            <h2 className="text-lg md:text-2xl font-bold text-stone-800 mb-3 md:mb-4">פנייה בנושא נגישות</h2>
            <p>נתקלתם בקושי, או שיש לכם הצעה לשיפור? אפשר לפנות אליי ישירות:</p>
            <ul className="mt-3 md:mt-4 space-y-2">
              <li>נירה גבאי</li>
              <li>
                טלפון:{' '}
                <a href={CLINIC.phoneHref} className="text-amber-700 underline hover:text-amber-800">
                  {CLINIC.phoneDisplay}
                </a>
              </li>
              <li>
                דוא&quot;ל:{' '}
                <a href="mailto:niraga1123@gmail.com" className="text-amber-700 underline hover:text-amber-800">
                  niraga1123@gmail.com
                </a>
              </li>
              <li>
                או דרך{' '}
                <Link href="/contact" className="text-amber-700 underline hover:text-amber-800">
                  עמוד יצירת הקשר
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
