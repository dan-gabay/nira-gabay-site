// Single source of truth for WhatsApp CTAs. The prefill text names the
// service the visitor was reading about - it makes Nira's first reply easier
// and records service interest without asking the visitor anything. Service
// name only; never symptoms or other health details.
//
// One deliberate exception: the discreet services (see lib/services.ts) get
// the neutral default. The prefill sits in the visitor's own WhatsApp history
// where other people may see it, so it must not announce the topic.

import { SERVICES } from './services';

export const WHATSAPP_NUMBER = '972507936681';

export const DEFAULT_WHATSAPP_MESSAGE = 'שלום נירה, אשמח לקבוע פגישה';

// Per-path prefills. Service pages are generated from lib/services.ts so the
// two can never drift; anything else is listed explicitly.
const PATH_PREFILLS: Array<{ prefix: string; message: string }> = [
  ...SERVICES.map((s) => ({
    prefix: `/services/${s.slug}`,
    message: s.whatsappMessage,
  })),
  { prefix: '/clinic', message: 'שלום נירה, אשמח לקבל הנחיות הגעה לקליניקה' },
];

export function whatsappMessageForPath(pathname: string): string {
  const match = PATH_PREFILLS.find((p) => pathname.startsWith(p.prefix));
  return match ? match.message : DEFAULT_WHATSAPP_MESSAGE;
}

export function whatsappHref(message: string = DEFAULT_WHATSAPP_MESSAGE): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
