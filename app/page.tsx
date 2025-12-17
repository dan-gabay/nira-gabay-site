"use client";
import React from 'react';
import { motion } from 'framer-motion';

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
  return (
    <div className="overflow-hidden">
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
            className="w-full h-full"
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
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 font-serif leading-tight">
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
            <h2 className="text-3xl md:text-4xl font-bold text-stone-800 mb-8 font-serif">
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
            <h2 className="text-3xl md:text-4xl font-bold text-stone-800 mb-4 font-serif">
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
                    <h3 className="text-lg font-bold text-stone-800 mb-2 font-serif">{service.title}</h3>
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
                  <h3 className="text-2xl font-bold text-stone-800 mb-4 font-serif">הקליניקה שלי</h3>
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
    </div>
  );
}
