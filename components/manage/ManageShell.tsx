'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import TrackingToggle from '@/components/manage/TrackingToggle';
import { Home, Inbox, FileText, LogOut, BarChart3, ExternalLink, type LucideIcon } from 'lucide-react';

export type ManageSummary = {
  /** Leads awaiting classification PLUS taps awaiting confirmation: both are
   *  cleared on /manage/contacts, so the badge counts them together. */
  newLeads: number;
  newLeadRows?: number;
  pendingIntents?: number;
  totalLeads: number;
  pendingComments: number;
  drafts: number;
  published: number;
  queuePending: number;
  subscribers: number;
};

// Shared so the dashboard can render the same counts the nav badges use
// without fetching them a second time.
const SummaryContext = createContext<{
  summary: ManageSummary | null;
  refresh: () => void;
}>({ summary: null, refresh: () => {} });

export const useManageSummary = () => useContext(SummaryContext);

// Four sections, not six. Comments and tags are part of the content work, so
// they live as tabs inside מאמרים (ContentTabs) instead of taking a slot of
// the same weight as the enquiries; the מאמרים badge counts what waits there.
// `also` lists the other paths that belong to a section, for the active state.
const NAV: ReadonlyArray<{
  href: string;
  label: string;
  icon: LucideIcon;
  badge: (s: ManageSummary) => number;
  also?: string[];
}> = [
  { href: '/manage/overview', label: 'בית', icon: Home, badge: () => 0 },
  { href: '/manage/contacts', label: 'פניות', icon: Inbox, badge: (s) => s.newLeads },
  {
    href: '/manage/articles',
    label: 'מאמרים',
    icon: FileText,
    badge: (s) => s.drafts + s.pendingComments,
    also: ['/manage/comments', '/manage/tags'],
  },
  { href: '/manage/analytics', label: 'נתונים', icon: BarChart3, badge: () => 0 },
];

function Badge({ n, small = false }: { n: number; small?: boolean }) {
  if (n <= 0) return null;
  return (
    <span
      className={`rounded-full bg-rose-500 text-white font-bold inline-flex items-center justify-center tabular-nums ${
        small ? 'min-w-[16px] h-4 px-1 text-[10px]' : 'min-w-[20px] h-5 px-1.5 text-[11px]'
      }`}
    >
      {n > 99 ? '99+' : n}
    </span>
  );
}

// Layout: on a laptop a sidebar at the start edge (right, in Hebrew) carries
// the sections and the few account-level controls, so the page itself starts
// at the top of the screen. On a phone a slim top bar and a thumb-reachable
// tab bar at the bottom do the same job.
export default function ManageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [summary, setSummary] = useState<ManageSummary | null>(null);

  const refresh = useCallback(() => {
    fetch('/api/manage/summary')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && !d.error && setSummary(d))
      .catch(() => {
        // The shell stays usable without badge counts
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  // The login screen is its own thing - no nav, no chrome.
  if (pathname?.startsWith('/manage/login')) {
    return <>{children}</>;
  }

  // Every nav href is a real subpath, so a plain prefix test is correct.
  // '/manage' itself only redirects to /manage/overview and is never rendered.
  const isActive = (item: (typeof NAV)[number]) =>
    [item.href, ...(item.also ?? [])].some((p) => pathname?.startsWith(p));

  return (
    <SummaryContext.Provider value={{ summary, refresh }}>
      <div className="min-h-screen bg-stone-100 lg:flex">
        {/* ── Sidebar (laptop) ─────────────────────────────────── */}
        <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:flex-shrink-0 lg:sticky lg:top-0 lg:h-screen bg-white border-e border-stone-200">
          <Link href="/manage" className="px-5 pt-6 pb-5 block">
            <span className="block font-bold text-stone-900 text-base leading-tight">נירה גבאי</span>
            <span className="block text-xs text-stone-500 mt-0.5">ניהול האתר</span>
          </Link>

          <nav aria-label="ניווט ניהול" className="px-3 flex-1">
            <ul className="space-y-0.5">
              {NAV.map((item) => {
                const active = isActive(item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-3 px-3 min-h-[44px] rounded-xl text-sm font-medium transition-colors ${
                        active ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                      }`}
                    >
                      <item.icon className="w-[18px] h-[18px] flex-shrink-0" aria-hidden="true" />
                      <span className="flex-1">{item.label}</span>
                      <Badge n={summary ? item.badge(summary) : 0} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="p-3 space-y-1 border-t border-stone-100">
            <TrackingToggle wide />
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-3 px-3 min-h-[40px] rounded-lg text-sm text-stone-600 hover:bg-stone-100"
            >
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
              לאתר
            </Link>
            <form action="/api/manage/logout" method="post">
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-3 min-h-[40px] rounded-lg text-sm text-stone-500 hover:bg-stone-100"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                יציאה
              </button>
            </form>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {/* ── Top bar (phone and tablet) ─────────────────────── */}
          <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-200">
            <div className="px-4 md:px-6 h-14 flex items-center justify-between gap-3">
              <Link href="/manage" className="font-bold text-stone-900 text-sm whitespace-nowrap">
                ניהול האתר
              </Link>
              <div className="flex items-center gap-1">
                <TrackingToggle />
                <Link
                  href="/"
                  target="_blank"
                  aria-label="לאתר"
                  className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-stone-500 hover:bg-stone-100"
                >
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                </Link>
                <form action="/api/manage/logout" method="post">
                  <button
                    type="submit"
                    aria-label="יציאה"
                    className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-stone-500 hover:bg-stone-100"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                  </button>
                </form>
              </div>
            </div>
          </header>

          {/* pb clears the phone tab bar */}
          <main id="main-content" className="max-w-6xl mx-auto px-4 md:px-6 lg:px-10 py-5 md:py-8 pb-24 lg:pb-10">
            {children}
          </main>
        </div>

        {/* ── Tab bar (phone and tablet) ─────────────────────────
            The column count is derived from NAV, so adding a section can
            never wrap one onto a second row under Safari's own bottom bar. */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-stone-200 pb-[env(safe-area-inset-bottom)]"
          aria-label="ניווט ניהול"
        >
          <div className="grid" style={{ gridTemplateColumns: `repeat(${NAV.length}, minmax(0, 1fr))` }}>
            {NAV.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[56px] px-0.5 text-[11px] font-medium leading-tight text-center whitespace-nowrap transition-colors ${
                    active ? 'text-stone-900' : 'text-stone-400'
                  }`}
                >
                  <span className="relative">
                    <item.icon className="w-5 h-5" aria-hidden="true" />
                    <span className="absolute -top-1.5 -left-2.5">
                      <Badge n={summary ? item.badge(summary) : 0} small />
                    </span>
                  </span>
                  {item.label}
                  {active && <span className="absolute top-0 inset-x-4 h-0.5 bg-stone-900 rounded-full" />}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </SummaryContext.Provider>
  );
}
