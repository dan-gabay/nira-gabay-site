'use client';

import { ReactNode } from 'react';
import { trackWhatsAppClick } from '@/lib/analytics';

// A WhatsApp CTA that records the tap, for use inside server components.
//
// Most of the site's WhatsApp entry points live in client components and call
// trackWhatsAppClick directly. The home page and the service pages are server
// components, so their CTAs were plain anchors: the largest button on the
// busiest page recorded nothing at all, in site_events or in contact_intents.
// Every other WhatsApp button on the site was measured and that one was not,
// which quietly understated demand from the home page to zero.
//
// trackWhatsAppClick also writes the contact_intents row, so a tap from here
// reaches the queue in /manage like any other.

type WhatsAppLinkProps = {
  href: string;
  /** Where on the site this tap happened, e.g. 'home_cta'. */
  source: string;
  children: ReactNode;
  className?: string;
};

export default function WhatsAppLink({ href, source, children, className }: WhatsAppLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => trackWhatsAppClick(source)}
    >
      {children}
    </a>
  );
}
