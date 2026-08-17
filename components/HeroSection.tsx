"use client";
import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { MessageCircle, Calendar } from 'lucide-react';
import { trackWhatsAppClick, trackCTAClick } from '@/lib/analytics';

const WA_HREF = `https://wa.me/972507936681?text=${encodeURIComponent('שלום נירה, אשמח לקבוע פגישה')}`;

// Teal palette sampled from the photo's wall, deepening for the gradient.
const TEAL_DEEP = '#16323b';

// Mobile hero photo. Kept as its own file so the shot can be swapped without
// touching this component - just replace public/images/hero-mobile.jpg.
// The photo is already a tight 495x505 headshot, so the square crop is a
// near-exact fit and needs no repositioning.
const MOBILE_HERO_SRC = '/images/hero-mobile.jpg';
const MOBILE_HERO_POSITION = '50% 50%';
const BLUR_MOBILE =
  'data:image/webp;base64,UklGRrQAAABXRUJQVlA4IKgAAAAQBACdASoQABEAPt1apkyopSOiMAgBEBuJbACdMoMjbDHGPtxllet2SAD+Ctj7ntfZfZ1cHNhRCfPQBFkcDHx4UGZB7i6eko08IMLx8h/bIB7ukkzdgTAUrmW0EDN3qqXgCaaTF8D9qmEtrg2wrHoaR5SE7YSgppgZU5mdnewB61nYx4h3OiCCb9da/P0oRv8m7XWvz9KEb/JvmhJmo3lovC+icpoAAAA=';

// Inlined low-res blurs of the actual photos (generated from the source images).
// They fill the hero box with the full composition instantly, so the heavy image
// just sharpens in place instead of streaming in over a flat placeholder.
const BLUR_LANDSCAPE =
  'data:image/webp;base64,UklGRmYAAABXRUJQVlA4IFoAAAAQAgCdASoQAAsAA4BaJbACdAEWNtQiDLUAAP7au1XUAlLihMxrtMSyBfuZJKus8P2EBut2KsaJ9xzGEmqkU0vFKCj9JJNxgRicefRyl7IQCZuUj91i38oloAA=';

export default function HeroSection() {
  const Pill = (
    <span className="inline-block px-4 py-1.5 rounded-full text-white/75 text-xs tracking-wide border border-white/25">
      פסיכותרפיה | CBT
    </span>
  );

  const Buttons = (
    <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
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
      <h1 className="text-4xl md:text-6xl xl:text-7xl font-bold text-white leading-[1.05] mb-3">
        נירה גבאי
        {/* keyword-rich continuation for SEO/crawlers; visually hidden so the design is unchanged */}
        <span className="sr-only"> - מטפלת בפסיכותרפיה ומדריכת הורים</span>
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
        {/* Square photo block with a clean bottom edge (no fade into the copy). */}
        <div className="relative w-full aspect-square overflow-hidden">
          <Image
            src={MOBILE_HERO_SRC}
            alt="נירה גבאי - מטפלת בפסיכותרפיה ומדריכת הורים"
            fill
            priority
            fetchPriority="high"
            quality={90}
            placeholder="blur"
            blurDataURL={BLUR_MOBILE}
            className="object-cover"
            style={{ objectPosition: MOBILE_HERO_POSITION }}
            sizes="100vw"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="px-6 pt-8 pb-10 text-center"
        >
          <div className="mb-5">{Pill}</div>
          {Copy}
          {Buttons}
        </motion.div>
      </div>

      {/* ────────────────────────────────────────
          DESKTOP  (≥ md) — full-width photo, teal gradient overlay, copy on right
      ──────────────────────────────────────── */}
      {/* The image carries its OWN inline height in vh units. Measured: with `fill` the image's
          height:100% depends on the parent's resolved height, which is 0 on the first layout pass,
          so the image rendered at 0 then grew to full height — the visible load jump. A vh height
          on the <img> itself resolves against the viewport immediately, with no parent dependency. */}
      <div
        className="hidden md:block relative w-full overflow-hidden"
        style={{ background: '#4e6c72' }}
      >
        <Image
          src="/images/hero-landscape.png"
          alt="נירה גבאי - מטפלת בפסיכותרפיה ומדריכת הורים"
          width={1536}
          height={1024}
          priority
          fetchPriority="high"
          quality={92}
          placeholder="blur"
          blurDataURL={BLUR_LANDSCAPE}
          sizes="100vw"
          className="block"
          style={{ width: '100%', height: '88vh', objectFit: 'cover', objectPosition: '30% 50%' }}
        />

        {/* justify-start === physical RIGHT in this RTL section (text side) */}
        <div className="absolute inset-0 flex items-center justify-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full max-w-xl px-12 xl:px-20 text-center"
            style={{ textShadow: '0 1px 14px rgba(0,0,0,0.30)' }}
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
