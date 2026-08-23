import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, MessageCircle } from 'lucide-react';
import JsonLd from '@/components/JsonLd';
import { faqSchema } from '@/lib/faqSchema';
import { servicesSchema } from '@/lib/servicesSchema';
import ArticlesPreviewClient, { type HomeArticlePreview } from '@/components/ArticlesPreviewClient';
import FaqSection from '@/components/FaqSection';
import HeroSection from '@/components/HeroSection';
import ServicesSection from '@/components/ServicesSection';
import Reveal from '@/components/Reveal';
import { supabaseServer } from '@/lib/supabaseServer';
import { whatsappHref } from '@/lib/whatsapp';
import type { Metadata } from 'next';

// Refresh the latest-articles section every 5 minutes (ISR)
export const revalidate = 300;

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://www.niragabay.com',
  },
};

// Server-side fetch so the latest-article links are in the initial HTML
// (they used to load client-side and were invisible to crawlers).
async function getLatestArticles(): Promise<HomeArticlePreview[]> {
  try {
    const supabase = supabaseServer();
    const { data } = await supabase
      .from('articles')
      .select('id, slug, title, excerpt, image_url, reading_time, created_date, tags')
      .eq('is_published', true)
      .order('created_date', { ascending: false })
      .limit(3);
    return (data || []).map((a) => ({
      ...a,
      tag_names: a.tags
        ? a.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : [],
    }));
  } catch {
    return [];
  }
}

export default async function Home() {
  const latestArticles = await getLatestArticles();
  return (
    <div className="overflow-hidden" style={{ paddingTop: '80px' }}>
      <JsonLd data={faqSchema} />
      <JsonLd data={servicesSchema} />
      
      {/* Hero Section (client component with animations) */}
      <HeroSection />

      {/* Introduction Section */}
      <section className="py-12 md:py-14 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <Reveal className="max-w-4xl mx-auto text-center">
            <h2 className="text-xl md:text-4xl font-bold text-stone-800 mb-5 md:mb-8">
              ברוכים הבאים למרחב הטיפולי שלי
            </h2>
            <p className="text-sm md:text-lg text-stone-600 leading-relaxed mb-5 md:mb-8">
              אני מאמינה שלכל אחד ואחת מאיתנו יש את הכוח להתמודד עם האתגרים שהחיים מזמנים לנו. 
              תפקידי כמטפלת הוא ללוות אתכם בתהליך של גילוי עצמי, ריפוי וצמיחה - במרחב בטוח, מכיל וחסר שיפוטיות.
            </p>
            <p className="text-sm md:text-lg text-stone-600 leading-relaxed">
              עם ניסיון של שנים רבות בטיפול במתבגרים, מבוגרים וזוגות, אני מציעה גישה אישית ומותאמת לצרכים הייחודיים של כל מטופל.
            </p>
            <Link
              href="/about"
              className="mt-6 md:mt-8 inline-flex items-center gap-2 min-h-[44px] border border-stone-300 hover:bg-stone-50 rounded-xl px-6 py-2 text-sm md:text-base text-stone-800 transition-colors"
            >
              קראו עוד עליי
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Services Section (client component with onClick) */}
      <ServicesSection />

      {/* Clinic Info */}
      <section className="py-10 md:py-12 bg-gradient-to-br from-amber-50 to-stone-50">
        <div className="container mx-auto px-4 md:px-8">
          <Reveal className="max-w-4xl mx-auto lg:max-w-5xl">
            <div className="bg-white rounded-3xl p-5 md:p-8 shadow-xl">
              <div className="flex flex-col md:flex-row items-center gap-5 md:gap-8">
                <div className="w-full md:w-1/3">
                  <div className="relative w-full aspect-[4/3]">
                    <Image
                      src="https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/profile.png"
                      alt="חדר טיפולים בקליניקה של נירה גבאי במושב שואבה - סביבה שקטה ומרגיעה לפסיכותרפיה"
                      fill
                      loading="lazy"
                      quality={75}
                      className="object-cover rounded-2xl shadow-lg"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                </div>
                <div className="w-full md:w-2/3 text-center md:text-right">
                  <h3 className="text-lg md:text-2xl font-bold text-stone-800 mb-3 md:mb-4">הקליניקה שלי</h3>
                  <p className="text-sm md:text-base text-stone-600 leading-relaxed mb-4 md:mb-6">
                    הקליניקה ממוקמת במושב שואבה, במרחב שקט וירוק המאפשר חוויה טיפולית אינטימית ומרגיעה. 
                    המקום מעוצב ליצירת אווירה חמה ומכילה.
                  </p>
                  <p className="text-sm md:text-base text-stone-600 leading-relaxed">
                    <strong>קיימת גם אופציה לטיפולים בזום או ייעוץ טלפוני</strong> - מתאים במיוחד למי שמתגורר רחוק או מעדיף טיפול מהנוחות של הבית.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Articles Preview (server-fetched, links in initial HTML) */}
      <ArticlesPreviewClient articles={latestArticles} />

      {/* FAQ - same content as the FAQPage JSON-LD, now visible to humans */}
      <FaqSection />

      {/* CTA Section */}
      <section className="py-12 md:py-14 bg-gradient-to-br from-stone-800 to-stone-900 text-white">
        <div className="container mx-auto px-4 md:px-8">
          <Reveal className="max-w-4xl mx-auto text-center">
            <h2 className="text-xl md:text-4xl font-bold mb-4 md:mb-6">
              מוכנים לצעד הראשון?
            </h2>
            <p className="text-sm md:text-xl text-white/90 mb-7 md:mb-10 max-w-2xl mx-auto">
              הדרך לשינוי מתחילה בשיחה אחת. אני כאן ללוות אתכם בתהליך אישי ומותאם לצרכים שלכם.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={whatsappHref()}
                target="_blank"
                rel="noopener noreferrer"
              >
                <button className="bg-green-600 hover:bg-green-700 text-white px-6 md:px-8 py-3 md:py-4 text-sm md:text-lg rounded-xl shadow-2xl w-full sm:w-auto inline-flex items-center justify-center gap-2.5 md:gap-3">
                  <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
                  שלחו הודעת WhatsApp
                </button>
              </a>
              <Link href="/contact">
                <button className="border-2 border-white bg-transparent text-white hover:bg-white hover:text-stone-900 px-6 md:px-8 py-3 md:py-4 text-sm md:text-lg rounded-xl w-full sm:w-auto inline-flex items-center justify-center gap-2.5 md:gap-3">
                  <Calendar className="w-5 h-5 md:w-6 md:h-6" />
                  קבעו פגישה
                </button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
