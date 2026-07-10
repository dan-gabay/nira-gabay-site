"use client";
import React from 'react';
import Link from 'next/link';
import { Users, User, Heart, Baby, HeartHandshake, Brain, Smile, ArrowLeft } from 'lucide-react';
import { trackServiceInterest } from '@/lib/analytics';

// Cards with an href link to their service landing page; the rest stay
// informational until their pages exist.
const services = [
  {
    icon: Users,
    title: 'טיפול במתבגרים',
    description: 'ליווי מקצועי ורגיש בתקופה מאתגרת של התבגרות, עם דגש על בניית ביטחון עצמי וכלים להתמודדות.',
    href: '/services/teen-therapy'
  },
  {
    icon: Smile,
    title: 'טיפול רגשי לילדים',
    description: 'מרחב בטוח לילדים מגיל 8 לבטא את מה שקשה, בשיתוף פעולה קרוב עם ההורים.',
    href: '/services/child-therapy'
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
    description: 'כלים מעשיים להורות מיטבית, הבנת עולמם של הילדים ובניית קשר משפחתי בריא.',
    href: '/services/parent-guidance'
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
    <section className="py-24 bg-gradient-to-b from-stone-50 to-white">
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
          {services.map((service, index) => {
            const IconComponent = service.icon;
            const card = (
              <div
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-stone-100 group h-full cursor-pointer"
                onClick={() => trackServiceInterest(service.title)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-stone-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="w-7 h-7 text-stone-700" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-stone-800 mb-2">{service.title}</h3>
                    <p className="text-stone-600 text-sm leading-relaxed">{service.description}</p>
                    {service.href && (
                      <span className="inline-flex items-center gap-1 text-amber-700 text-sm font-medium mt-3 group-hover:gap-2 transition-all">
                        קראו עוד
                        <ArrowLeft className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
            return service.href ? (
              <Link key={index} href={service.href} className="block h-full">
                {card}
              </Link>
            ) : (
              <div key={index}>{card}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
