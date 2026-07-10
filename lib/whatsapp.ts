// Single source of truth for WhatsApp CTAs. The prefill text names the
// service the visitor was reading about - it makes Nira's first reply easier
// and records service interest without asking the visitor anything. Service
// name only; never symptoms or other health details.

export const WHATSAPP_NUMBER = '972507936681';

export const DEFAULT_WHATSAPP_MESSAGE = 'שלום נירה, אשמח לקבוע פגישה';

// Per-path prefills; longest prefix wins so /services/* pages can share one.
const PATH_PREFILLS: Array<{ prefix: string; message: string }> = [
  { prefix: '/services/parent-guidance', message: 'שלום נירה, אשמח לשיחת היכרות בנושא הדרכת הורים' },
  { prefix: '/services/child-therapy', message: 'שלום נירה, אשמח לשיחת היכרות בנושא טיפול רגשי לילדים' },
  { prefix: '/services/teen-therapy', message: 'שלום נירה, אשמח לשיחת היכרות בנושא טיפול למתבגרים' },
];

export function whatsappMessageForPath(pathname: string): string {
  const match = PATH_PREFILLS.find((p) => pathname.startsWith(p.prefix));
  return match ? match.message : DEFAULT_WHATSAPP_MESSAGE;
}

export function whatsappHref(message: string = DEFAULT_WHATSAPP_MESSAGE): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
