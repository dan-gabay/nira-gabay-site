'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useManageSummary } from '@/components/manage/ManageShell';
import { Kpi, one, pct, type Delta } from '@/components/manage/analytics/ui';
import type { Payload } from '@/components/manage/analytics/types';
import {
  Inbox,
  MousePointerClick,
  MessageSquare,
  FileText,
  Download,
  Plus,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

// The home screen of the admin, and where /manage lands. Two questions, in
// this order: what is waiting for me, and how is the site doing. Everything
// else is one tap away in its own section, so this page stays short.
//
// The period is 30 days for every figure here, because the lead outcomes
// (/api/manage/insights) are counted over 30 days - one period on one screen.

const RANGE = 30;

// The lead lifecycle in the order a lead moves through it. Paying clients
// (started_therapy, ongoing) are the outcome the site is judged by, so they
// are the ones drawn in colour.
const LEAD_STAGES: Array<{ key: string; label: string; tone: string }> = [
  { key: 'new', label: 'חדש', tone: 'bg-rose-50 text-rose-800 border-rose-200' },
  { key: 'spoke', label: 'דיברנו', tone: 'bg-stone-50 text-stone-700 border-stone-200' },
  { key: 'started_therapy', label: 'התחיל טיפול', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { key: 'ongoing', label: 'מטופל קבוע', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { key: 'irrelevant', label: 'לא רלוונטי', tone: 'bg-stone-50 text-stone-500 border-stone-200' },
];

type Insights = {
  leads30: number;
  leadsPrev30: number;
  byStatus: Record<string, number>;
};

export default function ManageHome() {
  const { summary } = useManageSummary();
  const [site, setSite] = useState<Payload | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/manage/analytics?range=${RANGE}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && d && !d.error && setSite(d))
      .catch(() => {});
    fetch('/api/manage/insights')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && d && !d.error && setInsights(d))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  // Only what actually needs a decision, most urgent first. New leads and
  // unconfirmed taps are told apart here (the nav badge adds them up).
  const newLeadRows = summary?.newLeadRows ?? summary?.newLeads ?? 0;
  const pendingIntents = summary?.pendingIntents ?? 0;
  const todo = [
    {
      count: newLeadRows,
      label: 'פניות חדשות',
      hint: 'ממתינות למענה ולסימון סטטוס',
      href: '/manage/contacts',
      icon: Inbox,
      tone: 'bg-rose-500',
    },
    {
      count: pendingIntents,
      label: 'לחיצות על יצירת קשר',
      hint: 'לסמן אם באמת הגיעה הודעה',
      href: '/manage/contacts',
      icon: MousePointerClick,
      tone: 'bg-amber-500',
    },
    {
      count: summary?.pendingComments ?? 0,
      label: 'תגובות לאישור',
      hint: 'לא מוצגות באתר עד שיאושרו',
      href: '/manage/comments',
      icon: MessageSquare,
      tone: 'bg-sky-500',
    },
    {
      count: summary?.drafts ?? 0,
      label: 'טיוטות',
      hint: 'מוכנות לבדיקה ופרסום',
      href: '/manage/articles?filter=draft',
      icon: FileText,
      tone: 'bg-stone-500',
    },
    {
      count: summary?.queuePending ?? 0,
      label: 'בתור הייבוא',
      hint: 'מאמרים שטרם הומרו',
      href: '/manage/articles?filter=queue',
      icon: Download,
      tone: 'bg-stone-400',
    },
  ].filter((t) => t.count > 0);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : hour < 21 ? 'ערב טוב' : 'לילה טוב';

  return (
    <div className="space-y-6 md:space-y-8 max-w-3xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-stone-800">{greeting}</h1>
          <p className="text-[12px] md:text-sm text-stone-500 mt-0.5">מה מחכה לך, ומה קרה באתר החודש.</p>
        </div>
        <Link
          href="/manage/articles/new"
          className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs md:text-sm font-medium transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          מאמר חדש
        </Link>
      </div>

      {/* ── Waiting for you ───────────────────────────────────── */}
      <section aria-labelledby="todo-heading" className="space-y-2.5 md:space-y-3">
        <h2 id="todo-heading" className="text-base md:text-lg font-bold text-stone-800">
          מחכה לך
        </h2>
        {!summary ? (
          <p className="text-sm text-stone-400">טוען...</p>
        ) : todo.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-4 md:p-5 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold text-stone-800 text-sm md:text-base">הכל מטופל</p>
              <p className="text-xs md:text-sm text-stone-500">אין פניות, תגובות או טיוטות שממתינות לך.</p>
            </div>
          </div>
        ) : (
          <ul className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 overflow-hidden">
            {todo.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-3 md:gap-4 p-3.5 md:p-4 hover:bg-stone-50 transition-colors"
                >
                  <span
                    className={`${item.tone} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}
                  >
                    <item.icon className="w-5 h-5 text-white" aria-hidden="true" />
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
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── How the site is doing ─────────────────────────────── */}
      <section aria-labelledby="month-heading" className="space-y-2.5 md:space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="month-heading" className="text-base md:text-lg font-bold text-stone-800">
            30 הימים האחרונים
          </h2>
          <Link
            href="/manage/analytics"
            className="inline-flex items-center gap-1 min-h-[44px] text-xs md:text-sm font-medium text-stone-600 hover:text-stone-900"
          >
            לכל הנתונים
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>

        <SiteFigures site={site} insights={insights} />
        <LeadOutcomes insights={insights} />
      </section>
    </div>
  );
}

// Three figures, each on its own line of meaning: who came, who reached for
// the phone or WhatsApp (a click, not yet an enquiry), and the enquiries that
// were actually logged. They are kept apart on purpose - a click on WhatsApp
// is not a conversation.
function SiteFigures({ site, insights }: { site: Payload | null; insights: Insights | null }) {
  if (!site && !insights) {
    return <p className="text-sm text-stone-400">טוען...</p>;
  }

  // Compare only against a previous window that was measured in full - the
  // same rule as the analytics page (a month against eight days read "+701%").
  // eslint-disable-next-line react-hooks/purity -- a render-time clock is what "now" means for the window.
  const prevStart = Date.now() - 2 * RANGE * 86_400_000;
  const prevComplete =
    Boolean(site?.first_event) && Date.parse(`${site?.first_event}T00:00:00+03:00`) <= prevStart;
  const d = (delta: NonNullable<Delta>): Delta => (prevComplete ? delta : null);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
      {insights && (
        <Kpi
          label="פניות שנרשמו"
          value={insights.leads30}
          delta={{ kind: 'count', now: insights.leads30, prev: insights.leadsPrev30 }}
          sub="טופס, וואטסאפ וטלפון שתועדו"
          accent="#e11d48"
        />
      )}
      {site && (
        <>
          <Kpi
            label="לחיצות ליצירת קשר"
            value={site.totals.conversions}
            delta={d({ kind: 'count', now: site.totals.conversions, prev: site.previous.conversions })}
            sub="וואטסאפ, טלפון, מייל וטופס"
          />
          <Kpi
            label="ביקורים"
            value={site.totals.visits.toLocaleString('he-IL')}
            delta={d({ kind: 'count', now: site.totals.visits, prev: site.previous.visits })}
            sub={`${site.totals.views.toLocaleString('he-IL')} צפיות בעמודים`}
          />
          <Kpi
            label="שיעור לחיצה"
            value={`${one(pct(site.totals.conversions, site.totals.visits))}%`}
            delta={
              site.previous.visits >= 20
                ? d({
                    kind: 'rate',
                    now: pct(site.totals.conversions, site.totals.visits),
                    prev: pct(site.previous.conversions, site.previous.visits),
                  })
                : null
            }
            sub="מתוך כל הביקורים"
          />
        </>
      )}
    </div>
  );
}

// What became of the leads: the number that actually matters. Shown as the
// lifecycle in order, so "how many became clients" reads at a glance.
function LeadOutcomes({ insights }: { insights: Insights | null }) {
  if (!insights) return null;
  const total = Object.values(insights.byStatus).reduce((a, n) => a + n, 0);
  if (total === 0) return null;
  const known = new Set(LEAD_STAGES.map((s) => s.key));
  const stages = [
    ...LEAD_STAGES,
    ...Object.keys(insights.byStatus)
      .filter((k) => !known.has(k))
      .map((k) => ({ key: k, label: k, tone: 'bg-stone-50 text-stone-600 border-stone-200' })),
  ].filter((s) => (insights.byStatus[s.key] ?? 0) > 0);
  const clients = (insights.byStatus.started_therapy ?? 0) + (insights.byStatus.ongoing ?? 0);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 md:p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="text-[13px] md:text-sm font-semibold text-stone-800">מה קרה עם הפניות</h3>
        <span className="text-[11px] md:text-xs text-stone-500">
          {clients} מתוך {total} התחילו טיפול
        </span>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {stages.map((s) => (
          <li
            key={s.key}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[12px] md:text-xs ${s.tone}`}
          >
            {s.label}
            <span className="font-bold tabular-nums">{insights.byStatus[s.key]}</span>
          </li>
        ))}
      </ul>
      {(insights.byStatus.new ?? 0) > 0 && (
        <p className="text-[11px] md:text-xs text-stone-500 mt-3">
          סימון סטטוס לכל פנייה ב
          <Link href="/manage/contacts" className="underline underline-offset-2 hover:text-stone-800">
            פניות
          </Link>{' '}
          הוא מה שמראה אילו מקורות מביאים מטופלים, ולא רק לחיצות.
        </p>
      )}
    </div>
  );
}
