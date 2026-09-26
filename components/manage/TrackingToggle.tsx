'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { isOptedOut, setOptedOut } from '@/lib/ownerOptOut';

// The owner's "don't count me" switch (lib/ownerOptOut.ts). It sits in the
// admin header so it is one tap away on every device - the cookie is per
// browser, so the phone and the laptop are each switched on their own.
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export default function TrackingToggle() {
  // Server snapshot null: unknown until the browser reads its own cookie, and
  // rendered as nothing rather than as a guess that could flip on hydration.
  const off = useSyncExternalStore(subscribe, isOptedOut, () => null);

  // Renew on every admin visit: browsers cap cookie lifetime at ~400 days,
  // and a switch that silently expires would start counting the owner again.
  useEffect(() => {
    if (off) setOptedOut(true);
  }, [off]);

  if (off === null) return null;

  const toggle = () => {
    setOptedOut(!off);
    listeners.forEach((fn) => fn());
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={off}
      title={
        off
          ? 'הגלישה שלך באתר מהמכשיר הזה לא נשמרת בנתונים. לחיצה תחזיר את הספירה.'
          : 'הגלישה שלך באתר מהמכשיר הזה נספרת בנתונים כמו של כל מבקר. לחיצה תפסיק את הספירה.'
      }
      className={`inline-flex items-center gap-1.5 px-3 min-h-[44px] rounded-lg text-xs md:text-sm font-medium transition-colors ${
        off
          ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
          : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
      }`}
    >
      {off ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
      <span>{off ? 'לא נספר' : 'נספר'}</span>
      <span className="hidden lg:inline">{off ? 'בנתונים' : 'בנתונים - לכבות?'}</span>
    </button>
  );
}
