'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Facebook,
  Monitor,
  type LucideIcon
} from 'lucide-react';
import { trackContactMethodClick, trackSocialClick, trackWhatsAppClick } from '@/lib/analytics';
import FaqSection from '@/components/FaqSection';
import ContactForm from '@/components/ContactForm';

type ContactInfoItem = {
  icon: LucideIcon | (() => React.ReactElement);
  title: string;
  value: string;
  link: string | null;
  color: string;
};

const WHATSAPP_NUMBER = '972507936681';
const WHATSAPP_MESSAGE = 'שלום נירה, אשמח לקבוע פגישה';

const contactInfo: ContactInfoItem[] = [
  {
    icon: Phone,
    title: 'טלפון',
    value: '050-7936681',
    link: 'tel:050-7936681',
    color: 'text-green-600'
  },
  {
    icon: Mail,
    title: 'אימייל',
    value: 'niraga1123@gmail.com',
    link: 'mailto:niraga1123@gmail.com',
    color: 'text-blue-600'
  },
  {
    icon: MapPin,
    title: 'מיקום הקליניקה',
    value: 'מושב שואבה',
    link: null,
    color: 'text-rose-600'
  },
  {
    icon: Facebook,
    title: 'פייסבוק',
    value: 'עקבו אחריי',
    link: 'https://www.facebook.com/nira.gabay',
    color: 'text-blue-700'
  },
  {
    icon: () => (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    title: 'אינסטגרם',
    value: 'עקבו אחריי',
    link: 'https://www.instagram.com/niragabay?igsh=eHV4eGJyeDdsZ3Vt',
    color: 'text-pink-600'
  }
];

export default function Contact() {
  return (
    <div className="overflow-hidden" style={{ paddingTop: '80px' }}>
      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-stone-100 to-amber-50">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="inline-block px-4 py-2 bg-amber-100 rounded-full text-amber-800 text-sm mb-6">
              צרו קשר
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-stone-800 mb-6">
              בואו נדבר
            </h1>
            <p className="text-xl text-stone-600 leading-relaxed">
              אתם מוזמנים לשלוח אליי שאלות למאמרים, לקבוע טיפול, הדרכת הורים, ייעוץ, טיפול זוגי או סדנאות
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Info */}
              <motion.div
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-2xl font-bold text-stone-800 mb-8">פרטי התקשרות</h2>
                
                <div className="space-y-6 mb-10">
                  {contactInfo.map((info, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="flex items-center gap-4"
                    >
                      <div className={`w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center flex-shrink-0 ${info.color}`}>
                        {typeof info.icon === 'function' ? 
                          React.createElement(info.icon) : 
                          React.createElement(info.icon, { className: 'w-6 h-6' })
                        }
                      </div>
                      <div>
                        <p className="text-sm text-stone-500">{info.title}</p>
                        {info.link ? (
                          <a 
                            href={info.link} 
                            target={info.link.startsWith('http') ? '_blank' : undefined}
                            rel={info.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                            className="text-lg font-medium text-stone-800 hover:text-amber-700 transition-colors"
                            onClick={() => {
                              if (info.title === 'טלפון') trackContactMethodClick('phone', 'contact_page');
                              else if (info.title === 'אימייל') trackContactMethodClick('email', 'contact_page');
                              else if (info.title === 'פייסבוק') trackSocialClick('facebook', 'contact_page');
                              else if (info.title === 'אינסטגרם') trackSocialClick('instagram', 'contact_page');
                            }}
                          >
                            {info.value}
                          </a>
                        ) : (
                          <p className="text-lg font-medium text-stone-800">{info.value}</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* WhatsApp CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 mb-8"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-800">הדרך המהירה ביותר</h3>
                      <p className="text-sm text-stone-600">שלחו הודעה בוואטסאפ</p>
                    </div>
                  </div>
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-green-600 hover:bg-green-700 text-white text-center py-3 rounded-lg font-medium transition-colors"
                    onClick={() => trackWhatsAppClick('contact_page_cta')}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      שלחו הודעת WhatsApp
                    </span>
                  </a>
                </motion.div>

                {/* Additional Info */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.35 }}
                  className="bg-stone-50 rounded-2xl p-6"
                >
                  <div className="flex items-start gap-4">
                    <Monitor className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-bold text-stone-800 mb-2">טיפול מרחוק</h4>
                      <p className="text-stone-600 text-sm">
                        קיימת גם אופציה לטיפולים בזום או ייעוץ טלפוני - מתאים במיוחד למי שמתגורר רחוק או מעדיף טיפול מהנוחות של הבית.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Contact Form */}
              <motion.div
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <ContactForm sourceId="contact_page" />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 bg-gradient-to-br from-stone-50 to-amber-50">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h2 className="text-3xl font-bold text-stone-800 mb-6">הקליניקה שלי</h2>
            <p className="text-lg text-stone-600 mb-8">
              הקליניקה ממוקמת במושב שואבה, באזור ירושלים, במרחב שקט וירוק המאפשר חוויה טיפולית אינטימית ומרגיעה.
            </p>
            
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="relative w-full h-64">
                <Image
                  src="https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/profile.png"
                  alt="חדר טיפולים בקליניקה של נירה גבאי במושב שואבה"
                  fill
                  className="object-cover"
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, 800px"
                />
              </div>
              <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-6 h-6 text-rose-500" />
                  <span className="text-lg font-medium text-stone-800">מושב שואבה</span>
                </div>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('שלום נירה, אשמח לקבל הנחיות הגעה לקליניקה')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors flex items-center gap-2"
                  onClick={() => trackWhatsAppClick('directions_request')}
                >
                  <MessageCircle className="w-5 h-5" />
                  בקשו הנחיות הגעה
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ - answers common objections at the point of decision */}
      <FaqSection />
    </div>
  );
}
