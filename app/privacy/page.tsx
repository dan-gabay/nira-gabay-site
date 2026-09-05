import type { Metadata } from 'next';
import Link from 'next/link';
import { PRIVACY_INTRO, PRIVACY_SECTIONS, PRIVACY_UPDATED } from '@/lib/privacy';

// The content is in lib/privacy.ts rather than in this file, because the
// Markdown representation of this page (Accept: text/markdown) renders from the
// same constant. A privacy policy that says two different things depending on
// how it was requested is worse than not having one.

export const metadata: Metadata = {
  title: { absolute: 'מדיניות פרטיות - נירה גבאי' },
  description:
    'איזה מידע נאסף באתר של נירה גבאי, למה הוא משמש, מה לא נאסף, ואיך אפשר לבקש לעיין בו או למחוק אותו.',
  alternates: { canonical: 'https://www.niragabay.com/privacy' },
  openGraph: {
    title: 'מדיניות פרטיות - נירה גבאי',
    description: 'איזה מידע נאסף באתר, למה הוא משמש ומה לא נאסף.',
    url: 'https://www.niragabay.com/privacy',
    type: 'website',
  },
};

export default function PrivacyPage() {
  return (
    <div style={{ paddingTop: '80px' }}>
      <section className="py-12 md:py-20 bg-gradient-to-br from-stone-100 to-amber-50">
        <div className="container mx-auto px-4 md:px-8 max-w-3xl">
          <h1 className="text-2xl md:text-4xl font-bold text-stone-800 mb-3">מדיניות פרטיות</h1>
          <p className="text-xs md:text-sm text-stone-500">
            עודכן:{' '}
            <time dateTime={PRIVACY_UPDATED}>
              {new Date(PRIVACY_UPDATED).toLocaleDateString('he-IL')}
            </time>
          </p>
        </div>
      </section>

      <section className="py-10 md:py-16 bg-white">
        <div className="container mx-auto px-4 md:px-8 max-w-3xl">
          <div className="space-y-4 md:space-y-6 text-sm md:text-lg text-stone-600 leading-relaxed">
            {PRIVACY_INTRO.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>

          {PRIVACY_SECTIONS.map((section) => (
            <div key={section.heading} className="mt-8 md:mt-12">
              <h2 className="text-lg md:text-2xl font-bold text-stone-800 mb-3 md:mb-4">
                {section.heading}
              </h2>

              {section.body && (
                <div className="space-y-3 md:space-y-4 text-sm md:text-lg text-stone-600 leading-relaxed">
                  {section.body.map((p) => (
                    <p key={p.slice(0, 24)}>{p}</p>
                  ))}
                </div>
              )}

              {section.bullets && (
                <ul className="mt-3 md:mt-4 space-y-2 text-sm md:text-lg text-stone-600 leading-relaxed">
                  {section.bullets.map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <span aria-hidden="true" className="text-amber-500 flex-shrink-0">
                        •
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <p className="mt-10 md:mt-14 text-sm md:text-base text-stone-500">
            שאלה על משהו שכתוב כאן?{' '}
            <Link href="/contact" className="text-amber-700 underline hover:text-amber-800">
              אפשר לפנות אליי
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
