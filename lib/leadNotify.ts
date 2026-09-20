// Emailing Nira when a lead arrives, in one place so the contact route and the
// "is this working?" check in /manage cannot drift apart.
//
// This was inline in app/api/contact/route.ts, where two things were invisible:
// whether it was configured at all, and whether a send had actually succeeded.
// The route swallows failures on purpose - a lead that reached the database
// must never be reported as failed because an email bounced - but swallowing
// them also meant nobody could tell the difference between "notifications work"
// and "notifications have been off the whole time".
//
// So sendLeadEmail reports what happened instead of hiding it, and the caller
// decides: the public route logs and moves on, the diagnostic route in
// /manage shows the result.

export type NotifyResult =
  | { ok: true; to: string[] }
  | { ok: false; reason: 'not_configured' | 'send_failed'; detail: string };

export type LeadNotice = {
  name: string;
  phone: string;
  email?: string;
  message: string;
  /** Where the lead came from, when known. Shown so the ad spend is visible
   *  on the notification itself rather than only in /manage. */
  source?: string | null;
};

/**
 * Recipients, from CONTACT_NOTIFY_EMAIL. Comma separated, so the owner and
 * whoever chases leads can both be on it without a code change.
 */
function notifyRecipients(): string[] {
  const raw = process.env.CONTACT_NOTIFY_EMAIL || 'niraga1123@gmail.com';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function body(lead: LeadNotice, isTest: boolean): string {
  return [
    '<div dir="rtl" style="font-family:Arial,sans-serif">',
    isTest
      ? '<p style="background:#fef3c7;padding:10px;border-radius:8px">זו הודעת בדיקה מאזור הניהול. לא הגיעה פנייה אמיתית.</p>'
      : '',
    `<h2>${isTest ? 'בדיקת התראות' : 'פנייה חדשה מטופס יצירת הקשר'}</h2>`,
    `<p><strong>שם:</strong> ${escapeHtml(lead.name)}</p>`,
    `<p><strong>טלפון:</strong> ${escapeHtml(lead.phone)}</p>`,
    lead.email ? `<p><strong>אימייל:</strong> ${escapeHtml(lead.email)}</p>` : '',
    lead.source ? `<p><strong>הגיע מ:</strong> ${escapeHtml(lead.source)}</p>` : '',
    `<p><strong>הודעה:</strong></p><p>${escapeHtml(lead.message).replace(/\n/g, '<br/>')}</p>`,
    '<hr/><p>ניתן לצפות בכל הפניות באזור הניהול באתר.</p>',
    '</div>',
  ].join('');
}

/**
 * Sends the notification and says what happened. Never throws: the caller is
 * usually in the middle of accepting a lead, and nothing here is worth failing
 * that for.
 */
export async function sendLeadEmail(
  lead: LeadNotice,
  opts: { isTest?: boolean } = {},
): Promise<NotifyResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return {
      ok: false,
      reason: 'not_configured',
      detail: 'RESEND_API_KEY is not set, so no notification email is ever sent.',
    };
  }

  const to = notifyRecipients();
  const isTest = opts.isTest === true;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.CONTACT_NOTIFY_FROM || 'onboarding@resend.dev',
        to,
        subject: isTest
          ? 'בדיקת התראות - niragabay.com'
          : `פנייה חדשה מהאתר: ${lead.name}`,
        html: body(lead, isTest),
      }),
    });

    if (!res.ok) {
      // Resend explains refusals in the body (unverified sender domain, bad
      // recipient, revoked key). That sentence is the whole value of a
      // diagnostic, so it is passed through rather than reduced to a status.
      const text = await res.text().catch(() => '');
      return { ok: false, reason: 'send_failed', detail: `${res.status}: ${text.slice(0, 400)}` };
    }
    return { ok: true, to };
  } catch (e) {
    return {
      ok: false,
      reason: 'send_failed',
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}
