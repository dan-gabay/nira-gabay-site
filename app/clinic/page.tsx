import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Car, Accessibility, Clock, MapPin, Monitor } from 'lucide-react';
import { CLINIC, ONLINE } from '@/lib/clinic';
import { SERVICES } from '@/lib/services';
import { SERVICES_LIVE, UNPUBLISHED_ROBOTS } from '@/lib/publish';
import { TEAL_DARK, MINT, ARTICLES_HERO_BG } from '@/lib/palette';
import ArticleCtaBanner from '@/components/ArticleCtaBanner';
import JsonLd from '@/components/JsonLd';

export const revalidate = 3600;

const BASE_URL = 'https://www.niragabay.com';
const URL = `${BASE_URL}/clinic`;

const META_TITLE = 'הקליניקה במושב שואבה, אזור ירושלים | נירה גבאי';
const META_DESCRIPTION =
  'הקליניקה של נירה גבאי במושב שואבה, אזור ירושלים: איך מגיעים, איך נראה המקום, ומה קורה במפגש הראשון. וגם מפגשים אונליין מכל הארץ.';

export const metadata: Metadata = {
  title: { absolute: META_TITLE },
  description: META_DESCRIPTION,
  alternates: { canonical: URL },
  ...(SERVICES_LIVE ? {} : { robots: UNPUBLISHED_ROBOTS }),
  openGraph: {
    title: META_TITLE,
    description: META_DESCRIPTION,
    url: URL,
    type: 'website',
    locale: 'he_IL',
    siteName: 'נירה גבאי',
  },
};

// Only the practical blocks Nira has actually confirmed. lib/clinic.ts holds
// the rest as null, and null renders nothing rather than a plausible guess.
const practical = [
  { icon: Car, label: 'חניה', value: CLINIC.parking },
  { icon: Accessibility, label: 'נגישות', value: CLINIC.accessibility },
  { icon: Clock, label: 'שעות פעילות', value: CLINIC.hours },
  { icon: MapPin, label: 'בהגעה', value: CLINIC.arrivalNote },
].filter((p): p is typeof p & { value: string } => Boolean(p.value));

export default function ClinicPage() {
  const placeSchema = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'הקליניקה של נירה גבאי',
    description: META_DESCRIPTION,
    url: URL,
    telephone: CLINIC.phone,
    image: CLINIC.photo,
    inLanguage: 'he-IL',
    address: {
      '@type': 'PostalAddress',
      ...(CLINIC.streetAddress ? { streetAddress: CLINIC.streetAddress } : {}),
      addressLocality: 'שואבה',
      addressRegion: 'ירושלים',
      addressCountry: CLINIC.addressCountry,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: CLINIC.geo.latitude,
      longitude: CLINIC.geo.longitude,
    },
    areaServed: [
      { '@type': 'City', name: 'ירושלים' },
      { '@type': 'City', name: 'מבשרת ציון' },
      { '@type': 'City', name: 'בית שמש' },
      { '@type': 'City', name: 'מודיעין' },
    ],
    availableLanguage: { '@type': 'Language', name: 'Hebrew' },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'דף הבית', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'הקליניקה', item: URL },
    ],
  };

  return (
    <div style={{ paddingTop: '80px' }}>
      <JsonLd data={placeSchema} />
      <JsonLd data={breadcrumbSchema} />

      {/* ───────── Hero ───────── */}
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
        <div className="relative container mx-auto px-4 md:px-8 pt-5 pb-12 md:pt-12 md:pb-20">
          <nav
            aria-label="ניווט"
            className="text-[11px] md:text-sm text-white/60 mb-4 md:mb-6 text-center"
          >
            <Link href="/" className="hover:text-white transition-colors">
              דף הבית
            </Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <span className="text-white/90">הקליניקה</span>
          </nav>

          <div className="text-center max-w-2xl mx-auto">
            <span
              className="block w-10 md:w-12 h-px mx-auto mb-4 md:mb-6"
              style={{ background: 'rgba(255,255,255,0.35)' }}
            />
            <h1
              className="text-2xl md:text-5xl font-bold mb-2 md:mb-4 leading-tight"
              style={{ color: MINT }}
            >
              הקליניקה
            </h1>
            <p className="text-sm md:text-lg text-white/80 leading-relaxed">
              {CLINIC.locality}, {CLINIC.region}
            </p>
          </div>
        </div>
      </section>

      {/* ───────── The room ───────── */}
      <section className="py-8 md:py-14 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="relative w-full h-52 md:h-80 rounded-3xl overflow-hidden mb-5 md:mb-8">
              <Image
                src={CLINIC.photo}
                alt={`חדר הטיפולים בקליניקה של נירה גבאי ב${CLINIC.locality}`}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 800px"
              />
            </div>
            <p className="text-[15px] md:text-lg text-stone-700 leading-relaxed">
              {CLINIC.atmosphere}
            </p>
          </div>
        </div>
      </section>

      {/* ───────── Practical details (only what is confirmed) ───────── */}
      {practical.length > 0 && (
        <section className="pb-8 md:pb-12 bg-white">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-lg md:text-2xl font-bold text-stone-800 mb-4 md:mb-5">
                פרטים מעשיים
              </h2>
              <ul className="grid gap-2.5 md:gap-3 sm:grid-cols-2">
                {practical.map((p) => (
                  <li
                    key={p.label}
                    className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4"
                  >
                    <p.icon
                      className="w-5 h-5 mt-0.5 flex-shrink-0"
                      style={{ color: TEAL_DARK }}
                      aria-hidden="true"
                    />
                    <span>
                      <span className="block font-semibold text-stone-800 text-[14.5px] md:text-base">
                        {p.label}
                      </span>
                      <span className="block text-[13.5px] md:text-[0.9375rem] text-stone-600 leading-relaxed mt-0.5">
                        {p.value}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* ───────── How to get here ───────── */}
      {CLINIC.routes.length > 0 && (
        <section className="pb-8 md:pb-12 bg-white">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-lg md:text-2xl font-bold text-stone-800 mb-4 md:mb-5">
                איך מגיעים
              </h2>
              <div className="space-y-3">
                {CLINIC.routes.map((r) => (
                  <div
                    key={r.from}
                    className="rounded-2xl border border-stone-200 p-4 md:p-5"
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-1.5">
                      <h3 className="font-bold text-stone-800 text-[15px] md:text-lg">
                        מ{r.from}
                      </h3>
                      <span className="text-xs md:text-sm text-stone-500 flex-shrink-0">
                        {r.duration}
                      </span>
                    </div>
                    <p className="text-[14px] md:text-[0.96875rem] text-stone-600 leading-relaxed">
                      {r.directions}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ───────── Online ───────── */}
      <section className="pb-8 md:pb-12 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div
            className="max-w-3xl mx-auto rounded-3xl p-5 md:p-8"
            style={{ background: '#F4FAF7', border: '1px solid #D6EDE3' }}
          >
            <h2 className="text-lg md:text-2xl font-bold text-stone-800 mb-3 md:mb-4 flex items-center gap-2.5">
              <Monitor className="w-5 h-5 md:w-6 md:h-6" style={{ color: TEAL_DARK }} aria-hidden="true" />
              {ONLINE.heading}
            </h2>
            <div className="space-y-3 md:space-y-4">
              {ONLINE.body.map((p, i) => (
                <p key={i} className="text-[14.5px] md:text-[1rem] text-stone-600 leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── What happens here ───────── */}
      <section className="pb-8 md:pb-12 bg-gradient-to-b from-white to-stone-50">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-lg md:text-2xl font-bold text-stone-800 mb-4 md:mb-5">
              מה קורה כאן
            </h2>
            <div className="flex flex-wrap gap-2">
              {SERVICES.map((s) => (
                <Link
                  key={s.slug}
                  href={`/services/${s.slug}`}
                  className="inline-flex items-center min-h-[40px] px-4 rounded-full bg-white border border-emerald-200 text-emerald-900 text-[13px] md:text-sm font-medium hover:bg-emerald-50 transition-colors"
                >
                  {s.navLabel}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <ArticleCtaBanner source="clinic" />
    </div>
  );
}
