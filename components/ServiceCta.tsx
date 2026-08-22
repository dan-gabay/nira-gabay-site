'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MessageCircle } from 'lucide-react';
import { trackCTAClick, trackWhatsAppClick, trackServiceInterest } from '@/lib/analytics';
import { ARTICLES_CTA_BG, MINT } from '@/lib/palette';

// Closing CTA for a service page. Same banner language as the article index,
// but the WhatsApp prefill names this service, so Nira sees in the chat itself
// what the person came for - attribution that survives leaving the site.
export default function ServiceCta({
  serviceSlug,
  serviceLabel,
  waHref,
  discreet,
}: {
  serviceSlug: string;
  serviceLabel: string;
  waHref: string;
  // Discreetly handled services get neutral wording: the button label and the
  // prefilled message must not announce the topic on the visitor's own phone.
  discreet?: boolean;
}) {
  const button =
    'inline-flex items-center justify-center gap-2 min-h-[40px] md:min-h-[44px] px-3.5 md:px-7 rounded-full border border-white/70 text-white text-xs md:text-base font-medium whitespace-nowrap hover:bg-white/15 transition-colors';

  const handleWhatsApp = () => {
    trackWhatsAppClick(`service_${serviceSlug}`);
    trackServiceInterest(serviceLabel);
  };

  return (
    <section className="pb-10 md:pb-12 px-4 md:px-8 bg-stone-50">
      <div className="container mx-auto">
        <div
          className="relative overflow-hidden rounded-3xl"
          style={{ background: `linear-gradient(115deg, ${MINT} 0%, #1F7A63 100%)` }}
        >
          <Image
            src={ARTICLES_CTA_BG}
            alt=""
            fill
            loading="lazy"
            className="object-cover"
            sizes="(max-width: 1280px) 100vw, 1280px"
          />

          <div className="relative px-4 py-6 md:px-12 md:py-14 flex flex-row items-center justify-between gap-3 md:gap-8">
            <div className="min-w-0 text-right">
              <h2 className="text-lg md:text-3xl font-bold text-white mb-1.5 md:mb-3">
                {discreet ? 'רוצים לדבר על זה?' : 'רוצים להתחיל?'}
              </h2>
              <p className="text-xs md:text-base text-white/90 leading-relaxed">
                {discreet ? (
                  <>
                    פנייה ראשונה היא רק שיחה,
                    <br />
                    בלי התחייבות ובדיסקרטיות מלאה
                  </>
                ) : (
                  <>
                    שיחת היכרות קצרה, בלי התחייבות,
                    <br />
                    כדי לבדוק אם זו הדרך הנכונה עבורכם
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-col gap-2.5 md:gap-3 flex-shrink-0">
              <Link
                href="/contact"
                onClick={() => trackCTAClick('contact', `service_${serviceSlug}`)}
                className={button}
              >
                <Calendar className="w-3.5 h-3.5 md:w-5 md:h-5 flex-shrink-0" aria-hidden="true" />
                קבעו פגישה
              </Link>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsApp}
                className={button}
              >
                <MessageCircle
                  className="w-3.5 h-3.5 md:w-5 md:h-5 flex-shrink-0"
                  aria-hidden="true"
                />
                שלחו הודעת WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
