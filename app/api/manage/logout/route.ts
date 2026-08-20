import { NextRequest, NextResponse } from 'next/server';
import { MANAGE_COOKIE } from '@/lib/manageAuth';

export const runtime = 'nodejs';

// Clears the manage session and returns to the login screen. POST-only so a
// stray link or a prefetch can never sign the admin out.
export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/manage/login', req.url), { status: 303 });
  res.cookies.set(MANAGE_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
