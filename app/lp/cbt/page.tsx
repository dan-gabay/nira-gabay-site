import type { Metadata } from 'next';
import Image from 'next/image';
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Check,
  GraduationCap,
  MapPin,
  MessageCircle,
  PenLine,
  Video,
} from 'lucide-react';
import { whatsappHref } from '@/lib/whatsapp';
import { SERVICES } from '@/lib/services';
import { ARTICLES_HERO_BG, FORM_BG, MINT, TEAL_DARK } from '@/lib/palette';
import { PORTRAIT, ROLE } from '@/components/ServiceContact';
import WhatsAppLink from '@/components/WhatsAppLink';
import Reveal from '@/components/Reveal';
import LandingHeader from '@/components/lp/LandingHeader';
import LandingFooter from '@/components/lp/LandingFooter';
import LandingContactForm from '@/components/lp/LandingContactForm';
import CertificatesViewer from '@/components/lp/CertificatesViewer';
import { FormAnchorLink, LandingInternalLink } from '@/components/lp/LandingLinks';
import LandingHeroActions from '@/components/lp/LandingHeroActions';
import {
  LP_ABOUT,
  LP_CLOSING,
  LP_FORM_ANCHOR,
  LP_WHERE,
} from '@/lib/landing/adultTherapy';
import {
  LP_CBT_CERTIFICATES_MORE,
  LP_CBT_CERTIFICATES_PRIMARY,
  LP_CBT_FAQ,
  LP_CBT_FORM_SOURCE,
  LP_CBT_HERO,
  LP_CBT_HOW,
  LP_CBT_META,
  LP_CBT_TRAININGS,
  LP_CBT_TRUST_LABELS,
  LP_CBT_WHEN,
} from '@/lib/landing/cbt';

/**
 * /lp/cbt - landing page for the planned CBT ad group.
 *
 * About 60% of clicks in the "טיפול רגשי" ad group are CBT searches ("cbt",
 * "טיפול cbt") that currently land on the adult-therapy page, which does not
 * show CBT on its first screen. This page answers that search: CBT in the H1,
 * the CBT training first, then how CBT works. Same structure, components,
 * form, measurement and noindex setup as /lp/adult-therapy.
 *
 * The organic CBT page, /services/cbt, is not changed. Copy is a DRAFT
 * (lib/landing/cbt.ts) until Nira or Dan approves it. Experimental, so:
 * noindex, not in any sitemap, no links to it from the site.
 */

// Fully static: no data fetching, nothing per-request.
export const dynamic = 'force-static';

const LOCATION = 'lp_cbt';

export const metadata: Metadata = {
  title: { absolute: LP_CBT_META.title },
  description: LP_CBT_META.description,
  // Replaces the root layout's robots object entirely (metadata merges are
  // shallow per key), googleBot included.
  robots: { index: false, follow: true },
  openGraph: {
    title: LP_CBT_META.title,
    description: LP_CBT_META.description,
    type: 'website',
    locale: 'he_IL',
    siteName: 'נירה גבאי',
  },
};

// Same prefill as /services/cbt.
const WA_HREF = whatsappHref(
  SERVICES.find((s) => s.slug === 'cbt')?.whatsappMessage,
);

// CBT first on this page.
const TRAINING_ICONS = [Brain, BookOpen, GraduationCap];

const H2 = 'text-xl md:text-3xl font-bold text-stone-800 leading-snug';
const BODY = 'text-[15.5px] md:text-[1.0625rem] text-stone-600 leading-relaxed';

export default function CbtLandingPage() {
  return (
    <>
      <LandingHeader source={LOCATION} />

      <main id="main-content">
        {/* ───────── 1. Hero + early form ───────── */}
        <section className="relative overflow-hidden" style={{ background: TEAL_DARK }}>
          <Image
            src={ARTICLES_HERO_BG}
            alt=""
            fill
            priority
            className="object-cover"
            style={{ objectPosition: 'left center' }}
            sizes="100vw"
          />
          <div className="relative container mx-auto px-4 md:px-8 pt-5 pb-8 md:pt-14 md:pb-16">
            <div className="grid gap-7 lg:gap-12 lg:grid-cols-[1.1fr_1fr] items-center max-w-6xl mx-auto">
              <div className="text-white">
                <span
                  className="block w-10 md:w-12 h-px mb-4 md:mb-6"
                  style={{ background: 'rgba(255,255,255,0.35)' }}
                />
                <h1
                  className="text-[1.65rem] md:text-5xl font-bold leading-tight mb-2 md:mb-4"
                  style={{ color: MINT }}
                >
                  {LP_CBT_HERO.h1}
                </h1>
                <p className="text-base md:text-2xl text-white/90 font-medium leading-snug mb-0 lg:mb-6">
                  {LP_CBT_HERO.subtitle}
                </p>

                {/* Phone: H1, buttons, the two paragraphs (who Nira is), then the
                    form. The photo + trainings strip is desktop only; on a phone
                    section 2 covers it right after the form. */}
                <LandingHeroActions waHref={WA_HREF} location={LOCATION} source="lp_cbt_hero" />
                <div className="h-5 lg:hidden" aria-hidden="true" />
                <div className="space-y-3 md:space-y-4 max-w-xl">
                  {LP_CBT_HERO.paragraphs.map((p) => (
                    <p key={p} className="text-[15.5px] md:text-lg text-white/85 leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>
                <p className="mt-4 md:mt-6 inline-flex items-start gap-2 text-[14.5px] md:text-base text-white/90">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5 mt-0.5 flex-shrink-0" style={{ color: MINT }} aria-hidden="true" />
                  {LP_CBT_HERO.practical}
                </p>

                <div className="hidden lg:flex mt-7 items-center gap-3">
                  <Image
                    src={PORTRAIT}
                    alt=""
                    width={56}
                    height={56}
                    className="w-14 h-14 rounded-full object-cover flex-shrink-0 ring-2 ring-white/30"
                  />
                  <ul className="flex flex-wrap gap-2" aria-label="הכשרות">
                    {LP_CBT_TRUST_LABELS.map((t) => (
                      <li
                        key={t}
                        className="px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-sm text-white/90 leading-tight"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div
                id={LP_FORM_ANCHOR}
                className="scroll-mt-20 md:scroll-mt-24 bg-white rounded-3xl shadow-xl p-5 md:p-8"
              >
                <LandingContactForm sourceId={LP_CBT_FORM_SOURCE} waHref={WA_HREF} waSource="lp_cbt_hero_form" />
              </div>
            </div>
          </div>
        </section>

        {/* ───────── 2. Meet Nira ───────── */}
        <section className="bg-white py-10 md:py-16" aria-labelledby="lp-about">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-5xl mx-auto grid gap-7 md:gap-12 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start">
              <Reveal className="max-w-[260px] md:max-w-none mx-auto w-full">
                <div className="relative">
                  <div className="absolute -top-2.5 -right-2.5 md:-top-3 md:-right-3 w-full h-full rounded-3xl bg-emerald-100" aria-hidden="true" />
                  <Image
                    src={PORTRAIT}
                    alt={`נירה גבאי, ${ROLE}`}
                    width={495}
                    height={505}
                    loading="lazy"
                    sizes="(max-width: 768px) 260px, 380px"
                    className="relative w-full h-auto rounded-3xl object-cover shadow-lg"
                  />
                </div>
              </Reveal>

              <div>
                <h2 id="lp-about" className={`${H2} mb-4 md:mb-5`}>
                  {LP_ABOUT.h2}
                </h2>
                <div className="space-y-3 md:space-y-4">
                  {LP_ABOUT.paragraphs.map((p) => (
                    <p key={p} className={BODY}>
                      {p}
                    </p>
                  ))}
                </div>

                <h3 className="text-base md:text-xl font-bold text-stone-800 mt-7 md:mt-9 mb-3 md:mb-4">
                  {LP_ABOUT.trainingHeading}
                </h3>
                <ul className="space-y-2.5 md:space-y-3">
                  {LP_CBT_TRAININGS.map((t, i) => {
                    const Icon = TRAINING_ICONS[i];
                    return (
                      <li
                        key={t.title}
                        className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5 md:p-4"
                      >
                        <span className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white border border-emerald-100 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-[18px] h-[18px] md:w-5 md:h-5 text-emerald-700" aria-hidden="true" />
                        </span>
                        <span>
                          <span className="block font-bold text-stone-800 text-[15px] md:text-base leading-snug">
                            {t.title}
                          </span>
                          <span className="block text-[13.5px] md:text-[0.9375rem] text-stone-600 leading-relaxed mt-0.5">
                            {t.body}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-5 md:mt-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                  <CertificatesViewer primary={LP_CBT_CERTIFICATES_PRIMARY} more={LP_CBT_CERTIFICATES_MORE} />
                  <LandingInternalLink
                    href="/about"
                    destination="about"
                    className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-2 text-emerald-800 font-medium underline underline-offset-4 hover:text-emerald-900"
                  >
                    {LP_ABOUT.aboutLink}
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  </LandingInternalLink>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───────── 3. When CBT can fit ───────── */}
        <section className="py-10 md:py-16" style={{ background: '#F4FAF7' }} aria-labelledby="lp-when">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-4xl mx-auto">
              <h2 id="lp-when" className={`${H2} mb-3 md:mb-4`}>
                {LP_CBT_WHEN.h2}
              </h2>
              <p className={`${BODY} mb-5 md:mb-7 max-w-3xl`}>{LP_CBT_WHEN.intro}</p>
              <ul className="grid gap-2.5 md:gap-3.5 sm:grid-cols-2">
                {LP_CBT_WHEN.items.map((it) => (
                  <li
                    key={it}
                    className="flex items-start gap-2.5 rounded-2xl border border-emerald-100 bg-white p-3.5 md:p-4"
                  >
                    <Check className="w-4 h-4 md:w-[18px] md:h-[18px] mt-1 flex-shrink-0" style={{ color: MINT }} aria-hidden="true" />
                    <span className="text-[14.5px] md:text-[0.9375rem] text-stone-700 leading-relaxed">{it}</span>
                  </li>
                ))}
              </ul>
              <p className={`${BODY} mt-5 md:mt-7`}>{LP_CBT_WHEN.closing}</p>
            </div>
          </div>
        </section>

        {/* ───────── 4. How CBT works ───────── */}
        <section className="bg-white py-10 md:py-16" aria-labelledby="lp-how">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 id="lp-how" className={`${H2} mb-4 md:mb-5`}>
                {LP_CBT_HOW.h2}
              </h2>
              <div className="space-y-3 md:space-y-4">
                {LP_CBT_HOW.paragraphs.map((p) => (
                  <p key={p} className={BODY}>
                    {p}
                  </p>
                ))}
              </div>
              <p className={`${BODY} mt-3 md:mt-4 font-medium text-stone-700`}>{LP_CBT_HOW.integrative}</p>

              <div className="mt-6 md:mt-8 rounded-2xl border border-stone-200 bg-white p-4 md:p-5">
                <h3 className="text-base md:text-lg font-bold text-stone-800 mb-1.5">{LP_CBT_HOW.dbtH3}</h3>
                <p className="text-[14.5px] md:text-[0.9375rem] text-stone-600 leading-relaxed">{LP_CBT_HOW.dbt}</p>
              </div>

              <div
                className="mt-7 md:mt-9 rounded-3xl p-5 md:p-8"
                style={{ background: '#F4FAF7', border: '1px solid #D6EDE3' }}
              >
                <h3 className="text-lg md:text-2xl font-bold text-stone-800 mb-3 md:mb-4">
                  {LP_CBT_HOW.firstSessionH3}
                </h3>
                <div className="space-y-3 md:space-y-4">
                  {LP_CBT_HOW.firstSession.map((p) => (
                    <p key={p} className="text-[15px] md:text-[1rem] text-stone-600 leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>
                <FormAnchorLink
                  cta="lp_how_to_form"
                  location={LOCATION}
                  className="mt-5 md:mt-6 inline-flex items-center justify-center gap-2 min-h-[48px] w-full sm:w-auto px-6 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-base font-medium transition-colors"
                >
                  <PenLine className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
                  {LP_CBT_HOW.cta}
                </FormAnchorLink>
              </div>
            </div>
          </div>
        </section>

        {/* ───────── 5. Where we meet ───────── */}
        <section className="pb-10 md:pb-16 bg-white" aria-labelledby="lp-where">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 id="lp-where" className={`${H2} mb-4 md:mb-6`}>
                {LP_WHERE.h2}
              </h2>
              <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
                {[
                  { Icon: MapPin, h3: LP_WHERE.clinicH3, body: LP_WHERE.clinic },
                  { Icon: Video, h3: LP_WHERE.zoomH3, body: LP_WHERE.zoom },
                ].map(({ Icon, h3, body }) => (
                  <div key={h3} className="rounded-2xl border border-stone-200 bg-white p-4 md:p-5">
                    <span className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                    </span>
                    <h3 className="text-base md:text-lg font-bold text-stone-800 mb-1.5">{h3}</h3>
                    <p className="text-[14.5px] md:text-[0.9375rem] text-stone-600 leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
              <p className="text-[14.5px] md:text-[0.9375rem] text-stone-500 leading-relaxed mt-4 md:mt-5">
                {LP_WHERE.note}
              </p>
            </div>
          </div>
        </section>

        {/* ───────── 6. FAQ ───────── */}
        <section className="pb-10 md:pb-16 bg-white" aria-labelledby="lp-faq">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 id="lp-faq" className={`${H2} mb-4 md:mb-6`}>
                {LP_CBT_FAQ.h2}
              </h2>
              <div className="space-y-2.5 md:space-y-3">
                {LP_CBT_FAQ.items.map((f) => (
                  <details
                    key={f.q}
                    className="group rounded-2xl border border-stone-200 bg-white p-4 md:p-5 open:border-emerald-200"
                  >
                    <summary className="cursor-pointer list-none font-semibold text-stone-800 text-[15px] md:text-[1.0625rem] flex items-start justify-between gap-3 min-h-[28px]">
                      <span>{f.q}</span>
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex-shrink-0 text-stone-400 text-lg leading-none transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="mt-2.5 text-[14.5px] md:text-[1rem] text-stone-600 leading-relaxed">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ───────── 7. Closing + contact ───────── */}
        <section className="bg-white pb-12 md:pb-20" aria-labelledby="lp-closing">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-3xl mx-auto relative overflow-hidden rounded-3xl shadow-xl" style={{ background: TEAL_DARK }}>
              <Image src={FORM_BG} alt="" fill loading="lazy" className="object-cover" sizes="(max-width: 768px) 100vw, 768px" />
              <div className="relative px-5 py-8 md:px-12 md:py-12 text-center">
                <h2 id="lp-closing" className="text-2xl md:text-4xl font-bold mb-3 md:mb-4" style={{ color: MINT }}>
                  {LP_CLOSING.h2}
                </h2>
                <p className="text-[15.5px] md:text-lg text-white/85 leading-relaxed max-w-xl mx-auto">
                  {LP_CLOSING.body}
                </p>
                <div className="mt-6 md:mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <FormAnchorLink
                    cta="lp_closing_to_form"
                    location={LOCATION}
                    className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-full bg-white text-stone-900 hover:bg-stone-100 text-base font-medium transition-colors"
                  >
                    <PenLine className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
                    {LP_CLOSING.primary}
                  </FormAnchorLink>
                  <WhatsAppLink
                    href={WA_HREF}
                    source="lp_cbt_closing"
                    className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-full border border-white/50 text-white hover:bg-white/15 text-base font-medium transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
                    {LP_CLOSING.whatsapp}
                  </WhatsAppLink>
                </div>
                <div className="mt-7 md:mt-9 pt-5 border-t border-white/20 text-sm md:text-base text-white/75 leading-relaxed">
                  <p className="font-medium text-white/90">{LP_CLOSING.signatureName}</p>
                  <p>{LP_CLOSING.signaturePlace}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter source={LOCATION} />
    </>
  );
}
