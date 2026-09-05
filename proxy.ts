import { NextRequest, NextResponse } from 'next/server';
import { MANAGE_COOKIE, manageSessionToken } from '@/lib/manageAuth';
import { prefersMarkdown } from '@/lib/agent/accept';
import { VARY_VALUE } from '@/lib/agent/vary';

// Two jobs, in this order: keep the admin area shut, then negotiate the
// representation of everything else.
//
// (Next 16 renamed middleware to proxy, and refuses to build if both files
// exist - so the content negotiation lives here rather than in a middleware.ts
// of its own.)

// ─────────────────────────────────────────── 1. the /manage gate

// Gates the /manage admin area and its API. Fails CLOSED: if MANAGE_PASSWORD
// is not configured the area is unavailable rather than open - the leads
// table holds client names and phone numbers.
async function gateManage(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The login screen and login API are the only ungated /manage paths.
  if (pathname === '/manage/login' || pathname === '/api/manage/login') {
    return NextResponse.next();
  }

  const expected = await manageSessionToken();
  const cookie = req.cookies.get(MANAGE_COOKIE)?.value;

  if (expected && cookie === expected) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: expected ? 'unauthorized' : 'MANAGE_PASSWORD is not configured' },
      { status: expected ? 401 : 503 },
    );
  }

  if (!expected) {
    return new NextResponse(
      'אזור הניהול אינו זמין: יש להגדיר MANAGE_PASSWORD במשתני הסביבה.',
      { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    );
  }

  const url = req.nextUrl.clone();
  url.pathname = '/manage/login';
  url.searchParams.set('from', pathname);
  return NextResponse.redirect(url);
}

// ─────────────────────────────── 2. HTML / Markdown content negotiation

// Per the `Accept: text/markdown` convention (acceptmarkdown.com): RFC 7231
// negotiation over the RFC 7763 media type.
//
// Two things happen and both matter:
//
// 1. A request that ranks text/markdown above text/html is rewritten to
//    /api/md/<path>, which renders the same page as Markdown. A rewrite, not a
//    redirect: the URL an agent asked for is the URL it keeps, so a page has
//    one canonical address for a person and for a crawler alike.
//
// 2. Every negotiable response - the HTML one included - gets `Vary: Accept`.
//    This is the half that is easy to skip and expensive to skip. Without it a
//    CDN caches whichever variant it saw first under a single key and serves it
//    to everyone: agents get HTML, or, worse, people get a text file. It is
//    appended rather than set, because Next puts its own RSC entries in Vary
//    and overwriting them breaks client-side navigation caching.

/** Paths that are never negotiated: the app's own plumbing and the admin area. */
const EXCLUDED_PREFIXES = ['/api/', '/manage', '/_next/', '/_vercel/'];

/** Anything with a file extension is an asset and is served as itself. */
const HAS_EXTENSION = /\.[a-z0-9]+$/i;

function isNegotiable(pathname: string): boolean {
  if (EXCLUDED_PREFIXES.some((p) => pathname === p.replace(/\/$/, '') || pathname.startsWith(p))) {
    return false;
  }
  return !HAS_EXTENSION.test(pathname);
}

function negotiateRepresentation(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (!isNegotiable(pathname)) return NextResponse.next();

  // React Server Component payload requests carry `Accept: */*` and are not a
  // representation of the page anyone asked for. Negotiating them would hand
  // the router a Markdown document instead of a flight response.
  const isRscRequest = req.headers.has('rsc') || req.headers.has('next-router-prefetch');

  const wantsMarkdown =
    !isRscRequest &&
    (req.method === 'GET' || req.method === 'HEAD') &&
    prefersMarkdown(req.headers.get('accept'));

  if (wantsMarkdown) {
    const url = req.nextUrl.clone();
    url.pathname = `/api/md${pathname === '/' ? '' : pathname.replace(/\/$/, '')}`;
    url.search = search;
    // Tells the route this is the negotiated variant of a real page rather than
    // a direct hit on /api/md/*. The two differ in exactly one way: the direct
    // path is a second URL for content that already has one, so it carries
    // X-Robots-Tag: noindex, and the negotiated variant must not - it IS the
    // page, and marking a variant noindex risks the page itself.
    const headers = new Headers(req.headers);
    headers.set('x-md-negotiated', '1');
    return NextResponse.rewrite(url, { request: { headers } });
  }

  // Measured in production: on some responses this wins outright and replaces
  // whatever Next set, on others Next's own value replaces this. That is why
  // it is the superset from lib/agent/vary.ts and not a bare `Accept` - the
  // bare version won on the 404 and took Next's four RSC routing entries with
  // it. Whichever layer ends up on top, nothing is lost.
  const res = NextResponse.next();
  res.headers.set('Vary', VARY_VALUE);
  return res;
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/manage' || pathname.startsWith('/manage/') || pathname.startsWith('/api/manage/')) {
    return gateManage(req);
  }

  return negotiateRepresentation(req);
}

export const config = {
  matcher: [
    // Everything except Next's own build output and the static files that are
    // already served as themselves.
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|llms.txt).*)',
  ],
};
