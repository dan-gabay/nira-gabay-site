// articles.created_date is the article's PUBLISH date, not the moment the row
// was inserted. Dan's call (Nov 2026): the date readers see, the schema's
// datePublished and the listing order must all say when an article went live,
// and the table has no separate column for it (no migrations - reuse columns).
// The original insert time of imported articles is kept in imported_at.
//
// Every path that makes an article public writes created_date:
//  - the scheduled-publish cron sets it to the article's scheduled_publish_at
//  - "publish now" in /manage (list toggle, editor) sets it to now
//  - scheduling in /manage sets it to the scheduled date ahead of time

// Shown and compared in Israel time. The server renders in UTC, so a plain
// toLocaleDateString turned a Sunday 00:10 publish into Saturday's date.
export const SITE_TIMEZONE = 'Asia/Jerusalem';

export function formatPublishDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('he-IL', { timeZone: SITE_TIMEZONE });
}
