"use client";
import React from 'react';
import { Users, User, Heart, Baby, HeartHandshake, Brain } from 'lucide-react';
import { trackServiceInterest } from '@/lib/analytics';

const services = [
  {
    icon: Users,
    title: 'טיפול במתבגרים',
    description: 'ליווי מקצועי ורגיש בתקופה מאתגרת של התבגרות, עם דגש על בניית ביטחון עצמי וכלים להתמודדות.'
  },
  {
    icon: User,
    title: 'טיפול במבוגרים',
    description: 'מרחב בטוח לעיבוד רגשי, התמודדות עם אתגרי החיים והגשמה עצמית.'
  },
  {
    icon: Heart,
    title: 'טיפול זוגי',
    description: 'חיזוק הקשר הזוגי, שיפור התקשורת והתמודדות עם משברים מתוך הבנה ואמפתיה.'
  },
  {
    icon: Baby,
    title: 'הדרכת הורים',
    description: 'כלים מעשיים להורות מיטבית, הבנת עולמם של הילדים ובניית קשר משפחתי בריא.'
  },
  {
    icon: HeartHandshake,
    title: 'טיפול מיני',
    description: 'התמחות במיניות בריאה, ליווי זוגות ויחידים בנושאי אינטימיות וחיי מין.'
  },
  {
    icon: Brain,
    title: 'טיפול קוגניטיבי התנהגותי (CBT)',
    description: 'גישה מעשית ומוכחת מדעית לטיפול בחרדות, דיכאון, פוביות ודפוסי חשיבה שליליים.'
  }
];

export default function ServicesSection() {
  return (
    <section className="py-12 md:py-24 bg-gradient-to-b from-stone-50 to-white">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center mb-8 md:mb-16">
          <h2 className="text-xl md:text-4xl font-bold text-stone-800 mb-3 md:mb-4">
            תחומי ההתמחות שלי
          </h2>
          <p className="text-sm md:text-lg text-stone-600 max-w-2xl mx-auto">
            מגוון שירותי טיפול והדרכה מותאמים לצרכים שלכם
          </p>
          <div className="w-16 md:w-24 h-1 bg-gradient-to-l from-amber-400 to-stone-400 rounded-full mt-4 md:mt-6 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-stone-100 group h-full cursor-pointer"
                onClick={() => trackServiceInterest(service.title)}
              >
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="w-11 h-11 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-stone-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="w-5 h-5 md:w-7 md:h-7 text-stone-700" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-bold text-stone-800 mb-1.5 md:mb-2">{service.title}</h3>
                    <p className="text-stone-600 text-xs md:text-sm leading-relaxed">{service.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
