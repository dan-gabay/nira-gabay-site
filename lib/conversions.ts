// Ad-platform conversion signals, kept apart from lib/analytics.ts.
//
// lib/analytics.ts is the site's own measurement: dozens of events, all of
// them for understanding behaviour. This file is the short list of moments
// worth telling an ad platform about, because every one of them costs money
// to optimise against. Today that is exactly two things: someone reached out,
// and someone joined the mailing list.
//
// Everything here is a no-op unless the matching env var is set, so nothing
// fires in local or preview builds.

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';
export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fbq?: (command: string, eventName: string, params?: Record<string, any>) => void;
  }
}

function meta(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !META_PIXEL_ID || !window.fbq) return;
  try {
    window.fbq('track', eventName, params);
  } catch {
    // A blocked pixel must never break a CTA.
  }
}

/**
 * Someone tried to reach Nira - WhatsApp, phone, or the contact form.
 * This is THE conversion for the practice; everything else is a proxy.
 *
 * Google Ads is deliberately not sent a per-event conversion here. gtag.js is
 * configured with the AW- id (see components/GoogleAnalytics.tsx), which is
 * what captures gclid and enables auto-tagging; the conversions themselves are
 * imported from GA4 key events. That keeps conversion labels out of the code
 * and means adding a conversion is a change in the Ads UI, not a deploy.
 */
export function reportContactConversion(
  method: 'whatsapp' | 'phone' | 'email' | 'form',
): void {
  meta('Contact', { content_category: method });
}

/** Mailing-list signup. Real, but worth far less than a contact - kept separate. */
export function reportLeadConversion(source: string): void {
  meta('Lead', { content_category: source });
}
