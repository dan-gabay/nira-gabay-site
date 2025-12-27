import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, MessageCircle } from 'lucide-react';
import JsonLd from '@/components/JsonLd';
import { faqSchema } from '@/lib/faqSchema';
import { servicesSchema } from '@/lib/servicesSchema';
import ArticlesPreviewClient from '@/components/ArticlesPreviewClient';
import HeroSection from '@/components/HeroSection';
import ServicesSection from '@/components/ServicesSection';

export default function Home() {
  return (
    <div className="overflow-hidden" style={{ paddingTop: '80px' }}>
      <JsonLd data={faqSchema} />
      <JsonLd data={servicesSchema} />
      
      {/* Hero Section (client component with animations) */}
      <HeroSection />

      {/* Introduction Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-stone-800 mb-8">
              ברוכים הבאים למרחב הטיפולי שלי
            </h2>
            <p className="text-lg text-stone-600 leading-relaxed mb-8">
              אני מאמינה שלכל אחד ואחת מאיתנו יש את הכוח להתמודד עם האתגרים שהחיים מזמנים לנו. 
              תפקידי כמטפלת הוא ללוות אתכם בתהליך של גילוי עצמי, ריפוי וצמיחה - במרחב בטוח, מכיל וחסר שיפוטיות.
            </p>
            <p className="text-lg text-stone-600 leading-relaxed">
              עם ניסיון של שנים רבות בטיפול במתבגרים, מבוגרים וזוגות, אני מציעה גישה אישית ומותאמת לצרכים הייחודיים של כל מטופל.
            </p>
            <a href="/about">
              <button className="mt-8 gap-2 border border-stone-300 hover:bg-stone-50 rounded-xl px-6 py-2 text-stone-800">
                קראו עוד עליי
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* Services Section (client component with onClick) */}
      <ServicesSection />

      {/* Clinic Info */}
      <section className="py-20 bg-gradient-to-br from-amber-50 to-stone-50">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl">
              <div className="flex flex-col md:flex-row items-center gap-8">
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
                  <h3 className="text-2xl font-bold text-stone-800 mb-4">הקליניקה שלי</h3>
                  <p className="text-stone-600 leading-relaxed mb-6">
                    הקליניקה ממוקמת במושב שואבה, במרחב שקט וירוק המאפשר חוויה טיפולית אינטימית ומרגיעה. 
                    המקום מעוצב ליצירת אווירה חמה ומכילה.
                  </p>
                  <p className="text-stone-600 leading-relaxed">
                    <strong>קיימת גם אופציה לטיפולים בזום או ייעוץ טלפוני</strong> - מתאים במיוחד למי שמתגורר רחוק או מעדיף טיפול מהנוחות של הבית.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Articles Preview (client) */}
      <ArticlesPreviewClient />

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-stone-800 to-stone-900 text-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              מוכנים לצעד הראשון?
            </h2>
            <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
              הדרך לשינוי מתחילה בשיחה אחת. אני כאן ללוות אתכם בתהליך אישי ומותאם לצרכים שלכם.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={`https://wa.me/972507936681?text=${encodeURIComponent('שלום נירה, אשמח לקבוע פגישה')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <button className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg rounded-xl shadow-2xl w-full sm:w-auto inline-flex items-center justify-center gap-3">
                  <MessageCircle className="w-6 h-6" />
                  שלחו הודעת WhatsApp
                </button>
              </a>
              <Link href="/contact">
                <button className="border-2 border-white bg-transparent text-white hover:bg-white hover:text-stone-900 px-8 py-4 text-lg rounded-xl w-full sm:w-auto inline-flex items-center justify-center gap-3">
                  <Calendar className="w-6 h-6" />
                  קבעו פגישה
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
