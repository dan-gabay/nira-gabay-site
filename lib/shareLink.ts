// The address an article share button hands out, tagged so that a visit
// arriving through it can be told apart from every other visit.
//
// Without the tag most of these visits were invisible: WhatsApp and a link
// pasted into a text message open with no referrer at all, so the dashboard
// counted the friend who opened a shared article as "ישיר - הקלדה או שמירה".
//
//   utm_source   the button that was pressed (whatsapp, facebook, instagram,
//                copy_link, share_sheet) - the same names the share event uses
//   utm_medium   share
//   utm_campaign article_share
//
// Built from the canonical address, never location.href: a visitor who came in
// from an ad or from an earlier share carries gclid / fbclid / utm params, and
// those would otherwise be passed on to everyone they share with. A re-share of
// a shared link is therefore tagged with the new button, not the old one.
//
// The tag holds no personal data: nothing about who shared or who opened.
// Search engines are unaffected - the page's canonical link has no query.

export type ShareChannel = 'whatsapp' | 'facebook' | 'instagram' | 'copy_link' | 'share_sheet';

export const SHARE_MEDIUM = 'share';
export const SHARE_CAMPAIGN = 'article_share';

/** The page's own address without any query or hash. */
export function canonicalUrl(): string {
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
  return canonical || window.location.origin + window.location.pathname;
}

/** The canonical address with the share tag for one button. */
export function articleShareUrl(channel: ShareChannel): string {
  const url = new URL(canonicalUrl());
  url.search = '';
  url.hash = '';
  url.searchParams.set('utm_source', channel);
  url.searchParams.set('utm_medium', SHARE_MEDIUM);
  url.searchParams.set('utm_campaign', SHARE_CAMPAIGN);
  return url.toString();
}
