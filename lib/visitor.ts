// Is this the same person coming back, and how long have they been circling?
//
// Why not the IP address, which is the usual answer: this site's traffic is
// ~76% mobile, and Israeli carriers put thousands of subscribers behind one
// CGNAT address, so two strangers share an IP while one person on home wifi,
// cellular and office wifi looks like three. Home addresses rotate, a
// household shares one, and iCloud Private Relay hides it by default for
// iCloud+ users on iPhone. It would merge different people and split the same
// one, in both directions at once.
//
// A random first-party number does the job properly and is the safer object to
// hold: it identifies nobody, it is ours to expire, and nobody outside can tie
// it back to a subscriber the way an IP can. lib/attribution.ts already
// established this pattern here - localStorage, 90 days, bounded.
//
// WHAT WAS ALREADY HERE, AND WRONG. lib/analytics.ts identifyVisitorType() has
// been keeping a `visit_count` in localStorage since before this file existed.
// Two things were wrong with it. It was called from an effect keyed on
// `pathname`, so it incremented on every in-page navigation - someone who read
// three articles in one sitting was recorded as being on their third visit. And
// it was handed to GA4 through setUserProperty() and nowhere else, so the
// first-party dashboard never saw it. Both are fixed by routing everything
// through this module.

const KEY = 'visitor_v1';
const SESSION_FLAG = 'visit_counted_v1';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Same window as lead attribution, so nothing here outlives a lead's context. */
export const MAX_AGE_MS = 90 * DAY_MS;

export type VisitorState = {
  /** 1 on the first visit. Counts visits, not page views. */
  visit: number;
  /** Epoch ms of the first visit inside the current 90-day window. */
  first: number;
};

function read(now: number): VisitorState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VisitorState;
    if (typeof parsed?.visit !== 'number' || typeof parsed?.first !== 'number') return null;
    // Past the window the slate is wiped and the person counts as new again.
    if (now - parsed.first > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null; // private mode, storage disabled - measurement is best effort
  }
}

/**
 * The visitor's state, counting the current browser session exactly once.
 *
 * The once-per-session guard is a sessionStorage flag, which is the same
 * lifetime the session id itself uses - it dies with the tab. That is what
 * makes this a visit counter rather than a page-view counter, no matter how
 * many times or from where it gets called.
 *
 * Returns null when storage is unavailable, and callers send nothing rather
 * than guessing.
 */
export function visitorState(now: number = Date.now()): VisitorState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = read(now) ?? { visit: 0, first: now };
    if (sessionStorage.getItem(SESSION_FLAG) === '1') return stored;

    const next: VisitorState = { visit: stored.visit + 1, first: stored.first };
    localStorage.setItem(KEY, JSON.stringify(next));
    sessionStorage.setItem(SESSION_FLAG, '1');
    return next;
  } catch {
    return null;
  }
}

/** Whole days between a visitor's first visit and now. 0 on the first day. */
export function daysSinceFirst(state: VisitorState | null, now: number = Date.now()): number | null {
  if (!state) return null;
  return Math.max(0, Math.floor((now - state.first) / DAY_MS));
}
