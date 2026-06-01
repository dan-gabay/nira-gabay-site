"use client";
import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { MessageCircle, Calendar } from 'lucide-react';
import { trackWhatsAppClick, trackCTAClick } from '@/lib/analytics';

const WA_HREF = `https://wa.me/972507936681?text=${encodeURIComponent('שלום נירה, אשמח לקבוע פגישה')}`;
const PANEL_BG = '#141c20';

export default function HeroSection() {
  return (
    <>
      {/* ────────────────────────────────────────
          MOBILE  (< md)
          Portrait image + gradient overlay text
          + solid dark CTA strip below
      ──────────────────────────────────────── */}
      <div className="block md:hidden" style={{ background: PANEL_BG }}>
        {/* Image — focused on subject, less empty top */}
        <div
          className="relative w-full"
          style={{ height: 'clamp(360px, 48vh, 460px)' }}
        >
          <Image
            src="/images/hero-portrait.png"
            alt="נירה גבאי - מטפלת בפסיכותרפיה"
            fill
            priority
            fetchPriority="high"
            quality={90}
            className="object-cover"
            style={{ objectPosition: '50% 22%' }}
            sizes="100vw"
          />

          {/* Gradient — transparent top → dark bottom (blends into content) */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to top, ${PANEL_BG} 0%, ${PANEL_BG}e6 22%, ${PANEL_BG}40 48%, transparent 72%)`,
            }}
          />
        </div>

        {/* Content — pulled up into the gradient, natural flow so nothing is cut off */}
        <div className="px-6 pt-1 pb-9 text-right -mt-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <span className="inline-block px-3 py-1 rounded-full text-white/80 text-xs border border-white/20 mb-4">
              פסיכותרפיה ממכון אדלר | CBT
            </span>

            <h1 className="text-[2.6rem] font-bold text-white leading-tight mb-2">
              נירה גבאי
            </h1>

            <p className="text-lg text-white/90 font-light mb-2">
              מטפלת בפסיכותרפיה ומדריכת הורים
            </p>

            <p className="text-sm text-white/65 leading-relaxed mb-7">
              מטפלת במתבגרים, בני נוער וזוגות,
              <br />
              מומחית למיניות בריאה
              <br />
              מלווה אתכם בדרך להגשמה עצמית ולחיים מלאים יותר
            </p>

            <div className="flex flex-col gap-3">
              <a
                href={WA_HREF}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackWhatsAppClick('hero')}
                className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl text-base font-medium transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                שלחו הודעת WhatsApp
              </a>
              <a
                href="/contact"
                onClick={() => trackCTAClick('contact', 'hero')}
                className="flex items-center justify-center gap-2 w-full border border-white/25 text-white/90 py-4 rounded-xl text-base font-medium hover:bg-white/8 transition-colors"
              >
                <Calendar className="w-5 h-5" />
                קבעו פגישה
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ────────────────────────────────────────
          DESKTOP  (≥ md)
          Split: landscape photo left | dark panel right
      ──────────────────────────────────────── */}
      <div className="hidden md:flex min-h-screen">
        {/* Left — photo */}
        <div className="relative w-[55%] flex-shrink-0">
          <Image
            src="/images/hero-landscape.png"
            alt="נירה גבאי - מטפלת בפסיכותרפיה"
            fill
            priority
            fetchPriority="high"
            quality={90}
            className="object-cover object-center"
            sizes="55vw"
          />
        </div>

        {/* Right — dark content panel */}
        <div
          className="flex-1 flex items-center justify-end"
          style={{ background: PANEL_BG }}
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full max-w-lg px-12 xl:px-16 text-right"
          >
            <span className="inline-block px-4 py-1.5 rounded-full text-white/70 text-sm border border-white/20 mb-8">
              פסיכותרפיה ממכון אדלר | CBT
            </span>

            <h1 className="text-5xl xl:text-6xl font-bold text-white leading-tight mb-4">
              נירה גבאי
            </h1>

            <p className="text-xl xl:text-2xl text-white/85 font-light mb-5">
              מטפלת בפסיכותרפיה ומדריכת הורים
            </p>

            <p className="text-base text-white/55 leading-relaxed mb-10">
              מטפלת במתבגרים, בני נוער וזוגות,
              <br />
              מומחית למיניות בריאה
              <br />
              מלווה אתכם בדרך להגשמה עצמית ולחיים מלאים יותר
            </p>

            <div className="flex flex-col gap-3 max-w-sm">
              <a
                href={WA_HREF}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackWhatsAppClick('hero')}
                className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white px-7 py-4 rounded-xl text-base font-medium whitespace-nowrap transition-colors"
              >
                <MessageCircle className="w-5 h-5 flex-shrink-0" />
                שלחו הודעת WhatsApp
              </a>
              <a
                href="/contact"
                onClick={() => trackCTAClick('contact', 'hero')}
                className="flex items-center justify-center gap-2 w-full border border-white/25 text-white/90 px-7 py-4 rounded-xl text-base font-medium whitespace-nowrap hover:bg-white/8 transition-colors"
              >
                <Calendar className="w-5 h-5 flex-shrink-0" />
                קבעו פגישה
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
