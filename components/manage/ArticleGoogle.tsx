'use client';

import { useEffect, useState } from 'react';
import type { GoogleArticle } from '@/lib/google/types';

// "בגוגל" in the SEO card of the article edit page: is the article indexed,
// when Google last crawled it, and what it was shown for. Live from
// /api/manage/google/article, only for an article that is already published.

const COVERAGE_LABELS: Record<string, string> = {
  'Submitted and indexed': 'באינדקס',
  'Indexed, not submitted in sitemap': 'באינדקס (לא דרך מפת האתר)',
  'Crawled - currently not indexed': 'נסרק, אבל גוגל עוד לא הכניסה לאינדקס',
  'Discovered - currently not indexed': 'גוגל מכירה את הכתובת, עוד לא סרקה',
  'URL is unknown to Google': 'גוגל עוד לא מכירה את הכתובת',
  'Page with redirect': 'הכתובת מפנה לעמוד אחר',
  'Duplicate, Google chose different canonical than user': 'גוגל בחרה עמוד אחר כמקורי',
  'Excluded by ‘noindex’ tag': 'חסום לאינדקס (noindex)',
  'Not found (404)': 'לא נמצא (404)',
};

function heDate(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' });
}

export default function ArticleGoogle({ slug }: { slug: string | null }) {
  const [state, setState] = useState<{ slug: string; data: GoogleArticle | null; failed: boolean } | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    fetch(`/api/manage/google/article?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: GoogleArticle) => !cancelled && setState({ slug, data, failed: false }))
      .catch(() => !cancelled && setState({ slug, data: null, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  let body: React.ReactNode;
  if (!slug) {
    body = <p className="text-sm text-stone-400">המאמר עוד לא פורסם, ולכן אין לו נתונים בגוגל.</p>;
  } else if (!state || state.slug !== slug) {
    body = <p className="text-sm text-stone-400">טוען נתונים מגוגל...</p>;
  } else if (state.failed || !state.data) {
    body = <p className="text-sm text-stone-400">לא הצלחנו לטעון נתונים מגוגל כרגע.</p>;
  } else if (!state.data.configured) {
    body = <p className="text-sm text-stone-400">אין חיבור לגוגל (חסרים משתני סביבה).</p>;
  } else {
    const { index, totals, queries, days } = state.data;
    const indexed = index?.verdict === 'PASS';
    const coverage = index?.coverageState ? COVERAGE_LABELS[index.coverageState] || index.coverageState : null;
    body = (
      <>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {index ? (
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                indexed ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {coverage || (indexed ? 'באינדקס' : 'לא באינדקס')}
            </span>
          ) : (
            <span className="text-xs text-stone-400">מצב האינדקס לא נטען</span>
          )}
          {index?.lastCrawlTime && (
            <span className="text-xs text-stone-500">נסרק לאחרונה ב-{heDate(index.lastCrawlTime)}</span>
          )}
        </div>
        {index?.googleCanonical && index.userCanonical && index.googleCanonical !== index.userCanonical && (
          <p className="text-xs text-amber-700 mt-2">
            גוגל בחרה כתובת אחרת כמקורית:{' '}
            <span dir="ltr" className="break-all">
              {index.googleCanonical}
            </span>
          </p>
        )}

        {totals === null ? (
          <p className="text-xs text-stone-400 mt-3">נתוני החיפוש לא נטענו.</p>
        ) : totals.impressions === 0 ? (
          <p className="text-xs text-stone-500 mt-3">גוגל לא הציגה את המאמר בתוצאות ב-{days} הימים האחרונים.</p>
        ) : (
          <>
            <p className="text-sm text-stone-700 mt-3 tabular-nums">
              ב-{days} הימים האחרונים: <strong>{totals.impressions}</strong> הופעות · <strong>{totals.clicks}</strong>{' '}
              לחיצות · מקום ממוצע {totals.position}
            </p>
            {queries.length > 0 ? (
              <table className="w-full mt-2 text-xs md:text-sm tabular-nums">
                <thead className="text-stone-400">
                  <tr>
                    <th className="text-start font-normal pb-1">חיפוש</th>
                    <th className="text-end font-normal pb-1">הופעות</th>
                    <th className="text-end font-normal pb-1">לחיצות</th>
                    <th className="text-end font-normal pb-1">מקום</th>
                  </tr>
                </thead>
                <tbody className="text-stone-700">
                  {queries.map((q) => (
                    <tr key={q.query}>
                      <td className="py-0.5 pe-2">{q.query}</td>
                      <td className="text-end">{q.impressions}</td>
                      <td className="text-end">{q.clicks}</td>
                      <td className="text-end">{q.position}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-stone-400 mt-1">גוגל לא מפרטת את החיפושים (חיפושים נדירים מוסתרים).</p>
            )}
          </>
        )}
        <p className="text-[11px] text-stone-400 mt-3">
          מקור: Search Console. הנתונים מגיעים באיחור של יומיים-שלושה, וחיפושים נדירים מוסתרים, ולכן סכום הטבלה יכול
          להיות קטן מהסך הכללי.
        </p>
      </>
    );
  }

  return (
    <div className="mt-4 border-t border-stone-100 pt-4">
      <p className="text-xs font-semibold text-stone-600 mb-2 uppercase tracking-wide">בגוגל</p>
      {body}
    </div>
  );
}
