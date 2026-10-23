'use client';

import { MessageCircle, PenLine, Phone } from 'lucide-react';
import { trackCTAClick, trackWhatsAppClick, trackServiceInterest, trackContactMethodClick } from '@/lib/analytics';
import { CLINIC } from '@/lib/clinic';

/**
 * The two buttons in ServiceIntroContact. A client component only so the
 * clicks report: the WhatsApp tap is a conversion like every other WhatsApp
 * button, and the jump to the form is a cta_click, so the closing form's
 * submits can be told apart from people who were sent there from the top.
 *
 * Under them, a quieter line with the phone number. The phone is the second
 * proven client channel, yet on mobile the first tel: link used to sit
 * 3,500-4,900px down the page, and every phone tap in 45 days came from
 * there. It is a text line, not a third pill, so the two buttons keep their
 * width on a 390px screen. Its own location (service_intro_<slug>) keeps it
 * measurable apart from the closing block's phone link.
 */
export default function ServiceIntroActions({
  serviceSlug,
  serviceLabel,
  waHref,
}: {
  serviceSlug: string;
  serviceLabel: string;
  waHref: string;
}) {
  const base =
    'flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-full ' +
    'text-sm md:text-base font-medium transition-colors';

  return (
    <>
      <div className="flex gap-2.5 md:gap-3 mt-3 md:mt-4">
        <a
          href="#service-contact"
          onClick={() => trackCTAClick('service_intro_form', `service_${serviceSlug}`)}
          className={`${base} bg-emerald-700 text-white hover:bg-emerald-800`}
        >
          <PenLine className="w-4 h-4 md:w-[18px] md:h-[18px]" aria-hidden="true" />
          לכתוב לי
        </a>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            trackWhatsAppClick(`service_intro_${serviceSlug}`);
            trackServiceInterest(serviceLabel);
          }}
          className={`${base} border border-emerald-700/40 text-emerald-800 hover:bg-emerald-50`}
        >
          <MessageCircle className="w-4 h-4 md:w-[18px] md:h-[18px]" aria-hidden="true" />
          WhatsApp
        </a>
      </div>
      <a
        href={CLINIC.phoneHref}
        onClick={() => trackContactMethodClick('phone', `service_intro_${serviceSlug}`)}
        className="mt-1.5 flex items-center justify-center gap-2 min-h-[44px] text-sm md:text-base text-stone-600 hover:text-emerald-800 transition-colors"
      >
        <Phone className="w-4 h-4" aria-hidden="true" />
        <span>
          או להתקשר: <span dir="ltr" className="font-medium text-emerald-800 underline underline-offset-4">{CLINIC.phoneDisplay}</span>
        </span>
      </a>
    </>
  );
}
