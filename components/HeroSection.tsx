"use client";
import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { MessageCircle, Calendar } from 'lucide-react';
import { trackWhatsAppClick, trackCTAClick } from '@/lib/analytics';

const WA_HREF = `https://wa.me/972507936681?text=${encodeURIComponent('שלום נירה, אשמח לקבוע פגישה')}`;

// Teal palette sampled from the photo's wall, deepening for the gradient.
const TEAL_DEEP = '#16323b';
const TEAL_MID = '#244a57';

export default function HeroSection() {
  const Pill = (
    <span className="inline-block px-4 py-1.5 rounded-full text-white/75 text-xs tracking-wide border border-white/25">
      פסיכותרפיה מתכנון אדלרי | CBT
    </span>
  );

  const Buttons = (
    <div className="flex flex-col gap-3 w-full max-w-sm mx-auto md:mx-0">
      <a
        href={WA_HREF}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackWhatsAppClick('hero')}
        className="flex items-center justify-center gap-2.5 w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl text-base font-medium whitespace-nowrap shadow-lg shadow-green-900/20 transition-colors"
      >
        <MessageCircle className="w-5 h-5 flex-shrink-0" />
        שלחו הודעת WhatsApp
      </a>
      <a
        href="/contact"
        onClick={() => trackCTAClick('contact', 'hero')}
        className="flex items-center justify-center gap-2.5 w-full border border-white/35 text-white/95 py-4 rounded-2xl text-base font-medium whitespace-nowrap hover:bg-white/10 transition-colors"
      >
        <Calendar className="w-5 h-5 flex-shrink-0" />
        קבעו פגישה
      </a>
    </div>
  );

  const Copy = (
    <>
      <h1 className="text-5xl md:text-6xl xl:text-7xl font-bold text-white leading-[1.05] mb-3">
        נירה גבאי
      </h1>
      <p className="text-lg md:text-xl xl:text-2xl text-white/90 font-light mb-5">
        מטפלת בפסיכותרפיה ומדריכת הורים
      </p>
      <p className="text-sm md:text-base text-white/65 leading-relaxed mb-8">
        מטפלת במבוגרים, בני נוער וזוגות,
        <br />
        מומחית למיניות בריאה
        <br />
        מלווה אתכם בדרך להגשמה עצמית ולחיים מלאים יותר
      </p>
    </>
  );

  return (
    <section aria-label="נירה גבאי - מטפלת בפסיכותרפיה" style={{ background: TEAL_DEEP }}>
      {/* ────────────────────────────────────────
          MOBILE  (< md) — portrait on top, centered copy below
      ──────────────────────────────────────── */}
      <div className="md:hidden">
        <div className="relative w-full" style={{ height: 'clamp(340px, 46vh, 440px)' }}>
          <Image
            src="/images/hero-portrait.png"
            alt="נירה גבאי - מטפלת בפסיכותרפיה ומדריכת הורים"
            fill
            priority
            fetchPriority="high"
            quality={90}
            className="object-cover"
            style={{ objectPosition: '50% 18%' }}
            sizes="100vw"
          />
          {/* blend the photo bottom into the teal copy area */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to top, ${TEAL_DEEP} 2%, ${TEAL_DEEP}cc 18%, ${TEAL_DEEP}33 42%, transparent 70%)`,
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="px-6 pb-10 -mt-16 relative z-10 text-center"
        >
          <div className="mb-5">{Pill}</div>
          {Copy}
          <div
            className="w-16 h-px mx-auto mb-6"
            style={{ background: 'rgba(255,255,255,0.25)' }}
          />
          {Buttons}
        </motion.div>
      </div>

      {/* ────────────────────────────────────────
          DESKTOP  (≥ md) — full-width photo, teal gradient overlay, copy on right
      ──────────────────────────────────────── */}
      <div className="hidden md:block relative min-h-[88vh] w-full overflow-hidden">
        <Image
          src="/images/hero-landscape.png"
          alt="נירה גבאי - מטפלת בפסיכותרפיה ומדריכת הורים"
          fill
          priority
          fetchPriority="high"
          quality={92}
          className="object-cover"
          style={{ objectPosition: '30% 50%' }}
          sizes="100vw"
        />

        {/* Teal gradient: opaque on the right (RTL text side) → clear over the subject on the left */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to left, ${TEAL_DEEP} 0%, ${TEAL_DEEP}f2 26%, ${TEAL_MID}b3 46%, ${TEAL_MID}40 62%, transparent 80%)`,
          }}
        />

        <div className="absolute inset-0 flex items-center justify-end">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full max-w-xl px-12 xl:px-20 text-right"
          >
            <div className="mb-8">{Pill}</div>
            {Copy}
            {Buttons}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
