import Image from 'next/image';
import ContactForm from '@/components/ContactForm';
import ServiceAltChannels from '@/components/ServiceAltChannels';
import { FORM_BG, TEAL_DARK } from '@/lib/palette';

// The same wording the hero and the footer use. One phrase for who she is,
// not three variants across the site.
export const ROLE = 'מטפלת בפסיכותרפיה ומדריכת הורים';

// The same file the home page's mobile hero uses. It is already a tight
// 495x505 headshot, so a circular crop is a near-exact fit and needs no
// repositioning - and being local it actually loads, unlike the blob-hosted
// profile.png on /clinic. Replacing that one file changes her photo in both
// places, which is the behaviour you want from a portrait.
export const PORTRAIT = '/images/hero-mobile.jpg';

/**
 * The closing block on a service page: the form, with WhatsApp and phone.
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
 * to, and the service pages showed only text. Her photo, name and role now
 * sit near the top of the page (ServiceIntroContact), where most visitors
 * still are, and are not repeated here.
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
}: {
  serviceSlug: string;
  serviceLabel: string;
  waHref: string;
}) {
  // Every other content section on this page is plain white; stone-50 made
  // this one read as a different band rather than the page's last block. The
  // card carries the colour, the section does not.
  return (
    <section id="service-contact" className="bg-white py-10 md:py-16 scroll-mt-24">
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

              {/* No portrait, name or "write to me" line here: they open the
                  page instead, in ServiceIntroContact right after the intro,
                  where most visitors still are. Repeating them here read as a
                  duplicate. */}
              <div className="relative pt-5 md:pt-6">
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
