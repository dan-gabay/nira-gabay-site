// Records the moment someone taps WhatsApp, phone or email, together with the
// ad click that brought them.
//
// This is not analytics. lib/analytics.ts already sends contact_whatsapp to
// site_events and that is what the dashboard counts. The row written here is
// lead attribution: it exists so that when Nira later logs the enquiry by hand
// in /manage, the gclid and campaign of the click can be copied onto the lead.
// Without it a WhatsApp enquiry has no source, which is most of them - see
// db/2026-09-19-contact-intents.sql for the reasoning and the numbers.
//
// Nothing personal is sent. The tap is anonymous; the only identifier in the
// payload is gclid, which names a click on an ad rather than a person.

import { getStoredAttribution } from './attribution';
import { isOptedOut } from './ownerOptOut';

export type ContactChannel = 'whatsapp' | 'phone' | 'email';

/**
 * Fire-and-forget. Never throws, never awaited by a caller, never delays the
 * tap: a WhatsApp button navigates to wa.me immediately, so this uses
 * sendBeacon, which the browser completes after the page is gone. A plain
 * fetch would be cancelled by that navigation and the row would be lost -
 * which is the whole reason the attribution was missing in the first place.
 */
export function recordContactIntent(channel: ContactChannel): void {
  // The owner testing the WhatsApp button is not a lead.
  if (typeof window === 'undefined' || isOptedOut()) return;

  try {
    // Null when the visitor has no stored attribution - a direct visit, or
    // storage blocked. The row is still worth writing: it says a tap happened,
    // and "no attribution" is a truthful answer that keeps the tap count
    // honest against site_events.
    const attribution = getStoredAttribution();

    const body = JSON.stringify({
      channel,
      source_page: window.location.pathname,
      attribution,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        '/api/contact-intent',
        new Blob([body], { type: 'application/json' }),
      );
    } else {
      void fetch('/api/contact-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      });
    }
  } catch {
    // A missing attribution row is a reporting gap. Breaking the WhatsApp
    // button would be a lost client.
  }
}
