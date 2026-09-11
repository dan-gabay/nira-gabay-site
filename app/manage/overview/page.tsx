'use client';

import Link from 'next/link';
import { useManageSummary } from '@/components/manage/ManageShell';
import SitePulse from '@/components/manage/SitePulse';
import {
  Inbox,
  MessageSquare,
  FileText,
  Download,
  Plus,
  ArrowLeft,
  CheckCircle2,
  Mail,
} from 'lucide-react';

export default function ManageDashboard() {
  const { summary } = useManageSummary();

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

      <SitePulse />

    </div>
  );
}
