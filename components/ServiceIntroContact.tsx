import Image from 'next/image';
import ServiceIntroActions from '@/components/ServiceIntroActions';
import { PORTRAIT, ROLE } from '@/components/ServiceContact';

/**
 * A quiet way to get in touch, straight after the intro of a service page.
 *
 * The full contact block (photo, form, WhatsApp, phone) closes the page, and
 * that is where most visitors never arrive. Paid traffic, 94-100% mobile,
 * showed it plainly: on /services/adult-therapy only 17% of paid sessions
 * scrolled to 90% depth and a third left before 25%, and every paid enquiry
 * from the page came through the floating button, the footer or that form
 * (GA4 + site_events, 11 Sep-10 Oct 2026; see the growth backlog, B-20).
 *
 * So the first screens now say who is writing and offer the same two routes,
 * without a second form: one button jumps to the closing block, the other
 * opens WhatsApp, and a quiet line under them gives the phone number. The wording repeats the closing block's own line rather
 * than adding new copy. No price - the owner does not publish one.
 */
export default function ServiceIntroContact({
  serviceSlug,
  serviceLabel,
  waHref,
  discreet,
}: {
  serviceSlug: string;
  serviceLabel: string;
  waHref: string;
  discreet?: boolean;
}) {
  return (
    <section className="pt-6 md:pt-8 bg-white">
      <div className="container mx-auto px-4 md:px-8">
        <div
          className="max-w-3xl mx-auto rounded-3xl p-4 md:p-6"
          style={{ background: '#F4FAF7', border: '1px solid #D6EDE3' }}
        >
          <div className="flex items-center gap-3 md:gap-4">
            <Image
              src={PORTRAIT}
              alt={`נירה גבאי, ${ROLE}`}
              width={56}
              height={56}
              className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover flex-shrink-0"
            />
            <div>
              <p className="text-[15px] md:text-lg font-bold text-stone-800 leading-snug">
                נירה גבאי
              </p>
              <p className="text-xs md:text-sm text-stone-600 leading-relaxed">{ROLE}</p>
            </div>
          </div>
          <p className="text-[14.5px] md:text-[1rem] text-stone-600 leading-relaxed mt-3 md:mt-4">
            {discreet
              ? 'אפשר לכתוב לי בכמה מילים, בלי להיכנס לפרטים. אחזור אליכם בדיסקרטיות מלאה.'
              : 'אפשר לכתוב לי בכמה מילים על מה שמביא אתכם, ואחזור אליכם.'}
          </p>
          <ServiceIntroActions
            serviceSlug={serviceSlug}
            serviceLabel={serviceLabel}
            waHref={waHref}
          />
        </div>
      </div>
    </section>
  );
}
