'use client';

import Link from 'next/link';
import Image from 'next/image';
import { PenLine } from 'lucide-react';
import { trackCTAClick, trackLandingInternalNavigation } from '@/lib/analytics';
import { LP_FORM_ANCHOR } from '@/lib/landing/adultTherapy';

/**
 * The landing page's header: the logo (home) and one "contact" button that
 * scrolls to the form. No navigation menu - a paid visitor on a test page
 * gets one clear thing to do, and the logo for anyone who wants the full site.
 *
 * Same logo file, name and tagline as components/Header.tsx. Sticky and solid
 * white rather than fixed-transparent, so no page needs an 80px spacer and the
 * dark hero never shows through behind the logo.
 */
export default function LandingHeader({ source }: { source: string }) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/70">
      <div className="container mx-auto px-4 md:px-8 h-16 md:h-[72px] flex items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 md:gap-3 min-w-0"
          onClick={() => trackLandingInternalNavigation('home_logo')}
        >
          <Image
            src="https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/logo.png"
            alt="לוגו נירה גבאי - פסיכותרפיה והדרכת הורים"
            width={44}
            height={44}
            className="object-contain w-10 h-10 md:w-11 md:h-11 flex-shrink-0"
            priority
          />
          <span className="min-w-0">
            <span className="block text-base md:text-lg font-bold text-stone-800 font-serif leading-tight">
              נירה גבאי
            </span>
            <span className="block text-[11px] md:text-xs text-stone-500 truncate">
              פסיכותרפיה והדרכת הורים
            </span>
          </span>
        </Link>

        <a
          href={`#${LP_FORM_ANCHOR}`}
          onClick={() => trackCTAClick('lp_header_contact', source)}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-4 md:px-5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-sm md:text-base font-medium whitespace-nowrap transition-colors"
        >
          <PenLine className="w-4 h-4" aria-hidden="true" />
          יצירת קשר
        </a>
      </div>
    </header>
  );
}
