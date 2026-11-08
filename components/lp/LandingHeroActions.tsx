'use client';

import { MessageCircle, PenLine, Phone } from 'lucide-react';
import { trackCTAClick, trackContactMethodClick, trackWhatsAppClick } from '@/lib/analytics';
import { CLINIC } from '@/lib/clinic';
import { LP_FORM_ANCHOR } from '@/lib/landing/adultTherapy';

/**
 * Three ways to reach Nira on the first screen of a phone: jump to the form,
 * WhatsApp, or call. On a phone the form starts below the fold (after the
 * opening paragraphs), and every competing page built for ads puts a way to
 * get in touch on the first screen. Hidden from lg up, where the form sits
 * beside the text.
 *
 * Labels reuse approved copy (the form's submit text) or are channel names.
 */
export default function LandingHeroActions({
  waHref,
  location,
  source = 'lp_adult_hero',
}: {
  waHref: string;
  location: string;
  /** Label for the WhatsApp / phone click events. */
  source?: string;
}) {
  const base =
    'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-full text-sm font-medium transition-colors whitespace-nowrap';
  return (
    <div className="lg:hidden mt-5 grid grid-cols-2 gap-2.5">
      <a
        href={`#${LP_FORM_ANCHOR}`}
        onClick={() => trackCTAClick('lp_hero_to_form', location)}
        className={`${base} col-span-2 min-h-[48px] text-base bg-white text-stone-900 hover:bg-stone-100`}
      >
        <PenLine className="w-4 h-4" aria-hidden="true" />
        השאירו פרטים ואחזור אליכם
      </a>
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackWhatsAppClick(source)}
        className={`${base} border border-white/50 text-white hover:bg-white/15`}
      >
        <MessageCircle className="w-4 h-4" aria-hidden="true" />
        WhatsApp
      </a>
      <a
        href={CLINIC.phoneHref}
        onClick={() => trackContactMethodClick('phone', source)}
        aria-label={`התקשרו ${CLINIC.phoneDisplay}`}
        className={`${base} border border-white/50 text-white hover:bg-white/15`}
      >
        <Phone className="w-4 h-4" aria-hidden="true" />
        <span dir="ltr">{CLINIC.phoneDisplay}</span>
      </a>
    </div>
  );
}
