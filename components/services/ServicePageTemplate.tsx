import Link from 'next/link';
import Image from 'next/image';
import { PhoneCall, GraduationCap, BookOpen, MapPin, Users } from 'lucide-react';
import JsonLd from '@/components/JsonLd';
import ContactForm from '@/components/ContactForm';
import ServiceCtas from '@/components/services/ServiceCtas';
import type { ServiceConfig } from '@/lib/services';

export type RelatedArticle = { slug: string; title: string };

type ServicePageTemplateProps = {
  service: ServiceConfig;
  relatedArticles: RelatedArticle[];
};

const trustChips = [
  { icon: GraduationCap, text: 'תואר שני M.A בייעוץ חינוכי' },
  { icon: BookOpen, text: 'הכשרה בטיפול CBT, אוניברסיטת חיפה' },
  { icon: Users, text: 'שנים רבות של ניסיון עם ילדים, מתבגרים והורים' },
  { icon: MapPin, text: 'קליניקה במושב שואבה + אפשרות זום' },
];

// Server-rendered landing page for one service. All copy comes from
// lib/services.ts; the interactive pieces (CTAs, form) are client islands.
export default function ServicePageTemplate({ service, relatedArticles }: ServicePageTemplateProps) {
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.metaDescription,
    url: `https://www.niragabay.com/services/${service.slug}`,
    serviceType: service.name,
    provider: {
      '@type': 'Psychologist',
      name: 'נירה גבאי',
      url: 'https://www.niragabay.com',
      telephone: '+972-50-7936681',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'שואבה',
        addressRegion: 'ירושלים',
        addressCountry: 'IL',
      },
    },
    areaServed: [
      { '@type': 'City', name: 'ירושלים' },
      { '@type': 'City', name: 'מבשרת ציון' },
      { '@type': 'City', name: 'בית שמש' },
      { '@type': 'City', name: 'מודיעין' },
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

  return (
    <div className="overflow-hidden" style={{ paddingTop: '80px' }}>
      <JsonLd data={serviceSchema} />
      <JsonLd data={faqSchema} />

      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-stone-100 to-amber-50">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-block px-4 py-2 bg-amber-100 rounded-full text-amber-800 text-sm mb-6">
              טיפול והדרכה
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-stone-800 mb-6">
              {service.h1}
            </h1>
            <p className="text-xl text-stone-600 leading-relaxed mb-10">
              {service.subtitle}
            </p>
            <ServiceCtas whatsappMessage={service.whatsappMessage} sourceId={service.sourceId} />
          </div>

          {/* Trust chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-5xl mx-auto mt-12">
            {trustChips.map((chip, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/70 rounded-xl px-4 py-3 border border-stone-200">
                <chip.icon className="w-5 h-5 text-amber-700 flex-shrink-0" />
                <span className="text-sm text-stone-700">{chip.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free intro call banner */}
      <section className="bg-stone-800 text-white">
        <div className="container mx-auto px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-right">
            <PhoneCall className="w-6 h-6 text-amber-400 flex-shrink-0" />
            <p className="text-lg">
              <strong>שיחת היכרות טלפונית של 15 דקות, ללא עלות וללא התחייבות</strong>
              {' '}- נכיר, תשאלו כל שאלה, ונבדוק יחד אם זה מתאים לכם.
            </p>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {service.intro.map((p, i) => (
              <p key={i} className="text-lg text-stone-600 leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* When to reach out */}
      <section className="py-16 bg-gradient-to-b from-stone-50 to-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-stone-800 mb-8 text-center">
              {service.whenTitle}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {service.whenItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-stone-100 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                  <span className="text-stone-700">{item}</span>
                </div>
              ))}
            </div>
            {service.extraNote && (
              <div className="mt-8 bg-amber-50 border border-amber-100 rounded-2xl p-6 text-stone-700">
                {service.extraNote.text}{' '}
                <Link href={service.extraNote.linkHref} className="font-medium text-amber-800 underline hover:text-amber-900">
                  {service.extraNote.linkText}
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-stone-800 mb-10 text-center">
              איך זה עובד?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {service.processSteps.map((step, i) => (
                <div key={i} className="bg-stone-50 rounded-2xl p-6 border border-stone-100">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center mb-4">
                    {i + 1}
                  </div>
                  <h3 className="text-lg font-bold text-stone-800 mb-2">{step.title}</h3>
                  <p className="text-stone-600 text-sm leading-relaxed">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About Nira */}
      <section className="py-16 bg-gradient-to-br from-amber-50 to-stone-50">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 md:p-10 shadow-lg">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-40 h-40 relative flex-shrink-0">
                <Image
                  src="https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/hero-desktop.png"
                  alt="נירה גבאי - מטפלת בפסיכותרפיה ומדריכת הורים"
                  fill
                  loading="lazy"
                  quality={75}
                  className="object-cover rounded-2xl shadow"
                  sizes="160px"
                />
              </div>
              <div className="text-center md:text-right">
                <h2 className="text-2xl font-bold text-stone-800 mb-3">נירה גבאי</h2>
                <p className="text-stone-600 leading-relaxed mb-4">
                  מטפלת בפסיכותרפיה ומדריכת הורים, בעלת תואר שני בייעוץ חינוכי והכשרה בטיפול
                  קוגניטיבי התנהגותי (CBT) מאוניברסיטת חיפה. שנים רבות של עבודה עם ילדים,
                  מתבגרים והורים, בקליניקה, בבתי ספר ובהדרכת צוותים חינוכיים. אמא לשלושה וסבתא.
                </p>
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 border border-stone-300 hover:bg-stone-50 rounded-xl px-5 py-2 text-stone-800 transition-colors"
                >
                  קראו עוד עליי
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ - visible content matching the FAQPage JSON-LD above */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-stone-800 mb-10 text-center">
              שאלות נפוצות
            </h2>
            <div className="space-y-6">
              {service.faq.map((f, i) => (
                <div key={i} className="bg-stone-50 rounded-2xl p-6 border border-stone-100">
                  <h3 className="text-lg font-bold text-stone-800 mb-3">{f.q}</h3>
                  <p className="text-stone-600 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Related reading */}
      {relatedArticles.length > 0 && (
        <section className="py-16 bg-gradient-to-b from-stone-50 to-white">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-stone-800 mb-6">
                רוצים לקרוא עוד לפני שמחליטים?
              </h2>
              <ul className="space-y-3 mb-8">
                {relatedArticles.map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`/articles/${a.slug}`}
                      className="text-amber-800 hover:text-amber-900 underline text-lg"
                    >
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={`/articles/topic/${service.topicSlug}`}
                className="inline-flex items-center gap-2 border border-stone-300 hover:bg-stone-50 rounded-xl px-6 py-2 text-stone-800 transition-colors"
              >
                לכל המאמרים בנושא
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section className="py-20 bg-gradient-to-br from-stone-800 to-stone-900 text-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-4">מוכנים לצעד הראשון?</h2>
              <p className="text-xl text-white/90 mb-8">
                שלחו הודעה או התקשרו, ונקבע שיחת היכרות קצרה ללא עלות.
              </p>
              <ServiceCtas whatsappMessage={service.whatsappMessage} sourceId={service.sourceId} light />
            </div>
            <div className="max-w-xl mx-auto">
              <ContactForm
                sourceId={service.sourceId}
                title="או השאירו פרטים ואחזור אליכם"
                subtitle="אענה בהקדם האפשרי"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
