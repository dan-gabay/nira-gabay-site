'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { LayoutDashboard, Inbox, FileText, MessageSquare, Tag, LogOut, BarChart3 } from 'lucide-react';

export type ManageSummary = {
  newLeads: number;
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

const NAV = [
  { href: '/manage', label: 'בקרה', icon: LayoutDashboard, badge: null },
  { href: '/manage/contacts', label: 'פניות', icon: Inbox, badge: 'newLeads' },
  { href: '/manage/articles', label: 'מאמרים', icon: FileText, badge: 'drafts' },
  { href: '/manage/comments', label: 'תגובות', icon: MessageSquare, badge: 'pendingComments' },
  { href: '/manage/analytics', label: 'נתונים', icon: BarChart3, badge: null },
  { href: '/manage/tags', label: 'תגיות', icon: Tag, badge: null },
] as const;

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

  const isActive = (href: string) =>
    href === '/manage' ? pathname === '/manage' : pathname?.startsWith(href);

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
                const badge = item.badge ? summary?.[item.badge] ?? 0 : 0;
                const active = isActive(item.href);
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

        {/* Mobile tab bar - thumb-reachable, always one tap between sections */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-stone-200 pb-[env(safe-area-inset-bottom)]"
          aria-label="ניווט ניהול"
        >
          <div className="grid grid-cols-5">
            {NAV.map((item) => {
              const badge = item.badge ? summary?.[item.badge] ?? 0 : 0;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[56px] text-[11px] font-medium transition-colors ${
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
