import { NextRequest, NextResponse } from 'next/server';
import { MANAGE_COOKIE, isManageAuthorized } from '@/lib/manageAuth';
import { sendLeadEmail, notifyRecipients } from '@/lib/leadNotify';

export const runtime = 'nodejs';

// "Do lead notifications actually work?" answered on demand, without waiting
// for a real lead and without inventing a fake one in contact_messages.
//
// The public contact route deliberately swallows notification failures: a lead
// that reached the database must never be reported as failed because an email
// bounced. The cost of that is silence - an unset RESEND_API_KEY or an
// unverified sender domain looks exactly like everything being fine. This
// route sends the same email through the same code path and hands back what
// really happened, including the sentence Resend refused it with.
//
// POST, not GET: a diagnostic that sends mail should never fire from a
// prefetch, a crawler, or someone pasting the URL.

export async function POST(req: NextRequest) {
  if (!(await isManageAuthorized(req.cookies.get(MANAGE_COOKIE)?.value))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await sendLeadEmail(
    {
      name: 'בדיקה מאזור הניהול',
      phone: '0500000000',
      message: 'אם ההודעה הזאת הגיעה, התראות על פניות חדשות עובדות.',
      source: 'בדיקה',
    },
    { isTest: true },
  );

  if (result.ok) {
    return NextResponse.json({ ok: true, to: result.to });
  }
  // 200 with ok:false, not an error status: the request itself succeeded and
  // the answer it carries is the point.
  return NextResponse.json({
    ok: false,
    reason: result.reason,
    detail: result.detail,
    to: notifyRecipients(),
  });
}
