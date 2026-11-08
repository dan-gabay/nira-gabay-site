'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { trackCTAClick, trackLandingInternalNavigation } from '@/lib/analytics';
import { LP_FORM_ANCHOR } from '@/lib/landing/adultTherapy';
import { scrollToVisibleLpForm } from './formAnchor';

/** A CTA that scrolls back to the hero form. Reports a cta_click, not a conversion. */
export function FormAnchorLink({
  cta,
  location,
  className,
  children,
}: {
  cta: string;
  location: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={`#${LP_FORM_ANCHOR}`}
      onClick={(e) => {
        trackCTAClick(cta, location);
        scrollToVisibleLpForm(e);
      }}
      className={className}
    >
      {children}
    </a>
  );
}

/** An internal link out of the landing page (same tab), reported by destination only. */
export function LandingInternalLink({
  href,
  destination,
  className,
  children,
}: {
  href: string;
  destination: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={() => trackLandingInternalNavigation(destination)}
      className={className}
    >
      {children}
    </Link>
  );
}
