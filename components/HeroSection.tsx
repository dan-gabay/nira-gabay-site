"use client";
import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { trackWhatsAppClick, trackCTAClick } from '@/lib/analytics';

export default function HeroSection() {
  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .hero-bg-image {
            background-image: url('https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/hero-mobile.png') !important;
            background-position: left center !important;
          }
        }
      `}</style>

      {/* Hero Section */}
      <motion.section
        className="relative min-h-[85vh] flex items-center"
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
            className="object-cover hero-bg-image"
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
                href={`https://wa.me/972507936681?text=${encodeURIComponent('שלום נירה, אשמח לקבוע פגישה')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackWhatsAppClick('hero')}
              >
                <button className="bg-green-700 hover:bg-green-800 text-white gap-3 px-8 py-4 text-lg font-medium rounded-xl shadow-2xl w-full sm:w-auto">
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
