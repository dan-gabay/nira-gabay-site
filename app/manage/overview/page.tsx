'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useManageSummary } from '@/components/manage/ManageShell';
import PageHeader from '@/components/manage/PageHeader';
import { DeltaBadge, one, pct, type Delta } from '@/components/manage/analytics/ui';
import type { Payload } from '@/components/manage/analytics/types';
import { fillDays, SOURCE_SERIES } from '@/components/manage/Charts';
import { GROUP_LABELS } from '@/components/manage/TrafficSources';
import {
  CHANNEL_LABELS,
  leadStatus,
  patchLead,
  timeAgo,
  waNumber,
  type ContactMessage,
  type LeadStatus,
} from '@/components/manage/leads';
import {
  MousePointerClick,
  MessageSquare,
  FileText,
  Download,
  Plus,
  ArrowLeft,
  CheckCircle2,
  MessageCircle,
  Check,
  X,
} from 'lucide-react';

// The home screen of the admin, and where /manage lands. Two questions, in
// this order: what is waiting for me, and how is the site doing.
//
// New enquiries are handled right here - reply on WhatsApp, then one tap for
// what happened - so the most common visit to the admin ends on this screen.
// Everything else waiting is a row that links to where it is done. The month
// is three figures, the lead funnel, and where the visits came from; the full
// analytics are one tap away.
//
// The period is 30 days for every figure here, because the lead outcomes
// (/api/manage/insights) are counted over 30 days - one period on one screen.

const RANGE = 30;
const TRIAGE_SHOWN = 4;

type Insights = {
  leads30: number;
  leadsPrev30: number;
  byStatus: Record<string, number>;
};

export default function ManageHome() {
  const { summary, refresh } = useManageSummary();
  const [site, setSite] = useState<Payload | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [leads, setLeads] = useState<ContactMessage[] | null>(null);

  useEffect(() => {
    let live = true;
    const get = <T,>(url: string, set: (d: T) => void) =>
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => live && d && !d.error && set(d))
        .catch(() => {});
    get<Payload>(`/api/manage/analytics?range=${RANGE}`, setSite);
    get<Insights>('/api/manage/insights', setInsights);
    get<{ messages: ContactMessage[] }>('/api/manage/contacts', (d) => setLeads(d.messages || []));
    return () => {
      live = false;
    };
  }, []);

  const newLeads = (leads ?? []).filter((m) => leadStatus(m) === 'new');

  async function setStatus(id: string, status: LeadStatus) {
    const before = leads;
    setLeads((prev) => prev && prev.map((m) => (m.id === id ? { ...m, status } : m)));
    try {
      await patchLead(id, { status });
      refresh();
    } catch {
      setLeads(before);
      alert('שגיאה בעדכון הפנייה');
    }
  }

  async function markRead(id: string) {
    setLeads((prev) => prev && prev.map((m) => (m.id === id ? { ...m, is_read: true } : m)));
    patchLead(id, { is_read: true }).catch(() => {});
  }

  // Everything else that waits for a decision, most urgent first.
  const tasks = [
    {
      count: summary?.pendingIntents ?? 0,
      label: 'לחיצות על יצירת קשר',
      hint: 'לסמן אם באמת הגיעה הודעה',
      href: '/manage/contacts',
      icon: MousePointerClick,
      tone: 'bg-amber-100 text-amber-800',
    },
    {
      count: summary?.pendingComments ?? 0,
      label: 'תגובות לאישור',
      hint: 'לא מוצגות באתר עד שיאושרו',
      href: '/manage/comments',
      icon: MessageSquare,
      tone: 'bg-sky-100 text-sky-800',
    },
    {
      count: summary?.drafts ?? 0,
      label: 'טיוטות',
      hint: 'מוכנות לבדיקה ופרסום',
      href: '/manage/articles?filter=draft',
      icon: FileText,
      tone: 'bg-stone-200 text-stone-700',
    },
    {
      count: summary?.queuePending ?? 0,
      label: 'בתור הייבוא',
      hint: 'מאמרים שטרם הומרו',
      href: '/manage/articles?filter=queue',
      icon: Download,
      tone: 'bg-stone-100 text-stone-500',
    },
  ].filter((t) => t.count > 0);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : hour < 21 ? 'ערב טוב' : 'לילה טוב';
  const loaded = summary && leads;
  const nothingWaiting = loaded && newLeads.length === 0 && tasks.length === 0;

  return (
    <>
      <PageHeader
        title={greeting}
        sub={now.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/manage/new-lead"
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              פנייה חדשה
            </Link>
            <Link
              href="/manage/articles/new"
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              מאמר חדש
            </Link>
          </div>
        }
      />

      <div className="grid gap-5 md:gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
        {/* ── Waiting for you ───────────────────────────────────── */}
        <section aria-labelledby="todo-heading" className="space-y-3">
          <h2 id="todo-heading" className="text-base md:text-lg font-bold text-stone-900">
            מחכה לך
          </h2>

          {!loaded ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-6 text-sm text-stone-400">טוען...</div>
          ) : nothingWaiting ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-5 flex items-center gap-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold text-stone-900">הכל מטופל</p>
                <p className="text-sm text-stone-500">אין פניות, תגובות או טיוטות שממתינות לך.</p>
              </div>
            </div>
          ) : (
            <>
              {newLeads.length > 0 && (
                <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 md:px-5 pt-4 pb-2">
                    <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" aria-hidden="true" />
                      {newLeads.length === 1 ? 'פנייה חדשה' : `${newLeads.length} פניות חדשות`}
                    </h3>
                    <Link href="/manage/contacts" className="text-[13px] font-medium text-stone-500 hover:text-stone-900 inline-flex items-center gap-1 min-h-[36px]">
                      לכל הפניות
                      <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                  <ul className="divide-y divide-stone-100">
                    {newLeads.slice(0, TRIAGE_SHOWN).map((m) => (
                      <TriageRow
                        key={m.id}
                        lead={m}
                        onStatus={(s) => setStatus(m.id, s)}
                        onReply={() => !m.is_read && markRead(m.id)}
                      />
                    ))}
                  </ul>
                  {newLeads.length > TRIAGE_SHOWN && (
                    <Link
                      href="/manage/contacts"
                      className="block text-center text-[13px] font-medium text-stone-600 hover:bg-stone-50 border-t border-stone-100 py-3"
                    >
                      עוד {newLeads.length - TRIAGE_SHOWN} פניות חדשות
                    </Link>
                  )}
                </div>
              )}

              {tasks.length > 0 && (
                <ul className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 overflow-hidden">
                  {tasks.map((t) => (
                    <li key={t.label}>
                      <Link href={t.href} className="group flex items-center gap-3 px-4 md:px-5 py-3.5 hover:bg-stone-50 transition-colors">
                        <span className={`${t.tone} w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <t.icon className="w-[18px] h-[18px]" aria-hidden="true" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-stone-900">
                            {t.count} {t.label}
                          </span>
                          <span className="block text-[13px] text-stone-500">{t.hint}</span>
                        </span>
                        <ArrowLeft
                          className="w-4 h-4 text-stone-400 flex-shrink-0 group-hover:-translate-x-0.5 transition-transform"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        {/* ── The month ─────────────────────────────────────────── */}
        <section aria-labelledby="month-heading" className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="month-heading" className="text-base md:text-lg font-bold text-stone-900">
              30 הימים האחרונים
            </h2>
            <Link
              href="/manage/analytics"
              className="inline-flex items-center gap-1 min-h-[36px] text-[13px] font-medium text-stone-500 hover:text-stone-900"
            >
              לכל הנתונים
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          <LeadFunnel insights={insights} />
          <SiteFigures site={site} />
          <TopSources site={site} />
        </section>
      </div>
    </>
  );
}

// One new enquiry, handled in place: what they wrote, reply on WhatsApp,
// then one tap for what happened. Anything more is in the inbox.
function TriageRow({
  lead: m,
  onStatus,
  onReply,
}: {
  lead: ContactMessage;
  onStatus: (s: LeadStatus) => void;
  onReply: () => void;
}) {
  const wa = waNumber(m.phone);
  return (
    <li className="px-4 md:px-5 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <Link href={`/manage/contacts?lead=${encodeURIComponent(m.id)}`} className="font-semibold text-stone-900 text-sm hover:underline underline-offset-2 truncate">
          {m.name}
        </Link>
        <span className="text-[11px] text-stone-400 flex-shrink-0">
          {timeAgo(m.created_date)}
          {m.channel && ` · ${CHANNEL_LABELS[m.channel] || m.channel}`}
        </span>
      </div>
      {m.message && <p className="text-[13px] text-stone-600 mt-1 line-clamp-2 leading-relaxed">{m.message}</p>}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {wa && (
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onReply}
            className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-[13px] font-medium transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
            וואטסאפ
          </a>
        )}
        <button
          type="button"
          onClick={() => onStatus('spoke')}
          className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 text-[13px] font-medium transition-colors"
        >
          <Check className="w-3.5 h-3.5" aria-hidden="true" />
          דיברנו
        </button>
        <button
          type="button"
          onClick={() => onStatus('irrelevant')}
          className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 text-[13px] font-medium transition-colors"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
          לא רלוונטי
        </button>
      </div>
    </li>
  );
}

// What became of the month's enquiries - the number the site is judged by.
// Each bar is a share of the enquiries logged; the clients bar is the outcome.
function LeadFunnel({ insights }: { insights: Insights | null }) {
  if (!insights) return <div className="bg-white rounded-2xl border border-stone-200 p-5 text-sm text-stone-400">טוען...</div>;
  const s = insights.byStatus;
  const total = Object.values(s).reduce((a, n) => a + n, 0);
  const clients = (s.started_therapy ?? 0) + (s.ongoing ?? 0);
  const talked = (s.spoke ?? 0) + clients;
  const open = s.new ?? 0;
  const irrelevant = s.irrelevant ?? 0;
  const delta: Delta = { kind: 'count', now: insights.leads30, prev: insights.leadsPrev30 };

  const rows = [
    { label: 'פניות', n: total, color: 'bg-stone-300' },
    { label: 'דיברנו איתם', n: talked, color: 'bg-amber-400' },
    { label: 'התחילו טיפול', n: clients, color: 'bg-emerald-500' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 md:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-stone-900">מה קרה עם הפניות</h3>
        <DeltaBadge delta={delta} />
      </div>
      {total === 0 ? (
        <p className="text-sm text-stone-500 mt-3">לא נרשמו פניות בחודש האחרון.</p>
      ) : (
        <>
          <ul className="mt-3 space-y-2.5">
            {rows.map((r) => (
              <li key={r.label}>
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="text-stone-600">{r.label}</span>
                  <span className="font-bold text-stone-900 tabular-nums">{r.n}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-stone-100 overflow-hidden">
                  <div className={`h-full rounded-full ${r.color}`} style={{ width: `${total ? (r.n / total) * 100 : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="text-[12px] text-stone-500 mt-3">
            {irrelevant > 0 && `${irrelevant} לא רלוונטיות`}
            {irrelevant > 0 && open > 0 && ' · '}
            {open > 0 && (
              <>
                {open} עוד בלי סטטוס.{' '}
                <Link href="/manage/contacts" className="underline underline-offset-2 hover:text-stone-800">
                  לסמן
                </Link>
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}

// Visits and contact clicks, each with its 30-day shape. A click on WhatsApp
// is not an enquiry, so it is named a click here and kept apart from the
// funnel above.
function SiteFigures({ site }: { site: Payload | null }) {
  if (!site) return null;

  // Compare only against a previous window that was measured in full - the
  // same rule as the analytics page (a month against eight days read "+701%").
  // eslint-disable-next-line react-hooks/purity -- a render-time clock is what "now" means for the window.
  const prevStart = Date.now() - 2 * RANGE * 86_400_000;
  const prevComplete = Boolean(site.first_event) && Date.parse(`${site.first_event}T00:00:00+03:00`) <= prevStart;
  const d = (delta: NonNullable<Delta>): Delta => (prevComplete ? delta : null);
  const days = fillDays(site.daily || [], RANGE);
  const rate = pct(site.totals.conversions, site.totals.visits);

  return (
    <div className="grid grid-cols-2 gap-3">
      <Figure
        label="ביקורים"
        value={site.totals.visits.toLocaleString('he-IL')}
        delta={d({ kind: 'count', now: site.totals.visits, prev: site.previous.visits })}
        series={days.map((p) => p.visits)}
        color="#0D9488"
      />
      <Figure
        label="לחיצות ליצירת קשר"
        value={String(site.totals.conversions)}
        sub={`${one(rate)}% מהביקורים`}
        delta={d({ kind: 'count', now: site.totals.conversions, prev: site.previous.conversions })}
        series={days.map((p) => p.conversions)}
        color="#c2410c"
      />
    </div>
  );
}

function Figure({
  label,
  value,
  sub,
  delta,
  series,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  delta: Delta;
  series: number[];
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 min-w-0">
      <p className="text-[12px] text-stone-500 truncate">{label}</p>
      <p className="mt-1 flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl md:text-[28px] font-bold text-stone-900 leading-none tabular-nums">{value}</span>
        <DeltaBadge delta={delta} />
      </p>
      {sub && <p className="text-[11px] text-stone-400 mt-1">{sub}</p>}
      <Sparkline values={series} color={color} />
    </div>
  );
}

// The shape of a month in 32px. Time runs left to right, as in every chart
// on the analytics page.
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const w = 120;
  const h = 32;
  const max = Math.max(1, ...values);
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => [i * step, h - 2 - (v / max) * (h - 4)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8 mt-2" preserveAspectRatio="none" aria-hidden="true">
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={color} opacity={0.08} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// Where the month's visits came from, and which of them reached for the phone.
function TopSources({ site }: { site: Payload | null }) {
  const rows = (site?.engagement_by_source || []).filter((r) => r.visits > 0).sort((a, b) => b.visits - a.visits).slice(0, 4);
  if (!site || rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.visits));
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 md:p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-stone-900">מאיפה הגיעו</h3>
        <span className="text-[11px] text-stone-400">ביקורים · לחיצות</span>
      </div>
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.grp}>
            <div className="flex items-baseline justify-between gap-2 text-[13px]">
              <span className="text-stone-700 truncate">{GROUP_LABELS[r.grp] || r.grp}</span>
              <span className="tabular-nums text-stone-500 flex-shrink-0">
                <strong className="text-stone-900">{r.visits.toLocaleString('he-IL')}</strong> · {r.conversions}
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-stone-100 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${(r.visits / max) * 100}%`, background: SOURCE_SERIES[r.grp] || '#a8a29e' }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
