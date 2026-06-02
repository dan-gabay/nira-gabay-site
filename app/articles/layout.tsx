import type { Metadata } from 'next';

// /articles is a client component and cannot export metadata itself.
// This server layout supplies its unique title, description and canonical.
// Note: it wraps the index list only; the dynamic [slug] route sets its own metadata.
export const metadata: Metadata = {
  title: { absolute: 'מאמרים - נירה גבאי | פסיכותרפיה, הורות וזוגיות' },
  description:
    'מאמרים מאת נירה גבאי, מטפלת בפסיכותרפיה ומדריכת הורים, על פסיכותרפיה, הדרכת הורים, זוגיות, CBT והתמודדות רגשית.',
  alternates: {
    canonical: 'https://www.niragabay.com/articles',
  },
  openGraph: {
    title: 'מאמרים - נירה גבאי | פסיכותרפיה, הורות וזוגיות',
    description:
      'מאמרים על פסיכותרפיה, הדרכת הורים, זוגיות, CBT והתמודדות רגשית.',
    url: 'https://www.niragabay.com/articles',
    type: 'website',
  },
};

export default function ArticlesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
