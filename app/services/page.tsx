import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Users, User, Heart, Baby, HeartHandshake, Brain } from 'lucide-react';
import { SERVICES } from '@/lib/services';
import { TEAL_DARK, MINT, ARTICLES_HERO_BG } from '@/lib/palette';
import ArticleCtaBanner from '@/components/ArticleCtaBanner';
import JsonLd from '@/components/JsonLd';

export const revalidate = 3600;

const BASE_URL = 'https://www.niragabay.com';
const URL = `${BASE_URL}/services`;

const META_TITLE = 'תחומי טיפול | נירה גבאי - פסיכותרפיה והדרכת הורים';
const META_DESCRIPTION =
  'טיפול זוגי, הדרכת הורים, CBT, טיפול במתבגרים ובמבוגרים וטיפול מיני. נירה גבאי, מטפלת בפסיכותרפיה. קליניקה במושב שואבה, 20 דקות מירושלים, וגם מפגשים אונליין.';

const ICONS = { Users, User, Heart, Baby, HeartHandshake, Brain } as const;

export const metadata: Metadata = {
  title: { absolute: META_TITLE },
  description: META_DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: {
    title: META_TITLE,
    description: META_DESCRIPTION,
    url: URL,
    type: 'website',
    locale: 'he_IL',
    siteName: 'נירה גבאי',
  },
};

export default function ServicesIndexPage() {
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'תחומי טיפול',
    description: META_DESCRIPTION,
    url: URL,
    inLanguage: 'he-IL',
    isPartOf: { '@type': 'WebSite', name: 'נירה גבאי', url: BASE_URL },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: SERVICES.map((s, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${BASE_URL}/services/${s.slug}`,
        name: s.title,
      })),
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'דף הבית', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'תחומי טיפול', item: URL },
    ],
  };

  return (
    <div style={{ paddingTop: '80px' }}>
      <JsonLd data={collectionSchema} />
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
            <span className="text-white/90">תחומי טיפול</span>
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
              תחומי טיפול
            </h1>
            <p className="text-sm md:text-lg text-white/80 leading-relaxed">
              קליניקה במושב שואבה, עשרים דקות מירושלים, וגם מפגשים אונליין מכל הארץ
            </p>
          </div>
        </div>
      </section>

      {/* ───────── Cards ───────── */}
      <section className="py-8 md:py-14 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-4xl mx-auto grid gap-3 md:gap-4 sm:grid-cols-2">
            {SERVICES.map((s) => {
              const Icon = ICONS[s.icon];
              return (
                <Link
                  key={s.slug}
                  href={`/services/${s.slug}`}
                  className="group flex flex-col rounded-3xl border border-stone-200 bg-white p-5 md:p-6 hover:border-emerald-200 hover:shadow-sm transition-colors"
                >
                  <span
                    className="w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center mb-3.5"
                    style={{ background: '#E4F5EC' }}
                  >
                    <Icon
                      className="w-5 h-5 md:w-6 md:h-6"
                      style={{ color: TEAL_DARK }}
                      aria-hidden="true"
                    />
                  </span>
                  <h2 className="text-base md:text-xl font-bold text-stone-800 mb-1.5">
                    {s.title}
                  </h2>
                  <p className="text-[13.5px] md:text-[15px] text-stone-600 leading-relaxed flex-1">
                    {s.tagline}
                  </p>
                  <span
                    className="mt-3.5 inline-flex items-center gap-1.5 text-[13px] md:text-sm font-medium"
                    style={{ color: TEAL_DARK }}
                  >
                    קראו עוד
                    <ArrowLeft
                      className="w-3.5 h-3.5 md:w-4 md:h-4 transition-transform group-hover:-translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <div className="bg-gradient-to-b from-white to-stone-50 h-6 md:h-10" />
      <ArticleCtaBanner source="services_index" />
    </div>
  );
}
