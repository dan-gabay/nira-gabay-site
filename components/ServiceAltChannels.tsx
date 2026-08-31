'use client';

import { MessageCircle, Phone } from 'lucide-react';
import { trackWhatsAppClick, trackServiceInterest, trackContactMethodClick } from '@/lib/analytics';
import { CLINIC } from '@/lib/clinic';

/**
 * WhatsApp and phone, underneath the form on a service page.
 *
 * These used to be a full banner of their own directly below the form, which
 * meant two green blocks in a row asking the same thing twice. One closing
 * block reads better, so they become a quiet second line inside it - still
 * there for whoever will not type into a form, no longer competing with it.
 *
 * A client component only so the clicks keep reporting. Both of these are
 * conversions: trackWhatsAppClick and trackContactMethodClick each report to
 * the ad platforms and to our own store, and losing them when the banner went
 * would have quietly stopped counting the outcome the whole budget is judged
 * on.
 */
export default function ServiceAltChannels({
  serviceSlug,
  serviceLabel,
  waHref,
}: {
  serviceSlug: string;
  serviceLabel: string;
  waHref: string;
}) {
  const link =
    'inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-full ' +
    'border border-white/40 text-white text-sm md:text-base hover:bg-white/15 transition-colors';

  return (
    <div className="px-5 pb-6 md:px-10 md:pb-8">
      <p className="text-xs md:text-sm text-white/70 mb-3">או, אם נוח לכם יותר:</p>
      <div className="flex flex-wrap gap-2.5 md:gap-3">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            trackWhatsAppClick(`service_${serviceSlug}`);
            trackServiceInterest(serviceLabel);
          }}
          className={link}
        >
          <MessageCircle className="w-4 h-4 md:w-[18px] md:h-[18px]" aria-hidden="true" />
          WhatsApp
        </a>
        <a
          href={`tel:${CLINIC.phone}`}
          onClick={() => trackContactMethodClick('phone', `service_${serviceSlug}`)}
          className={link}
          dir="ltr"
        >
          <Phone className="w-4 h-4 md:w-[18px] md:h-[18px]" aria-hidden="true" />
          {CLINIC.phoneDisplay}
        </a>
      </div>
    </div>
  );
}
