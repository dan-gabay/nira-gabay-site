'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useManageSummary } from '@/components/manage/ManageShell';

// The content section's own tabs. Articles, their comments and the tags they
// are filed under are one area of work, so they share one slot in the main
// nav (מאמרים) and are switched here, at the top of each of the three pages.

const TABS = [
  { href: '/manage/articles', label: 'מאמרים', count: 'drafts' as const },
  { href: '/manage/comments', label: 'תגובות', count: 'pendingComments' as const },
  { href: '/manage/tags', label: 'תגיות', count: null },
];

export default function ContentTabs() {
  const pathname = usePathname();
  const { summary } = useManageSummary();

  return (
    <nav aria-label="תוכן" className="border-b border-stone-200 -mx-4 md:mx-0 px-4 md:px-0">
      <ul className="flex gap-1">
        {TABS.map((t) => {
          const active = pathname?.startsWith(t.href);
          const n = t.count && summary ? summary[t.count] : 0;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={`relative inline-flex items-center gap-1.5 min-h-[44px] px-3 md:px-4 text-sm font-medium transition-colors ${
                  active ? 'text-stone-900' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {t.label}
                {n > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-bold inline-flex items-center justify-center">
                    {n}
                  </span>
                )}
                {active && <span className="absolute bottom-[-1px] inset-x-2 h-0.5 bg-stone-900 rounded-full" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
