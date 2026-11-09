import type { Metadata } from 'next';

// /about is a client component and cannot export metadata itself.
// This server layout supplies its unique title, description and canonical.
export const metadata: Metadata = {
  title: { absolute: 'אודות נירה גבאי - מטפלת בפסיכותרפיה ומדריכת הורים' },
  description:
    'נירה גבאי, מטפלת בפסיכותרפיה ומדריכת הורים. בוגרת מכון אדלר, M.A בייעוץ חינוכי, הכשרה ב-CBT וב-DBT מאוניברסיטת חיפה. קליניקה בשואבה, אזור ירושלים.',
  alternates: {
    canonical: 'https://www.niragabay.com/about',
  },
  openGraph: {
    title: 'אודות נירה גבאי - מטפלת בפסיכותרפיה ומדריכת הורים',
    description:
      'בוגרת מכון אדלר, M.A בייעוץ חינוכי, הכשרה ב-CBT וב-DBT. מלווה מתבגרים, מבוגרים וזוגות בדרכם להגשמה עצמית.',
    url: 'https://www.niragabay.com/about',
    type: 'profile',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
