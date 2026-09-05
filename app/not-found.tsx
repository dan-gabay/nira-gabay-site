import Link from 'next/link';
import { Home, FileText, MessageCircle, Compass } from 'lucide-react';
import { SERVICES_LIVE } from '@/lib/publish';

// The site-wide 404. Next's built-in one already returned the right status
// code; what it did not do was tell anyone - person or agent - where to go
// instead, which turns a wrong URL into a dead end rather than a detour.
//
// So this page lists the real entry points, and names the machine-readable
// ones too. An agent that follows a stale link and lands here can read
// /llms.txt or /sitemap.xml and recover on its own instead of giving up on the
// domain. The same page requested with `Accept: text/markdown` returns a
// Markdown version of exactly this content, with a 404 status
// (app/api/md/[[...path]]/route.ts).

export const metadata = {
  title: 'העמוד לא נמצא | נירה גבאי',
  robots: { index: false, follow: true },
};

const LINKS = [
  { href: '/', label: 'דף הבית', icon: Home },
  { href: '/about', label: 'קצת עליי', icon: Compass },
  ...(SERVICES_LIVE ? [{ href: '/services', label: 'תחומי טיפול', icon: Compass }] : []),
  { href: '/articles', label: 'מאמרים', icon: FileText },
  { href: '/contact', label: 'צרו קשר', icon: MessageCircle },
];

export default function NotFound() {
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-stone-100 to-amber-50 py-12 md:py-24"
      style={{ paddingTop: '120px' }}
    >
      <div className="container mx-auto px-4 md:px-8 max-w-2xl text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Compass className="w-8 h-8 text-amber-600" aria-hidden="true" />
        </div>

        <h1 className="text-xl md:text-3xl font-bold text-stone-800 mb-3">העמוד לא נמצא</h1>
        <p className="text-stone-500 mb-8">
          ייתכן שהכתובת שגויה או שהתוכן עבר. אלה העמודים הראשיים באתר:
        </p>

        <nav aria-label="ניווט חלופי">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-start">
            {LINKS.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 px-4 py-3 min-h-[44px] bg-white/70 hover:bg-white border border-stone-200 rounded-xl transition-colors text-stone-700"
                >
                  <Icon className="w-4 h-4 text-stone-400 flex-shrink-0" aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="mt-8 text-xs text-stone-400">
          מפת האתר המלאה:{' '}
          <a href="/sitemap.xml" className="underline hover:text-stone-600">
            sitemap.xml
          </a>
          {' · '}
          סיכום לקריאה אוטומטית:{' '}
          <a href="/llms.txt" className="underline hover:text-stone-600">
            llms.txt
          </a>
        </p>
      </div>
    </div>
  );
}
