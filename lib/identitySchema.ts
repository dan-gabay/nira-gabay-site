// Who this site belongs to, in the form a machine reads.
//
// Two nodes, linked by @id so a parser resolves them as one entity rather than
// as two businesses that happen to share a phone number:
//
//   Person (#nira)     - the practitioner. Name, title, training, profiles.
//   ProfessionalService (#practice) - the practice. Address, hours, services.
//
// One correction is deliberate and worth reading before editing. This block
// used to declare `"@type": "Psychologist"`. Nira is a psychotherapist and a
// parent-guidance practitioner; she is not a psychologist, and in Israel
// "פסיכולוג" is a title protected by law (חוק הפסיכולוגים, 1977). Schema.org
// has no Psychotherapist type, so the practice is typed ProfessionalService -
// which is what /clinic already used - and the actual qualification is stated
// in `jobTitle`, `description` and `hasCredential`, where it is true.
//
// Nothing here may claim a credential Nira does not hold. The three lines in
// `hasCredential` are the ones her own About page states.

import { CLINIC } from '@/lib/clinic';
import { SERVICES } from '@/lib/services';
import { SERVICES_LIVE } from '@/lib/publish';

export const BASE_URL = 'https://www.niragabay.com';
export const PERSON_ID = `${BASE_URL}/#nira`;
export const PRACTICE_ID = `${BASE_URL}/#practice`;

const SAME_AS = [
  'https://www.facebook.com/nira.gabay',
  'https://www.instagram.com/niragabay',
];

const SERVICE_NAMES: Array<{ slug: string; name: string; description: string }> = [
  { slug: 'teen-therapy', name: 'טיפול במתבגרים', description: 'ליווי מקצועי ורגיש בתקופה מאתגרת של התבגרות' },
  { slug: 'adult-therapy', name: 'טיפול במבוגרים', description: 'מרחב בטוח לעיבוד רגשי והתמודדות עם אתגרי החיים' },
  { slug: 'couples-therapy', name: 'טיפול זוגי', description: 'חיזוק הקשר הזוגי ושיפור התקשורת' },
  { slug: 'parent-guidance', name: 'הדרכת הורים', description: 'כלים מעשיים להורות מיטבית' },
  { slug: 'sex-therapy', name: 'טיפול מיני', description: 'התמחות במיניות בריאה' },
  { slug: 'cbt', name: 'טיפול קוגניטיבי התנהגותי (CBT)', description: 'גישה מעשית לטיפול בחרדות ודיכאון' },
];

// The URL of the page that actually sells each service.
//
// Resolved against lib/services.ts rather than written out here, so a slug
// that stops existing yields no url instead of a 404 in the structured data.
// Gated on SERVICES_LIVE for the same reason the sitemap is: while the service
// pages are noindex, the entity must not point search engines at them.
const serviceUrl = (slug: string): string | undefined =>
  SERVICES_LIVE && SERVICES.some((s) => s.slug === slug)
    ? `${BASE_URL}/services/${slug}`
    : undefined;

export const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': PERSON_ID,
  name: 'נירה גבאי',
  alternateName: 'Nira Gabay',
  url: `${BASE_URL}/about`,
  mainEntityOfPage: `${BASE_URL}/about`,
  jobTitle: 'מטפלת בפסיכותרפיה ומדריכת הורים',
  description:
    'מטפלת בפסיכותרפיה ומדריכת הורים. בעלת תואר שני (M.A) בייעוץ חינוכי, הכשרה בטיפול קוגניטיבי התנהגותי (CBT) מאוניברסיטת חיפה והתמחות במיניות בריאה. מלווה מתבגרים, מבוגרים וזוגות בקליניקה במושב שואבה שבאזור ירושלים ובטיפול מקוון בזום.',
  image: CLINIC.photo,
  telephone: CLINIC.phone,
  email: 'niraga1123@gmail.com',
  sameAs: SAME_AS,
  knowsLanguage: ['he', 'en'],
  knowsAbout: [
    'פסיכותרפיה',
    'הדרכת הורים',
    'טיפול במתבגרים',
    'טיפול זוגי',
    'טיפול קוגניטיבי התנהגותי (CBT)',
    'חרדה',
    'מיניות בריאה',
  ],
  hasCredential: [
    {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'degree',
      name: 'תואר שני (M.A) בייעוץ חינוכי',
    },
    {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'certificate',
      name: 'הכשרה בטיפול קוגניטיבי התנהגותי (CBT)',
      recognizedBy: { '@type': 'CollegeOrUniversity', name: 'אוניברסיטת חיפה' },
    },
    {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'certificate',
      name: 'התמחות במיניות בריאה',
    },
  ],
  worksFor: { '@id': PRACTICE_ID },
};

// This is the practice, and it is the ONLY node that may describe it.
//
// A second ProfessionalService used to be emitted on the homepage from
// lib/servicesSchema.ts. It carried no @id, so standard JSON-LD processing
// resolved it to a blank node - a separate business that happened to share a
// phone number - and the useful properties ended up split across the two:
// founder/employee/sameAs here, paymentAccepted/areaServed/offers there, with
// neither node complete and the two already disagreeing about the locality
// ('מושב שואבה' vs 'שואבה') and the area served (all of Israel vs five towns).
// Its distinct properties were folded in below and the file deleted.
export const practiceSchema = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  '@id': PRACTICE_ID,
  name: 'נירה גבאי - פסיכותרפיה והדרכת הורים',
  alternateName: 'Nira Gabay - Psychotherapy and Parenting Counseling',
  description: 'קליניקה לפסיכותרפיה והדרכת הורים במושב שואבה, אזור ירושלים, וטיפול מקוון בזום.',
  url: BASE_URL,
  logo: 'https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/logo.png',
  image: 'https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/hero-desktop.png',
  telephone: CLINIC.phone,
  email: 'niraga1123@gmail.com',
  sameAs: SAME_AS,
  founder: { '@id': PERSON_ID },
  employee: { '@id': PERSON_ID },
  address: {
    '@type': 'PostalAddress',
    addressLocality: CLINIC.locality,
    addressRegion: 'ירושלים',
    addressCountry: CLINIC.addressCountry,
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: CLINIC.geo.latitude,
    longitude: CLINIC.geo.longitude,
  },
  priceRange: '$$',
  paymentAccepted: 'מזומן, העברה בנקאית, אשראי',
  // Carried over from the /clinic page's own ProfessionalService block, which
  // was removed as a duplicate. It is the one claim that block made and this
  // node did not.
  availableLanguage: { '@type': 'Language', name: 'Hebrew' },
  // Both facts, because both are true and they answer different searches: the
  // towns are who can reach the room, the country is who can be seen on Zoom.
  areaServed: [
    { '@type': 'City', name: 'שואבה' },
    { '@type': 'City', name: 'ירושלים' },
    { '@type': 'City', name: 'מבשרת ציון' },
    { '@type': 'City', name: 'בית שמש' },
    { '@type': 'City', name: 'מודיעין' },
    { '@type': 'Country', name: 'ישראל' },
  ],
  availableService: SERVICE_NAMES.map((s) => {
    const url = serviceUrl(s.slug);
    return {
      '@type': 'Service',
      name: s.name,
      description: s.description,
      provider: { '@id': PERSON_ID },
      ...(url ? { url } : {}),
    };
  }),
};

export const webSiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${BASE_URL}/#website`,
  name: 'נירה גבאי - פסיכותרפיה והדרכת הורים',
  alternateName: 'נירה גבאי',
  url: BASE_URL,
  description:
    'מטפלת בפסיכותרפיה ומדריכת הורים. מלווה מתבגרים, מבוגרים וזוגות בדרכם להגשמה עצמית.',
  inLanguage: 'he-IL',
  publisher: { '@id': PERSON_ID },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${BASE_URL}/articles?search={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

// Short references to the two nodes above, for use inside other schema graphs
// (an article's `author`, a service's `provider`).
//
// They carry `@id` *and* a couple of literal fields. The `@id` alone is the
// correct linked-data answer and Google resolves it against the full node the
// root layout emits on every page. Bing and the AI crawlers are less reliable
// about cross-node resolution, and an `author` they cannot resolve reads as an
// article with no author at all. The literals are read off the nodes rather
// than retyped, so there is still exactly one place to edit.
export const authorRef = {
  '@type': 'Person',
  '@id': PERSON_ID,
  name: personSchema.name,
  url: personSchema.url,
  jobTitle: personSchema.jobTitle,
} as const;

export const publisherRef = {
  '@type': 'ProfessionalService',
  '@id': PRACTICE_ID,
  name: practiceSchema.name,
  url: practiceSchema.url,
  logo: { '@type': 'ImageObject', url: practiceSchema.logo },
} as const;

export const webSiteRef = {
  '@type': 'WebSite',
  '@id': webSiteSchema['@id'],
  name: webSiteSchema.name,
  url: webSiteSchema.url,
} as const;
