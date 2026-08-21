'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useManageSummary } from '@/components/manage/ManageShell';
import {
  Inbox,
  MessageSquare,
  FileText,
  Download,
  Plus,
  Eye,
  Heart,
  ArrowLeft,
  CheckCircle2,
  Mail,
} from 'lucide-react';

type TopArticle = {
  id: string;
  title: string;
  slug: string;
  views_count: number;
  likes_count: number;
};

export default function ManageDashboard() {
  const { summary } = useManageSummary();
  const [topArticles, setTopArticles] = useState<TopArticle[]>([]);

  useEffect(() => {
    supabase
      .from('articles')
      .select('id, title, slug, views_count, likes_count')
      .eq('is_published', true)
      .order('views_count', { ascending: false })
      .limit(5)
      .then(({ data }) => setTopArticles(data || []));
  }, []);

  // Only what actually needs a decision today, newest concern first.
  const todo = [
    {
      count: summary?.newLeads ?? 0,
      label: 'פניות חדשות',
      cta: 'למענה',
      hint: 'ממתינות למענה',
      href: '/manage/contacts',
      icon: Inbox,
      tone: 'bg-rose-500',
    },
    {
      count: summary?.pendingComments ?? 0,
      label: 'תגובות לאישור',
      cta: 'לאישור',
      hint: 'לא מוצגות באתר עד שיאושרו',
      href: '/manage/comments',
      icon: MessageSquare,
      tone: 'bg-amber-500',
    },
    {
      count: summary?.drafts ?? 0,
      label: 'טיוטות',
      cta: 'לטיוטות',
      hint: 'מוכנות לבדיקה ופרסום',
      href: '/manage/articles?filter=draft',
      icon: FileText,
      tone: 'bg-sky-500',
    },
    {
      count: summary?.queuePending ?? 0,
      label: 'בתור הייבוא',
      cta: 'לתור',
      hint: 'מאמרים שטרם הומרו',
      href: '/manage/articles',
      icon: Download,
      tone: 'bg-stone-500',
    },
  ].filter((t) => t.count > 0);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : hour < 21 ? 'ערב טוב' : 'לילה טוב';

  // The most urgent open item leads the page; everything else follows it.
  const lead = todo[0];
  const headline = !summary
    ? 'טוען...'
    : lead
      ? `${lead.count} ${lead.label} ${lead.hint}`
      : 'אין משימות פתוחות. האתר מתוחזק.';

  const stats = [
    { label: 'מאמרים באתר', value: summary?.published, icon: FileText },
    { label: 'סה"כ פניות', value: summary?.totalLeads, icon: Inbox },
    { label: 'נרשמו לרשימה', value: summary?.subscribers, icon: Mail },
  ];

  return (
    <div className="space-y-5 md:space-y-8">
      {/* The one thing that matters most, stated rather than implied. */}
      <div className="rounded-2xl bg-stone-800 text-white p-4 md:p-6">
        <p className="text-[11px] md:text-sm text-white/60">{greeting}</p>
        <p className="text-base md:text-2xl font-bold mt-1 leading-snug">{headline}</p>
        {lead && (
          <Link
            href={lead.href}
            className="mt-3 inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-white text-stone-900 text-sm font-medium hover:bg-stone-100 transition-colors"
          >
            {lead.cta}
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </Link>
        )}
      </div>

      {/* ── Needs attention ───────────────────────────────────── */}
      {summary && (todo.length !== 1) && (
        <section aria-labelledby="todo-heading">
          <h2 id="todo-heading" className="sr-only">
            דורש טיפול
          </h2>
          {todo.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-5 md:p-6 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 md:w-7 md:h-7 text-emerald-600 flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold text-stone-800 text-sm md:text-base">הכל מטופל</p>
                <p className="text-xs md:text-sm text-stone-500">
                  אין פניות, תגובות או טיוטות שממתינות לך.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 md:space-y-3">
              {todo.slice(1).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-3 md:gap-4 bg-white rounded-2xl border border-stone-200 p-3.5 md:p-5 hover:border-stone-300 hover:shadow-sm transition-all"
                >
                  <span
                    className={`${item.tone} w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0`}
                  >
                    <item.icon className="w-5 h-5 md:w-6 md:h-6 text-white" aria-hidden="true" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-stone-800 text-sm md:text-base">
                      {item.count} {item.label}
                    </span>
                    <span className="block text-xs md:text-sm text-stone-500">{item.hint}</span>
                  </span>
                  <ArrowLeft
                    className="w-4 h-4 md:w-5 md:h-5 text-stone-400 flex-shrink-0 group-hover:-translate-x-0.5 transition-transform"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Quick actions ─────────────────────────────────────── */}
      <section aria-labelledby="actions-heading">
        <h2 id="actions-heading" className="text-sm md:text-lg font-bold text-stone-800 mb-2.5 md:mb-4">
          פעולות מהירות
        </h2>
        <div className="grid grid-cols-2 gap-2.5 md:gap-3">
          <Link
            href="/manage/articles/new"
            className="inline-flex items-center justify-center gap-2 min-h-[52px] rounded-xl bg-stone-800 text-white text-sm md:text-base font-medium hover:bg-stone-900 transition-colors"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
            מאמר חדש
          </Link>
          <Link
            href="/manage/contacts"
            className="inline-flex items-center justify-center gap-2 min-h-[52px] rounded-xl bg-white border border-stone-300 text-stone-700 text-sm md:text-base font-medium hover:bg-stone-50 transition-colors"
          >
            <Inbox className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
            כל הפניות
          </Link>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────── */}
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          מספרים
        </h2>
        <div className="grid grid-cols-3 gap-2.5 md:gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl border border-stone-200 p-3 md:p-5 text-center"
            >
              <s.icon className="w-4 h-4 md:w-5 md:h-5 text-stone-400 mx-auto mb-1.5" aria-hidden="true" />
              <p className="text-lg md:text-2xl font-bold text-stone-800 leading-none">
                {s.value ?? '–'}
              </p>
              <p className="text-[11px] md:text-sm text-stone-500 mt-1 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Most read ─────────────────────────────────────────── */}
      {topArticles.length > 0 && (
        <section aria-labelledby="top-heading">
          <h2 id="top-heading" className="text-sm md:text-lg font-bold text-stone-800 mb-2.5 md:mb-4">
            הנקראים ביותר
          </h2>
          <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 overflow-hidden">
            {topArticles.map((a, i) => (
              <Link
                key={a.id}
                href={`/manage/articles/edit/${a.id}`}
                className="flex items-center gap-3 p-3 md:p-4 hover:bg-stone-50 transition-colors"
              >
                <span className="w-6 text-center text-xs md:text-sm font-bold text-stone-300 flex-shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 min-w-0 text-sm md:text-base text-stone-800 font-medium line-clamp-1">
                  {a.title}
                </span>
                <span className="flex items-center gap-2.5 text-[11px] md:text-sm text-stone-500 flex-shrink-0">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    {a.views_count || 0}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" aria-hidden="true" />
                    {a.likes_count || 0}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
