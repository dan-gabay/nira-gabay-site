import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { Check } from 'lucide-react';
import { supabaseServer } from '@/lib/supabaseServer';
import { SERVICES, getService, type Service } from '@/lib/services';
import { SERVICES_LIVE, UNPUBLISHED_ROBOTS } from '@/lib/publish';
import { whatsappHref } from '@/lib/whatsapp';
import {
  TEAL_DARK,
  MINT,
  ARTICLES_HERO_BG,
  CHIP_BASE,
  CHIP_IDLE,
  CHIP_ACTIVE,
} from '@/lib/palette';
import ArticleRow from '@/components/ArticleRow';
import ServiceCta from '@/components/ServiceCta';
import JsonLd from '@/components/JsonLd';
import type { ArticleListItem } from '@/app/articles/ArticlesBrowser';

// Service copy is static; only the supporting-article rail comes from the DB.
export const revalidate = 3600;

const BASE_URL = 'https://www.niragabay.com';

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

// One fetch per request, shared by generateMetadata and the page body.
const getSupportingArticles = cache(
  async (slugs: string[]): Promise<ArticleListItem[]> => {
    if (slugs.length === 0) return [];
    const supabase = supabaseServer();
    const { data } = await supabase
      .from('articles')
      .select('id, title, slug, excerpt, image_url, reading_time, created_date, tags')
      .eq('is_published', true)
      .in('slug', slugs);

    const bySlug = new Map((data || []).map((a) => [a.slug, a]));
    // Keep the hand-picked order from lib/services.ts rather than the DB's.
    return slugs
      .map((s) => bySlug.get(s))
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
      .map((a) => ({
        ...a,
        tag_names: a.tags
          ? a.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : [],
      }));
  },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) {
    return { title: 'השירות לא נמצא', robots: { index: false, follow: false } };
  }

  const url = `${BASE_URL}/services/${service.slug}`;
  return {
    title: { absolute: service.metaTitle },
    description: service.metaDescription,
    keywords: [service.focusKeyword, ...service.secondaryKeywords],
    alternates: { canonical: url },
    ...(SERVICES_LIVE ? {} : { robots: UNPUBLISHED_ROBOTS }),
    openGraph: {
      title: service.metaTitle,
      description: service.metaDescription,
      url,
      type: 'website',
      locale: 'he_IL',
      siteName: 'נירה גבאי',
    },
  };
}

function buildSchema(service: Service, url: string) {
  const provider = {
    '@type': 'Person',
    name: 'נירה גבאי',
    jobTitle: 'מטפלת בפסיכותרפיה ומדריכת הורים',
    url: `${BASE_URL}/about`,
  };

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.title,
    description: service.metaDescription,
    url,
    serviceType: service.focusKeyword,
    inLanguage: 'he-IL',
    provider,
    areaServed: [
      { '@type': 'City', name: 'ירושלים' },
      { '@type': 'City', name: 'מבשרת ציון' },
      { '@type': 'City', name: 'בית שמש' },
      { '@type': 'City', name: 'מודיעין' },
      { '@type': 'Country', name: 'ישראל' },
    ],
    availableChannel: [
      {
        '@type': 'ServiceChannel',
        name: 'מפגש בקליניקה',
        servicePhone: '+972-50-7936681',
        serviceLocation: {
          '@type': 'Place',
          name: 'הקליניקה של נירה גבאי',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'שואבה',
            addressRegion: 'ירושלים',
            addressCountry: 'IL',
          },
        },
      },
      { '@type': 'ServiceChannel', name: 'מפגש אונליין', serviceUrl: url },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: service.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'דף הבית', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'תחומי טיפול', item: `${BASE_URL}/services` },
      { '@type': 'ListItem', position: 3, name: service.title, item: url },
    ],
  };

  return { serviceSchema, faqSchema, breadcrumbSchema };
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const url = `${BASE_URL}/services/${service.slug}`;
  const articles = await getSupportingArticles(service.articleSlugs);
  const { serviceSchema, faqSchema, breadcrumbSchema } = buildSchema(service, url);
  const waHref = whatsappHref(service.whatsappMessage);

  return (
    <div style={{ paddingTop: '80px' }}>
      <JsonLd data={serviceSchema} />
      <JsonLd data={faqSchema} />
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
            <Link href="/services" className="hover:text-white transition-colors">
              תחומי טיפול
            </Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <span className="text-white/90">{service.navLabel}</span>
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
              {service.title}
            </h1>
            <p className="text-sm md:text-lg text-white/80 leading-relaxed">
              {service.tagline}
            </p>
          </div>
        </div>
      </section>

      {/* ───────── Sibling services (crawlable) ───────── */}
      <div className="container mx-auto px-4 md:px-8 pt-5 md:pt-8">
        <div
          className="flex items-center gap-2 md:gap-2.5 overflow-x-auto scrollbar-hide pb-1 md:justify-center"
          aria-label="ניווט בין תחומי טיפול"
        >
          {SERVICES.map((s) => {
            const isActive = s.slug === service.slug;
            return (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                aria-current={isActive ? 'page' : undefined}
                className={`${CHIP_BASE} ${isActive ? CHIP_ACTIVE : CHIP_IDLE}`}
                style={isActive ? { background: MINT } : undefined}
              >
                {s.navLabel}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ───────── Intro ───────── */}
      <section className="pt-6 md:pt-10 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto space-y-3 md:space-y-4">
            {service.intro.map((p, i) => (
              <p
                key={i}
                className="text-[15px] md:text-lg text-stone-700 leading-relaxed"
              >
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── When people come ───────── */}
      <section className="py-8 md:py-12 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-lg md:text-2xl font-bold text-stone-800 mb-4 md:mb-5">
              מתי פונים
            </h2>
            <ul className="grid gap-2.5 md:gap-3 sm:grid-cols-2">
              {service.signs.map((s, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3 md:p-3.5"
                >
                  <Check
                    className="w-4 h-4 md:w-[18px] md:h-[18px] mt-0.5 flex-shrink-0"
                    style={{ color: MINT }}
                    aria-hidden="true"
                  />
                  <span className="text-[13.5px] md:text-[0.9375rem] text-stone-700 leading-relaxed">
                    {s}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ───────── Body ───────── */}
      <section className="pb-4 md:pb-8 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto space-y-8 md:space-y-10">
            {service.sections.map((sec) => (
              <div key={sec.heading}>
                <h2 className="text-lg md:text-2xl font-bold text-stone-800 mb-2.5 md:mb-4">
                  {sec.heading}
                </h2>
                <div className="space-y-3 md:space-y-4">
                  {sec.body.map((p, i) => (
                    <p
                      key={i}
                      className="text-[15px] md:text-[1.0625rem] text-stone-600 leading-relaxed"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── First session ───────── */}
      <section className="py-8 md:py-12 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div
            className="max-w-3xl mx-auto rounded-3xl p-5 md:p-8"
            style={{ background: '#F4FAF7', border: '1px solid #D6EDE3' }}
          >
            <h2 className="text-lg md:text-2xl font-bold text-stone-800 mb-3 md:mb-4">
              איך נראה המפגש הראשון
            </h2>
            <div className="space-y-3 md:space-y-4">
              {service.firstSession.map((p, i) => (
                <p
                  key={i}
                  className="text-[14.5px] md:text-[1rem] text-stone-600 leading-relaxed"
                >
                  {p}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section className="pb-8 md:pb-12 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-lg md:text-2xl font-bold text-stone-800 mb-4 md:mb-6">
              שאלות נפוצות
            </h2>
            <div className="space-y-2.5 md:space-y-3">
              {service.faq.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-2xl border border-stone-200 bg-white p-4 md:p-5 open:border-emerald-200"
                >
                  <summary className="cursor-pointer list-none font-semibold text-stone-800 text-[15px] md:text-[1.0625rem] flex items-start justify-between gap-3">
                    <span>{f.q}</span>
                    <span
                      aria-hidden="true"
                      className="mt-1 flex-shrink-0 text-stone-400 transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-2.5 text-[14.5px] md:text-[1rem] text-stone-600 leading-relaxed">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Supporting articles ───────── */}
      {articles.length > 0 && (
        <section className="py-8 md:py-12 bg-gradient-to-b from-white to-stone-50">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-lg md:text-2xl font-bold text-stone-800 mb-4 md:mb-6">
                לקריאה נוספת בנושא
              </h2>
              {/* Stays inside the page's reading column, so two across on
                  desktop rather than the three the wider pages use. */}
              <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-5">
                {articles.map((a, i) => (
                  <ArticleRow
                    key={a.id}
                    article={a}
                    index={i}
                    headingLevel={3}
                    trackLocation={`service_${service.slug}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <ServiceCta
        serviceSlug={service.slug}
        serviceLabel={service.navLabel}
        waHref={waHref}
        discreet={service.discreet}
      />
    </div>
  );
}
