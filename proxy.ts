import { NextRequest, NextResponse } from 'next/server';
import { MANAGE_COOKIE, manageSessionToken } from '@/lib/manageAuth';

// Gates the /manage admin area and its API. Fails CLOSED: if MANAGE_PASSWORD
// is not configured the area is unavailable rather than open - the leads
// table holds client names and phone numbers.
export default async function proxy(req: NextRequest) {
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

export const config = {
  matcher: ['/manage/:path*', '/api/manage/:path*'],
};
