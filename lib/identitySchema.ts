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

export const BASE_URL = 'https://www.niragabay.com';
export const PERSON_ID = `${BASE_URL}/#nira`;
export const PRACTICE_ID = `${BASE_URL}/#practice`;

const SAME_AS = [
  'https://www.facebook.com/nira.gabay',
  'https://www.instagram.com/niragabay',
];

const SERVICE_NAMES: Array<{ name: string; description: string }> = [
  { name: 'טיפול במתבגרים', description: 'ליווי מקצועי ורגיש בתקופה מאתגרת של התבגרות' },
  { name: 'טיפול במבוגרים', description: 'מרחב בטוח לעיבוד רגשי והתמודדות עם אתגרי החיים' },
  { name: 'טיפול זוגי', description: 'חיזוק הקשר הזוגי ושיפור התקשורת' },
  { name: 'הדרכת הורים', description: 'כלים מעשיים להורות מיטבית' },
  { name: 'טיפול מיני', description: 'התמחות במיניות בריאה' },
  { name: 'טיפול קוגניטיבי התנהגותי (CBT)', description: 'גישה מעשית לטיפול בחרדות ודיכאון' },
];

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

export const practiceSchema = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  '@id': PRACTICE_ID,
  name: 'נירה גבאי - פסיכותרפיה והדרכת הורים',
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
  areaServed: { '@type': 'Country', name: 'ישראל' },
  availableService: SERVICE_NAMES.map((s) => ({
    '@type': 'Service',
    name: s.name,
    description: s.description,
    provider: { '@id': PERSON_ID },
  })),
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
