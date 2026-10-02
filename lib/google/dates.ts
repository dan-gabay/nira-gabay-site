// Report windows for the Google APIs. Search Console data lags two to three
// days, so a 24-hour window would always be empty: anything shorter than a
// week is widened to seven days, and callers say so on screen.

export const MIN_GOOGLE_DAYS = 7;

export function googleDays(range: number): number {
  return Math.max(MIN_GOOGLE_DAYS, range);
}

/** YYYY-MM-DD, n days before today (UTC). */
export function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

/** The window ending yesterday, and the same-length window before it. */
export function windows(days: number) {
  return {
    current: { startDate: daysAgo(days), endDate: daysAgo(1) },
    previous: { startDate: daysAgo(days * 2), endDate: daysAgo(days + 1) },
  };
}
