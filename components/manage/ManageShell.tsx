'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import TrackingToggle from '@/components/manage/TrackingToggle';
import { Home, Inbox, FileText, LogOut, BarChart3, type LucideIcon } from 'lucide-react';

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
      <div className="min-h-screen bg-stone-100">
        {/* Top bar. Desktop also carries the nav; mobile gets the tab bar below. */}
        <header className="sticky top-0 z-40 bg-white border-b border-stone-200">
          <div className="container mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between gap-4">
            <Link href="/manage" className="font-bold text-stone-800 text-sm md:text-base whitespace-nowrap">
              ניהול האתר
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {NAV.map((item) => {
                const badge = summary ? item.badge(summary) : 0;
                const active = isActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`relative inline-flex items-center gap-2 px-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                      active ? 'bg-stone-800 text-white' : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <item.icon className="w-4 h-4" aria-hidden="true" />
                    {item.label}
                    {badge > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-bold inline-flex items-center justify-center">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-1">
              <TrackingToggle />
              <Link
                href="/"
                target="_blank"
                className="hidden sm:inline-flex items-center px-3 min-h-[44px] rounded-lg text-xs md:text-sm text-stone-600 hover:bg-stone-100"
              >
                לאתר
              </Link>
              <form action="/api/manage/logout" method="post">
                <button
                  type="submit"
                  aria-label="יציאה"
                  className="inline-flex items-center gap-1.5 px-3 min-h-[44px] rounded-lg text-xs md:text-sm text-stone-500 hover:bg-stone-100"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">יציאה</span>
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* pb clears the mobile tab bar */}
        <main id="main-content" className="container mx-auto px-4 md:px-6 py-4 md:py-8 pb-24 md:pb-8">{children}</main>

        {/* Mobile tab bar - thumb-reachable, always one tap between sections.
            The column count is derived from NAV, so adding a section can never
            wrap one onto a second row under Safari's own bottom bar. */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-stone-200 pb-[env(safe-area-inset-bottom)]"
          aria-label="ניווט ניהול"
        >
          <div className="grid" style={{ gridTemplateColumns: `repeat(${NAV.length}, minmax(0, 1fr))` }}>
            {NAV.map((item) => {
              const badge = summary ? item.badge(summary) : 0;
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
                    {badge > 0 && (
                      <span className="absolute -top-1.5 -left-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold inline-flex items-center justify-center">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </span>
                  {item.label}
                  {active && <span className="absolute top-0 inset-x-2 h-0.5 bg-stone-900 rounded-full" />}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </SummaryContext.Provider>
  );
}
