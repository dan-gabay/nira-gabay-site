"use client";
import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { trackWhatsAppClick, trackCTAClick } from '@/lib/analytics';

const WA_HREF = `https://wa.me/972507936681?text=${encodeURIComponent('שלום נירה, אשמח לקבוע פגישה')}`;

export default function HeroSection() {
  return (
    <>
      {/* ─── MOBILE: stacked — image top, text below ─── */}
      <div className="block md:hidden">
        {/* Portrait photo — no text overlap */}
        <div className="relative w-full" style={{ height: '72vw', maxHeight: '380px' }}>
          <Image
            src="https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/hero-mobile.png"
            alt="נירה גבאי - מטפלת בפסיכותרפיה"
            fill
            priority
            fetchPriority="high"
            quality={85}
            className="object-cover object-top"
            sizes="100vw"
          />
          {/* soft fade into content section */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-stone-900 to-transparent" />
        </div>

        {/* Text content */}
        <div className="bg-stone-900 px-6 pt-5 pb-10 text-right">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="inline-block px-3 py-1.5 bg-white/15 backdrop-blur-sm rounded-full text-white/90 text-xs mb-4">
              פסיכותרפיה ממכון אדלר | CBT
            </span>

            <h1 className="text-4xl font-bold text-white mb-3 leading-tight">
              נירה גבאי
            </h1>

            <p className="text-lg text-white/85 mb-2 font-light leading-relaxed">
              מטפלת בפסיכותרפיה ומדריכת הורים
            </p>

            <p className="text-sm text-white/65 mb-7 leading-relaxed">
              מטפלת במתבגרים, מבוגרים וזוגות, מומחית למיניות בריאה
              <br />
              מלווה אתכם בדרך להגשמה עצמית ולחיים מלאים יותר
            </p>

            <div className="flex flex-col gap-3">
              <a
                href={WA_HREF}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackWhatsAppClick('hero')}
                className="block w-full bg-green-600 hover:bg-green-700 text-white text-center py-4 rounded-xl text-base font-medium transition-colors"
              >
                שלחו הודעת WhatsApp
              </a>
              <a
                href="/contact"
                onClick={() => trackCTAClick('contact', 'hero')}
                className="block w-full border border-white/40 text-white text-center py-4 rounded-xl text-base font-medium hover:bg-white/10 transition-colors"
              >
                קבעו פגישה
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ─── DESKTOP: overlay layout (unchanged) ─── */}
      <motion.section
        className="relative hidden md:flex min-h-[85vh] items-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-l from-stone-900/70 via-stone-900/50 to-transparent z-10" />
          <Image
            src="https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/hero-desktop.png"
            alt="נירה גבאי - קליניקה לפסיכותרפיה"
            fill
            priority
            fetchPriority="high"
            quality={85}
            className="object-cover"
            sizes="100vw"
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
                href={WA_HREF}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackWhatsAppClick('hero')}
              >
                <button className="bg-green-600 hover:bg-green-700 text-white gap-3 px-8 py-4 text-lg rounded-xl shadow-2xl w-full sm:w-auto">
                  שלחו הודעת WhatsApp
                </button>
              </a>
              <a href="/contact" onClick={() => trackCTAClick('contact', 'hero')}>
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
    </>
  );
}
