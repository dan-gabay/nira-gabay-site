/**
 * Date windows for the Google reporting scripts (ga-query.ts, gsc-query.ts).
 *
 * Reports compare like for like, so every window is a set of complete
 * calendar days in Asia/Jerusalem - the time zone of the GA4 property and the
 * Google Ads account. The old "last N days" logic took the UTC date minus N
 * and ran to today, which covered N+1 days plus a partial day; that is how a
 * 28-day GA4 breakdown (483 sessions) got compared with a true 28-day total
 * (468).
 *
 *   --start YYYY-MM-DD --end YYYY-MM-DD   explicit window (inclusive)
 *   [days]                                last N complete days, ending yesterday
 */

export const REPORT_TZ = 'Asia/Jerusalem';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's calendar date in Asia/Jerusalem, as YYYY-MM-DD. */
export function todayInReportTz(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Calendar arithmetic on a YYYY-MM-DD date (no time zone involved). */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysInclusive(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
}

export interface DateWindow {
  start: string;
  end: string;
  days: number;
}

/** Last `days` complete days, ending yesterday (Asia/Jerusalem). */
export function lastCompleteDays(days: number, now: Date = new Date()): DateWindow {
  const end = addDays(todayInReportTz(now), -1);
  const start = addDays(end, -(days - 1));
  return { start, end, days };
}

function assertIsoDate(flag: string, value: string | undefined): string {
  if (!value || !ISO_DATE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`${flag} needs a date as YYYY-MM-DD, got: ${value ?? '(nothing)'}`);
  }
  return value;
}

/**
 * Splits argv into positional arguments and the date window.
 * `--start`/`--end` must come together; otherwise the first positional (if
 * numeric) is the number of complete days, default `defaultDays`.
 * Remaining flags are returned in `flags` for the caller.
 */
export function parseWindowArgs(
  argv: string[],
  defaultDays = 28,
  now: Date = new Date(),
): { window: DateWindow; positionals: string[]; flags: Record<string, string> } {
  const flags: Record<string, string> = {};
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [key, inline] = a.slice(2).split('=', 2);
      flags[key] = inline ?? argv[++i];
    } else {
      rest.push(a);
    }
  }

  if (flags.start !== undefined || flags.end !== undefined) {
    const start = assertIsoDate('--start', flags.start);
    const end = assertIsoDate('--end', flags.end);
    if (start > end) throw new Error(`--start ${start} is after --end ${end}`);
    delete flags.start;
    delete flags.end;
    // An explicit window replaces the [days] positional; drop it if given.
    const positionals = rest.length && /^\d+$/.test(rest[0]) ? rest.slice(1) : rest;
    return { window: { start, end, days: daysInclusive(start, end) }, positionals, flags };
  }

  let days = defaultDays;
  let positionals = rest;
  if (rest.length && /^\d+$/.test(rest[0])) {
    days = Number(rest[0]) || defaultDays;
    positionals = rest.slice(1);
  }
  return { window: lastCompleteDays(days, now), positionals, flags };
}
