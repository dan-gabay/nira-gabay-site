import Image from 'next/image';
import ContactForm from '@/components/ContactForm';
import ServiceAltChannels from '@/components/ServiceAltChannels';
import { FORM_BG, TEAL_DARK } from '@/lib/palette';

// The same wording the hero and the footer use. One phrase for who she is,
// not three variants across the site.
const ROLE = 'מטפלת בפסיכותרפיה ומדריכת הורים';

// The same file the home page's mobile hero uses. It is already a tight
// 495x505 headshot, so a circular crop is a near-exact fit and needs no
// repositioning - and being local it actually loads, unlike the blob-hosted
// profile.png on /clinic. Replacing that one file changes her photo in both
// places, which is the behaviour you want from a portrait.
const PORTRAIT = '/images/hero-mobile.jpg';

/**
 * The closing block on a service page: who she is, and a form.
 *
 * Built from what the numbers said. Across 34 sessions that reached a service
 * page, 65% read to 90% depth and not one clicked the page's own call to
 * action - while every enquiry that did happen came through the contact page
 * or the footer. People were persuaded enough to go looking for a way to write
 * to her, and then had to leave the page to find one. So the form comes to
 * them.
 *
 * Two other things the page never had:
 *
 * A face. You are choosing a person to tell the hardest things in your life
 * to, and the service pages showed only text. The article pages have carried
 * her photo all along; this is the page where it matters more.
 *
 * A second channel, demoted. The only ask used to be WhatsApp, which hands
 * your name and phone number to a stranger before you have spoken - a real
 * barrier for a marriage in crisis or a question about sex therapy, and the
 * likeliest reason the enquiries that did happen took the quieter route.
 * The form leads; WhatsApp and phone follow as a quiet line inside the same
 * card.
 *
 * This block replaces the old ServiceCta banner rather than sitting above it.
 * Two green blocks in a row asked the same thing twice, and the second one
 * competed with the form for the same click.
 *
 * No price. Deliberately: the owner does not publish one.
 */
export default function ServiceContact({
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
      <section className="bg-stone-50 py-10 md:py-16">
        <div className="container mx-auto px-4 md:px-8">
          {/* Matches the reading column above it rather than sitting narrower than
                everything else on the page - the card was 521px against 695px of
                content, which read as a third width rather than a deliberate one. */}
            <div className="max-w-3xl mx-auto">
            {/* The artwork is the card, not the page behind it. */}
            <div
              className="relative overflow-hidden rounded-3xl shadow-xl"
              style={{ background: TEAL_DARK }}
            >
              <Image
                src={FORM_BG}
                alt=""
                fill
                loading="lazy"
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 700px"
              />

              <div className="relative px-5 pt-6 md:px-10 md:pt-8">
                <div className="flex items-center gap-3 md:gap-4">
                  <Image
                    src={PORTRAIT}
                    alt={`נירה גבאי, ${ROLE}`}
                    width={72}
                    height={72}
                    loading="lazy"
                    className="w-14 h-14 md:w-[72px] md:h-[72px] rounded-full object-cover flex-shrink-0 border-2 border-white/70"
                  />
                  <div className="text-white">
                    <p className="text-base md:text-xl font-bold leading-snug">נירה גבאי</p>
                    <p className="text-xs md:text-sm text-white/80 leading-relaxed">{ROLE}</p>
                  </div>
                </div>

                <p className="text-sm md:text-base text-white/90 leading-relaxed mt-4 md:mt-5">
                  {discreet
                    ? 'אפשר לכתוב לי כאן בכמה מילים, בלי להיכנס לפרטים. אחזור אליכם בדיסקרטיות מלאה.'
                    : `אפשר לכתוב לי כאן בכמה מילים על מה שמביא אתכם, ואחזור אליכם. גם אם עדיין לא ברור לכם אם ${serviceLabel} הוא מה שאתם מחפשים.`}
                </p>
              </div>

              <div className="relative">
                <ContactForm
                  sourceId={`service_${serviceSlug}`}
                  title=""
                  subtitle=""
                  variant="onDark"
                />
                <ServiceAltChannels
                  serviceSlug={serviceSlug}
                  serviceLabel={serviceLabel}
                  waHref={waHref}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

  );
}
