// "Don't count me" for the people who run the site.
//
// Dan and Nira browse the public site all the time - checking an article,
// testing a button, showing the site to someone. Every one of those visits
// landed in site_events, GA4, Clarity and the ad platforms as a real visitor,
// and twice a whole session had to be archived by hand afterwards (see
// db/2026-09-23-site-events-archive.sql).
//
// A switch in /manage sets this cookie. While it is set, the browser:
// - loads no third-party tracker (GA4 / GTM, Meta Pixel, Clarity)
// - sends nothing to site_events or contact_intents
// - does not bump an article's view counter
// - drops Vercel Web Analytics and Speed Insights beacons
// and /api/track and /api/contact-intent refuse the row on the server too, so
// a stale tab that loaded before the switch cannot slip one through.
//
// A cookie rather than localStorage for exactly that reason: the server can
// see it. It is per browser - a phone and a laptop each need the switch - and
// it holds no identity, only "1".

export const OPT_OUT_COOKIE = 'site_owner_notrack';

// Asked for five years; browsers cap a cookie at about 400 days, so the
// switch in /manage re-sets it on every admin visit to keep it from lapsing.
const MAX_AGE = 60 * 60 * 24 * 365 * 5;

export function isOptedOut(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((c) => c === `${OPT_OUT_COOKIE}=1`);
}

export function setOptedOut(on: boolean): void {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = on
    ? `${OPT_OUT_COOKIE}=1; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${secure}`
    : `${OPT_OUT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

/** Server side: the value of the cookie as a route handler reads it. */
export const optedOutFromCookie = (value: string | undefined): boolean => value === '1';
