// Scheduled publishing is driven by a once-a-day cron (vercel.json: 0 6 * * *,
// so ~08:00-09:00 Israel time). Picking an exact hour is therefore meaningless:
// whatever time is chosen, the article goes live at the next cron run.
//
// So the admin picks a date only, and the moment is pinned to 00:10 local on
// that date - early enough that it has always passed by the time that day's
// cron fires, and late enough not to fall into the previous day.
export const SCHEDULE_TIME = '00:10';

// 'YYYY-MM-DD' as the admin sees it -> the ISO instant to store.
// Parsed without a Z, so the browser reads it in the admin's own timezone.
export function dateToScheduleIso(date: string): string | null {
  if (!date) return null;
  const d = new Date(`${date}T${SCHEDULE_TIME}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Stored ISO -> 'YYYY-MM-DD' in the admin's timezone.
// Uses the local getters on purpose: toISOString() would shift the date across
// midnight for anyone east of UTC, which is exactly where this site is used.
export function scheduleIsoToDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Today in the admin's timezone, for the picker's `min`.
export function todayLocalDate(): string {
  return scheduleIsoToDate(new Date().toISOString());
}

// 'YYYY-MM-DD' -> a Hebrew long date for the confirmation line. Parsed with the
// time suffix so it stays a local date rather than a UTC instant.
export function formatScheduleDate(date: string): string {
  if (!date) return '';
  const d = new Date(`${date}T${SCHEDULE_TIME}`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('he-IL', { dateStyle: 'long' });
}
