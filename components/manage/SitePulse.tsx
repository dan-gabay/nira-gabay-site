'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, Heart, Inbox, Mail, TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Insights = {
  totalViews: number;
  totalLikes: number;
  publishedCount: number;
  leads30: number;
  leadsPrev30: number;
  subs30: number;
  subsPrev30: number;
  comments30: number;
  published30: number;
  byStatus: Record<string, number>;
  byChannel: Record<string, number>;
  top: Array<{ id: string; title: string; slug: string; views: number; likes: number }>;
  hasViewData: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  new: 'חדש',
  spoke: 'דיברנו',
  started_therapy: 'התחיל טיפול',
  ongoing: 'מטופל קבוע',
  irrelevant: 'לא רלוונטי',
};

function Trend({ now, prev }: { now: number; prev: number }) {
  if (now === prev) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-stone-400">
        <Minus className="w-3 h-3" aria-hidden="true" />
        ללא שינוי
      </span>
    );
  }
  const up = now > prev;
  const delta = prev === 0 ? null : Math.round(((now - prev) / prev) * 100);
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] ${
        up ? 'text-emerald-600' : 'text-rose-600'
      }`}
    >
      {up ? (
        <TrendingUp className="w-3 h-3" aria-hidden="true" />
      ) : (
        <TrendingDown className="w-3 h-3" aria-hidden="true" />
      )}
      {delta === null ? `${now - prev >= 0 ? '+' : ''}${now - prev}` : `${delta > 0 ? '+' : ''}${delta}%`}
    </span>
  );
}

export default function SitePulse() {
  const [data, setData] = useState<Insights | null>(null);

  useEffect(() => {
    fetch('/api/manage/insights')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && !d.error && setData(d))
      .catch(() => {});
  }, []);

  if (!data) return null;

  const leadStatuses = Object.entries(data.byStatus).sort((a, b) => b[1] - a[1]);

  return (
    <section aria-labelledby="pulse-heading" className="space-y-3 md:space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="pulse-heading" className="text-sm md:text-lg font-bold text-stone-800">
          מה קורה באתר
        </h2>
        <span className="text-[11px] md:text-xs text-stone-400">30 הימים האחרונים</span>
      </div>

      {/* Last 30 days, each against the 30 before it */}
      <div className="grid grid-cols-2 gap-2.5 md:gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-3.5 md:p-5">
          <div className="flex items-center gap-1.5 text-stone-400 mb-1">
            <Inbox className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="text-[11px] md:text-sm">פניות</span>
          </div>
          <p className="text-xl md:text-3xl font-bold text-stone-800 leading-none">{data.leads30}</p>
          <div className="mt-1">
            <Trend now={data.leads30} prev={data.leadsPrev30} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-3.5 md:p-5">
          <div className="flex items-center gap-1.5 text-stone-400 mb-1">
            <Mail className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="text-[11px] md:text-sm">נרשמו לרשימה</span>
          </div>
          <p className="text-xl md:text-3xl font-bold text-stone-800 leading-none">{data.subs30}</p>
          <div className="mt-1">
            <Trend now={data.subs30} prev={data.subsPrev30} />
          </div>
        </div>
      </div>

      {/* Reading. A counter, not a time series - see the API route. */}
      <div className="bg-white rounded-2xl border border-stone-200 p-3.5 md:p-5">
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-[11px] md:text-sm text-stone-500">קריאה באתר (מצטבר)</span>
          <span className="text-[11px] text-stone-400">{data.publishedCount} מאמרים</span>
        </div>
        {data.hasViewData ? (
          <>
            <div className="flex items-center gap-5">
              <span className="inline-flex items-baseline gap-1.5">
                <Eye className="w-4 h-4 text-stone-400 self-center" aria-hidden="true" />
                <span className="text-xl md:text-3xl font-bold text-stone-800 leading-none">
                  {data.totalViews}
                </span>
                <span className="text-[11px] text-stone-400">צפיות</span>
              </span>
              <span className="inline-flex items-baseline gap-1.5">
                <Heart className="w-4 h-4 text-stone-400 self-center" aria-hidden="true" />
                <span className="text-xl md:text-3xl font-bold text-stone-800 leading-none">
                  {data.totalLikes}
                </span>
                <span className="text-[11px] text-stone-400">לייקים</span>
              </span>
            </div>
            {data.top.length > 0 && (
              <div className="mt-3 pt-3 border-t border-stone-100 space-y-1.5">
                {data.top.slice(0, 3).map((a) => (
                  <Link
                    key={a.id}
                    href={`/manage/articles/edit/${a.id}`}
                    className="flex items-center gap-2 text-xs md:text-sm text-stone-600 hover:text-stone-900"
                  >
                    <span className="flex-1 min-w-0 line-clamp-1">{a.title}</span>
                    <span className="text-stone-400 flex-shrink-0">{a.views}</span>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs md:text-sm text-stone-500">
            אין עדיין צפיות שנספרו. המונה מתחיל לרוץ כשמבקרים קוראים מאמרים.
          </p>
        )}
      </div>

      {/* What became of the leads - the number that actually matters */}
      {leadStatuses.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-3.5 md:p-5">
          <p className="text-[11px] md:text-sm text-stone-500 mb-2.5">מה קרה עם הפניות</p>
          <div className="flex flex-wrap gap-1.5">
            {leadStatuses.map(([status, n]) => (
              <span
                key={status}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 text-[11px] md:text-xs"
              >
                {STATUS_LABELS[status] || status}
                <span className="font-bold">{n}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
