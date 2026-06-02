import type { Metadata } from 'next';

// /contact is a client component and cannot export metadata itself.
// This server layout supplies its unique title, description and canonical.
export const metadata: Metadata = {
  title: { absolute: 'צרו קשר - נירה גבאי | פסיכותרפיה והדרכת הורים' },
  description:
    'צרו קשר עם נירה גבאי, מטפלת בפסיכותרפיה ומדריכת הורים. קליניקה במושב שואבה, אזור ירושלים, או טיפול בזום וייעוץ טלפוני. טלפון, WhatsApp וטופס יצירת קשר.',
  alternates: {
    canonical: 'https://www.niragabay.com/contact',
  },
  openGraph: {
    title: 'צרו קשר - נירה גבאי | פסיכותרפיה והדרכת הורים',
    description:
      'קליניקה במושב שואבה, אזור ירושלים, או טיפול בזום וייעוץ טלפוני. שלחו הודעת WhatsApp או מלאו טופס.',
    url: 'https://www.niragabay.com/contact',
    type: 'website',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
