'use client';
import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { GraduationCap, Award, Heart, MapPin, Users, BookOpen, Monitor } from 'lucide-react';

const milestones = [
  {
    icon: GraduationCap,
    title: 'השכלה מקצועית',
    description: 'תואר שני M.A בייעוץ חינוכי, עם התמחות בטיפול רגשי והתפתחותי.'
  },
  {
    icon: Award,
    title: 'התמחות במיניות בריאה',
    description: 'הכשרה ייחודית בתחום המיניות הבריאה, המאפשרת ליווי זוגות ויחידים בנושאים אינטימיים.'
  },
  {
    icon: BookOpen,
    title: 'הכשרה בטיפול קוגניטיבי התנהגותי (CBT)',
    description: 'הכשרה מקצועית בטיפול CBT מאוניברסיטת חיפה - גישה מעשית ומוכחת מדעית לטיפול בחרדות ודיכאון.'
  },
  {
    icon: Users,
    title: 'ניסיון רב-שנתי',
    description: 'שנים של עבודה עם מתבגרים, מבוגרים וזוגות במסגרות שונות - פרטי, מוסדי וחינוכי.'
  }
];

const experiences = [
  'ייעוץ חינוכי בבתי ספר',
  'הדרכת צוותים חינוכיים',
  'סדנאות להורים ומחנכים',
  'סדנאות למיניות בריאה',
  'טיפול פרטני בקליניקה',
  'טיפול זוגי ומשפחתי',
  'הדרכת הורים אישית וקבוצתית'
];

export default function About() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative py-32 bg-gradient-to-br from-stone-100 to-amber-50">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Image */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="w-full lg:w-2/5"
            >
              <div className="relative">
                <div className="absolute -top-4 -right-4 w-full h-full bg-gradient-to-br from-amber-200 to-stone-200 rounded-3xl" />
                <div className="relative w-full h-[500px]">
                  <Image
                    src="https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/hero-desktop.png"
                    alt="נירה גבאי - מטפלת בפסיכותרפיה, בעלת תואר שני M.A ממכון אדלר, מומחית למיניות בריאה וטיפול CBT"
                    fill
                    priority
                    className="rounded-3xl shadow-2xl object-cover"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                </div>
              </div>
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="w-full lg:w-3/5 text-center lg:text-right"
            >
              <span className="inline-block px-4 py-2 bg-amber-100 rounded-full text-amber-800 text-sm mb-6">
                קצת עליי
              </span>
              <h1 className="text-4xl md:text-5xl font-bold text-stone-800 mb-6">
                נירה גבאי
              </h1>
              <p className="text-xl text-stone-600 mb-4">
                מטפלת בפסיכותרפיה ומדריכת הורים
              </p>
              <p className="text-lg text-stone-500">
                פסיכותרפיה ממכון אדלר | CBT | מומחית למיניות בריאה
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Philosophy Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <h2 className="text-3xl font-bold text-stone-800 mb-8 text-center">
                הגישה הטיפולית שלי
              </h2>
              <div className="prose prose-lg max-w-none text-stone-600 leading-relaxed space-y-6">
                <p>
                  אני מאמינה שכל אדם נושא בתוכו את הפוטנציאל לצמיחה, ריפוי ושינוי. תפקידי כמטפלת הוא ליצור 
                  מרחב בטוח ומכיל, שבו תוכלו לחקור את עצמכם, להבין את הדפוסים שמעכבים אתכם, ולמצוא 
                  את הדרך שלכם קדימה.
                </p>
                <p>
                  הגישה שלי משלבת עומק פסיכודינמי עם כלים מעשיים, ומותאמת באופן אישי לצרכים ולקצב 
                  של כל מטופל. אני מאמינה בחשיבות של הקשר הטיפולי כבסיס לשינוי, ובכוחו של דיאלוג 
                  כן ופתוח.
                </p>
              </div>
            </motion.div>

            {/* Divider */}
            <div className="w-24 h-1 bg-gradient-to-l from-amber-400 to-stone-400 rounded-full mx-auto mb-16" />

            {/* Personal Story */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <h2 className="text-3xl font-bold text-stone-800 mb-8 text-center">
                הסיפור שלי
              </h2>
              <div className="prose prose-lg max-w-none text-stone-600 leading-relaxed space-y-6">
                <p>
                  הדרך שלי לפסיכותרפיה התחילה מתוך סקרנות אמיתית לעולם הנפשי של האדם ומתוך רצון 
                  עמוק לעזור לאחרים. למדתי במכון אדלר, שם רכשתי את הבסיס התיאורטי והמעשי לעבודה 
                  טיפולית, והמשכתי להתמקצע בתחומים נוספים לאורך השנים.
                </p>
                <p>
                  במהלך הקריירה שלי עבדתי במגוון מסגרות - באגודה לתכנון המשפחה, בבתי 
                  ספר כיועצת חינוכית, והדרכתי צוותים חינוכיים ומורים. הניסיון המגוון הזה העשיר אותי 
                  ואיפשר לי להכיר את האתגרים מזוויות שונות.
                </p>
                <p>
                  התמחותי במיניות בריאה נולדה מתוך הבנה שזהו תחום חיוני שלעתים קרובות נשאר בצל. 
                  אני מאמינה שמיניות בריאה היא חלק בלתי נפרד מחיים מלאים ומאושרים, וליווי בתחום 
                  הזה מצריך רגישות, מקצועיות וחוסר שיפוטיות.
                </p>
              </div>
            </motion.div>

            {/* Personal Life */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-amber-50 to-stone-50 rounded-3xl p-8 md:p-12 mb-16"
            >
              <div className="flex items-start gap-4 mb-6">
                <Heart className="w-8 h-8 text-rose-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-2xl font-bold text-stone-800 mb-4">ברמה האישית</h3>
                  <p className="text-stone-600 leading-relaxed">
                    אני אמא לשלושה ילדים וסבתא גאה. החוויות האישיות שלי כאמא וכסבתא מעשירות את 
                    ההבנה שלי את המשפחה, ההורות והאתגרים השונים שמגיעים בכל שלב בחיים. אני מביאה 
                    לטיפול לא רק ידע מקצועי, אלא גם ניסיון חיים אמיתי.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="py-24 bg-gradient-to-b from-stone-50 to-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-stone-800 mb-4">
              הכשרה וניסיון
            </h2>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              הרקע המקצועי שמאפשר לי ללוות אתכם
            </p>
            <div className="w-24 h-1 bg-gradient-to-l from-amber-400 to-stone-400 rounded-full mt-6 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {milestones.map((milestone, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-lg border border-stone-100"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-stone-100 flex items-center justify-center mb-6">
                  <milestone.icon className="w-7 h-7 text-stone-700" />
                </div>
                <h3 className="text-xl font-bold text-stone-800 mb-3">{milestone.title}</h3>
                <p className="text-stone-600 leading-relaxed">{milestone.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Experience List */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-stone-800 mb-4">
                מסגרות עבודה
              </h2>
              <p className="text-lg text-stone-600 max-w-2xl mx-auto">
                הניסיון המגוון שצברתי לאורך השנים
              </p>
              <div className="w-24 h-1 bg-gradient-to-l from-amber-400 to-stone-400 rounded-full mt-6 mx-auto" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {experiences.map((exp, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="flex items-center gap-3 bg-stone-50 rounded-xl p-4"
                >
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-stone-700">{exp}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Clinic Section */}
      <section className="py-24 bg-gradient-to-br from-stone-800 to-stone-900 text-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="w-full lg:w-1/2"
              >
                <div className="relative w-full aspect-[4/3]">
                  <Image
                    src="https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/profile.png"
                    alt="פנים הקליניקה לפסיכותרפיה של נירה גבאי במושב שואבה - חדר טיפול מעוצב באווירה חמה ומכילה"
                    fill
                    className="object-cover rounded-2xl shadow-2xl"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="w-full lg:w-1/2"
              >
                <div className="flex items-center gap-3 mb-6">
                  <MapPin className="w-6 h-6 text-amber-400" />
                  <h2 className="text-3xl font-bold">הקליניקה שלי</h2>
                </div>
                <p className="text-stone-300 leading-relaxed mb-6">
                  הקליניקה ממוקמת במושב שואבה, באזור ירושלים. המרחב מעוצב ליצירת אווירה חמה, 
                  מכילה ושלווה - סביבה אידיאלית לתהליך טיפולי עמוק ומשמעותי.
                </p>
                <div className="flex items-start gap-3 bg-white/10 rounded-xl p-4">
                  <Monitor className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-2">אפשרות לטיפול מרחוק</h4>
                    <p className="text-stone-400 text-sm">
                      קיימת גם אופציה לטיפולים בזום או ייעוץ טלפוני - מתאים במיוחד למי שמתגורר 
                      רחוק או מעדיף טיפול מהנוחות של הבית.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
