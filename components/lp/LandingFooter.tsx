'use client';

import Link from 'next/link';
import { Phone, Mail } from 'lucide-react';
import { trackContactMethodClick, trackLandingInternalNavigation } from '@/lib/analytics';
import { CLINIC } from '@/lib/clinic';
import { openAccessibilityMenu } from '@/components/AccessibilityMenu';

/**
 * The landing page's footer: contact details, the home page, and the privacy
 * and accessibility links the site footer already carries (same routes, same
 * accessibility-menu button). No services list, articles or social links -
 * those are the exits the landing page exists to leave out.
 */
export default function LandingFooter({ source }: { source: string }) {
  const link =
    'inline-block py-1.5 -my-1.5 hover:text-white transition-colors underline underline-offset-4';
  return (
    <footer className="bg-stone-800 text-stone-300">
      <div className="container mx-auto px-4 md:px-8 py-8 md:py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <p className="text-base md:text-lg font-bold text-white font-serif">נירה גבאי</p>
            <p className="text-sm text-stone-400">מטפלת בפסיכותרפיה ומדריכת הורים</p>
          </div>
          <ul className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm md:text-base">
            <li className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-stone-400" aria-hidden="true" />
              <a
                href={CLINIC.phoneHref}
                dir="ltr"
                className="inline-block py-1.5 -my-1.5 hover:text-white transition-colors"
                onClick={() => trackContactMethodClick('phone', source)}
              >
                {CLINIC.phoneDisplay}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-stone-400" aria-hidden="true" />
              <a
                href="mailto:niraga1123@gmail.com"
                className="inline-block py-1.5 -my-1.5 hover:text-white transition-colors"
                onClick={() => trackContactMethodClick('email', source)}
              >
                niraga1123@gmail.com
              </a>
            </li>
          </ul>
        </div>

        <div className="border-t border-stone-700 mt-6 pt-5 text-center text-xs md:text-sm text-stone-400">
          <p>© {new Date().getFullYear()} נירה גבאי - כל הזכויות שמורות</p>
          <p className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
            <Link href="/" className={link} onClick={() => trackLandingInternalNavigation('home_footer')}>
              דף הבית
            </Link>
            <Link
              href="/privacy"
              className={link}
              onClick={() => trackLandingInternalNavigation('privacy')}
            >
              מדיניות פרטיות
            </Link>
            <Link
              href="/accessibility"
              className={link}
              onClick={() => trackLandingInternalNavigation('accessibility_statement')}
            >
              הצהרת נגישות
            </Link>
            <button type="button" className={link} onClick={openAccessibilityMenu}>
              נגישות
            </button>
          </p>
        </div>
      </div>
    </footer>
  );
}
