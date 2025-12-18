"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Calendar, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const services = [
  {
    icon: '👥',
    title: 'טיפול במתבגרים',
    description: 'ליווי מקצועי ורגיש בתקופה מאתגרת של התבגרות, עם דגש על בניית ביטחון עצמי וכלים להתמודדות.'
  },
  {
    icon: '🧑',
    title: 'טיפול במבוגרים',
    description: 'מרחב בטוח לעיבוד רגשי, התמודדות עם אתגרי החיים והגשמה עצמית.'
  },
  {
    icon: '🤝',
    title: 'טיפול זוגי',
    description: 'חיזוק הקשר הזוגי, שיפור התקשורת והתמודדות עם משברים מתוך הבנה ואמפתיה.'
  },
  {
    icon: '👶',
    title: 'הדרכת הורים',
    description: 'כלים מעשיים להורות מיטבית, הבנת עולמם של הילדים ובניית קשר משפחתי בריא.'
  },
  {
    icon: '❤️',
    title: 'טיפול מיני',
    description: 'התמחות במיניות בריאה, ליווי זוגות ויחידים בנושאי אינטימיות וחיי מין.'
  },
  {
    icon: '🧠',
    title: 'טיפול קוגניטיבי התנהגותי (CBT)',
    description: 'גישה מעשית ומוכחת מדעית לטיפול בחרדות, דיכאון, פוביות ודפוסי חשיבה שליליים.'
  }
];

export default function Home() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArticles() {
      const { data } = await supabase
        .from('articles')
        .select(`
          *,
          article_tags(
            tags(name)
          )
        `)
        .eq('is_published', true)
        .order('created_date', { ascending: false })
        .limit(3);
      
      if (data) {
        const articlesWithTags = data.map(article => ({
          ...article,
          tag_names: article.article_tags?.map((at: any) => at.tags?.name).filter(Boolean) || []
        }));
        setArticles(articlesWithTags);
      }
      setLoading(false);
    }
    
    fetchArticles();
  }, []);

  return (
    <div className="overflow-hidden">
      <style>{`
        @media (max-width: 768px) {
          .hero-bg-image {
            background-image: url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6939893ccce1b9a0f8ccda5e/9addc0feb_Screenshot2025-12-14at01854.png') !important;
            background-position: left center !important;
          }
        }
      `}</style>
      
      {/* Hero Section */}
      <motion.section
        className="relative min-h-[90vh] flex items-center"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-l from-stone-900/70 via-stone-900/50 to-transparent z-10" />
          <div 
            className="w-full h-full hero-bg-image"
            style={{
              backgroundImage: 'url(https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6939893ccce1b9a0f8ccda5e/e176dba49_gemini-cleaned-aph4ywt.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
        </div>
        {/* Content */}
        <div className="container mx-auto px-4 md:px-8 relative z-20">
          <div className="max-w-3xl mr-0 md:mr-12 text-right">
            <span className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm mb-6">
              פסיכותרפיה ממכון אדלר | CBT
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              נירה גבאי
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-4 font-light">
              מטפלת בפסיכותרפיה<br />מדריכת הורים
            </p>
            <p className="text-lg text-white/80 mb-10 max-w-xl leading-relaxed">
              מטפלת במתבגרים, מבוגרים וזוגות, מומחית למיניות בריאה
              <br />
              מלווה אתכם בדרך להגשמה עצמית ולחיים מלאים יותר
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href={`https://wa.me/972507936681?text=${encodeURIComponent('שלום נירה, אשמח לקבוע פגישה')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <button className="bg-green-600 hover:bg-green-700 text-white gap-3 px-8 py-4 text-lg rounded-xl shadow-2xl w-full sm:w-auto">
                  שלחו הודעת WhatsApp
                </button>
              </a>
              <a href="/contact">
                <button className="border-2 border-white bg-transparent text-white hover:bg-white hover:text-stone-900 gap-3 px-8 py-4 text-lg rounded-xl w-full sm:w-auto">
                  קבעו פגישה
                </button>
              </a>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20"
        >
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center pt-2">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-3 bg-white/70 rounded-full"
            />
          </div>
        </motion.div>
      </motion.section>

      {/* Introduction Section */}
      <motion.section
        className="py-24 bg-white"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
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
      </motion.section>

      {/* Services Section */}
      <motion.section
        className="py-24 bg-gradient-to-b from-stone-50 to-white"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-stone-800 mb-4">
              תחומי ההתמחות שלי
            </h2>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              מגוון שירותי טיפול והדרכה מותאמים לצרכים שלכם
            </p>
            <div className="w-24 h-1 bg-gradient-to-l from-amber-400 to-stone-400 rounded-full mt-6 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-stone-100 group h-full"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-stone-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 text-2xl">
                    {service.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-stone-800 mb-2">{service.title}</h3>
                    <p className="text-stone-600 text-sm leading-relaxed">{service.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Clinic Info */}
      <motion.section
        className="py-20 bg-gradient-to-br from-amber-50 to-stone-50"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-full md:w-1/3">
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6939893ccce1b9a0f8ccda5e/8fa23344b_nano_banana_removed.png"
                    alt="חדר טיפולים בקליניקה של נירה גבאי במושב שואבה - סביבה שקטה ומרגיעה לפסיכותרפיה"
                    className="w-full h-64 object-cover rounded-2xl shadow-lg"
                    loading="lazy"
                  />
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
      </motion.section>

      {/* Articles Preview */}
      {!loading && articles.length > 0 && (
        <motion.section
          className="py-24 bg-white"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="container mx-auto px-4 md:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-stone-800 mb-4">
                מאמרים אחרונים
              </h2>
              <p className="text-lg text-stone-600 max-w-2xl mx-auto">
                תובנות, כלים וידע מעולם הפסיכותרפיה וההורות
              </p>
              <div className="w-24 h-1 bg-gradient-to-l from-amber-400 to-stone-400 rounded-full mt-6 mx-auto" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map((article, index) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Link href={`/articles/${article.slug}`}>
                    <div className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-stone-100 h-full flex flex-col">
                      {article.image_url && (
                        <div className="relative h-48 overflow-hidden bg-stone-100">
                          <Image
                            src={article.image_url}
                            alt={article.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      
                      <div className="p-6 flex-1 flex flex-col">
                        {article.tag_names && article.tag_names.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {article.tag_names.slice(0, 2).map((tag: string, i: number) => (
                              <span key={i} className="inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <h3 className="text-xl font-bold text-stone-800 mb-3 group-hover:text-amber-700 transition-colors line-clamp-2">
                          {article.title}
                        </h3>
                        
                        {article.excerpt && (
                          <p className="text-stone-600 text-sm leading-relaxed mb-4 line-clamp-3 flex-1">
                            {article.excerpt}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between text-sm text-stone-500 pt-4 border-t border-stone-100">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {article.created_date && new Date(article.created_date).toLocaleDateString('he-IL')}
                          </div>
                          <span className="text-amber-700 font-medium group-hover:gap-2 flex items-center transition-all">
                            קראו עוד
                            <ArrowLeft className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link href="/articles">
                <button className="gap-2 border border-stone-300 hover:bg-stone-50 rounded-xl px-6 py-3 text-stone-800 inline-flex items-center">
                  לכל המאמרים
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </div>
        </motion.section>
      )}

      {/* CTA Section */}
      <motion.section
        className="py-24 bg-gradient-to-br from-stone-800 to-stone-900 text-white"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              מוכנים לצאת למסע של גילוי עצמי וצמיחה?
            </h2>
            <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
              אשמח ללוות אתכם בתהליך. צרו קשר עוד היום לקביעת פגישת היכרות ללא התחייבות.
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
      </motion.section>
    </div>
  );
}
