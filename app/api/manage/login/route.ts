import { NextRequest, NextResponse } from 'next/server';
import { MANAGE_COOKIE, manageSessionToken } from '@/lib/manageAuth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const password = process.env.MANAGE_PASSWORD;
  if (!password) {
    return NextResponse.json(
      { error: 'לא הוגדרה סיסמת ניהול (MANAGE_PASSWORD)' },
      { status: 503 },
    );
  }

  if ((body.password || '') !== password) {
    return NextResponse.json({ error: 'סיסמה שגויה' }, { status: 401 });
  }

  const token = await manageSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(MANAGE_COOKIE, token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
