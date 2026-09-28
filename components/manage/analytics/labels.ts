import { SERVICES } from '@/lib/services';
import { PAGE_TYPE_LABELS } from '@/lib/siteEvents';

// Every raw string the analytics payload carries, said in Hebrew. The dashboard
// used to print `floating_button` and `service_adult-therapy` as they were
// stored, which is a database talking, not a report.

const SERVICE_TITLES = new Map(SERVICES.map((s) => [s.slug, s.title]));
export const serviceName = (slug: string) => SERVICE_TITLES.get(slug) || slug;

/** The channel of an enquiry: how the person reached out. */
export const CHANNEL_LABELS: Record<string, string> = {
  contact_whatsapp: 'ווטסאפ',
  contact_phone: 'טלפון',
  contact_email: 'אימייל',
  contact_form_submit: 'טופס',
};

/**
 * Where on the page the button was. The values are the `source` argument of
 * trackWhatsAppClick / trackContactMethodClick / trackContactFormSubmit across
 * components/ and app/; `service_<slug>` is the contact block on a service page.
 */
const SOURCE_LABELS: Record<string, string> = {
  floating_button: 'כפתור ווטסאפ צף',
  hero: 'כפתור בראש דף הבית',
  header: 'כפתור בתפריט העליון',
  header_mobile: 'כפתור בתפריט (טלפון)',
  footer: 'תחתית העמוד',
  home_cta: 'קריאה לפעולה בדף הבית',
  about: 'עמוד קצת עליי',
  clinic: 'עמוד הקליניקה',
  services_index: 'עמוד תחומי הטיפול',
  article_page_cta: 'באנר בתוך מאמר',
  articles_page_cta: 'באנר ברשימת המאמרים',
  topic_page_cta: 'באנר בעמוד נושא',
  contact_page: 'עמוד צור קשר',
  contact_page_cta: 'עמוד צור קשר',
  directions_request: 'בקשת הכוונה לקליניקה',
};

export function buttonLabel(source: string | null | undefined): string {
  if (!source) return 'לא ידוע';
  if (SOURCE_LABELS[source]) return SOURCE_LABELS[source];
  if (source.startsWith('service_')) return `טופס/כפתור בעמוד ${serviceName(source.slice(8))}`;
  return source;
}

/** A path as a page name: service pages by title, the fixed pages by name. */
export function pageName(path: string | null | undefined, articleTitles?: Map<string, string>): string {
  if (!path) return 'לא ידוע';
  if (path === '/') return 'דף הבית';
  const fixed: Record<string, string> = {
    '/about': 'קצת עליי',
    '/contact': 'צרו קשר',
    '/clinic': 'הקליניקה',
    '/articles': 'רשימת המאמרים',
    '/services': 'תחומי טיפול',
  };
  if (fixed[path]) return fixed[path];
  if (path.startsWith('/services/')) return serviceName(path.slice(10));
  if (path.startsWith('/articles/topic/')) return `נושא: ${decodeURIComponent(path.slice(16))}`;
  if (path.startsWith('/articles/')) {
    const slug = path.slice(10);
    return articleTitles?.get(slug) || slug;
  }
  return path;
}

export const pageTypeName = (t: string) => PAGE_TYPE_LABELS[t] || t;

export const DEVICE_LABELS: Record<string, string> = {
  mobile: 'טלפון',
  desktop: 'מחשב',
  tablet: 'טאבלט',
  unknown: 'לא ידוע',
};

/**
 * One event of an enquiry's visit, as a line of its timeline. Nouns rather than
 * verbs, so no line has to guess who the visitor is.
 */
export function journeyLabel(
  e: { event_name: string; path: string | null; source: string | null },
  articleTitles?: Map<string, string>,
): string {
  const page = pageName(e.path, articleTitles);
  if (CHANNEL_LABELS[e.event_name]) return `פנייה ב${CHANNEL_LABELS[e.event_name]} - ${buttonLabel(e.source)}`;
  switch (e.event_name) {
    case 'page_view':
      return page;
    case 'cta_click':
      return 'לחיצה על כפתור יצירת קשר';
    case 'article_read':
      return 'קריאה במאמר';
    case 'article_completed':
      return 'קריאת המאמר עד הסוף';
    case 'service_interest':
      return 'עניין בשירות';
    case 'search':
      return 'חיפוש באתר';
    case 'share':
      return 'שיתוף';
    case 'article_like':
      return 'לייק';
    case 'comment_submit':
      return 'תגובה נשלחה';
    case 'sign_up':
      return 'הרשמה לרשימה';
    default:
      return e.event_name;
  }
}
