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

import { toWhatsAppNumber } from './phone';

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

// ─────────────────────────────────────────────────────── Telegram

// Email arrives in minutes and sometimes in a spam folder. A lead is worth
// about two thousand shekels here and the first reply is most of the job, so
// the notification wants to be instant. Telegram is: free, no domain to
// verify, no second phone number, and no template to get approved.
//
// Sending to a GROUP rather than to a person is deliberate. A bot cannot
// message someone who has never started a chat with it, and if they block it
// the notifications stop with no sign that anything is wrong. A group both
// people are in has neither failure mode, and means the lead is seen by
// whoever gets there first.
//
// Silent when TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is unset, so this costs
// nothing until it is configured, exactly like the email path.

/** Telegram's HTML mode: only these five need escaping. */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function telegramMessage(lead: LeadNotice, isTest = false): string {
  const wa = toWhatsAppNumber(lead.phone);
  const lines = [
    isTest ? '<b>בדיקה</b> - לא הגיעה פנייה אמיתית.' : '<b>פנייה חדשה מהאתר</b>',
    '',
    `<b>${esc(lead.name)}</b>`,
    esc(lead.phone),
  ];
  if (lead.email) lines.push(esc(lead.email));
  if (lead.source) lines.push(`מקור: ${esc(lead.source)}`);
  lines.push('', esc(lead.message));
  // One tap to answer, which is the whole point of putting this on a phone.
  if (wa) lines.push('', `<a href="https://wa.me/${wa}">מענה בוואטסאפ</a>`);
  return lines.join('\n');
}

export async function sendLeadTelegram(
  lead: LeadNotice,
  opts: { isTest?: boolean } = {},
): Promise<NotifyResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return {
      ok: false,
      reason: 'not_configured',
      detail: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set.',
    };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: telegramMessage(lead, opts.isTest === true),
        parse_mode: 'HTML',
        // The wa.me link is the action; a link preview card under it would
        // push the lead's details off a phone screen for nothing.
        link_preview_options: { is_disabled: true },
      }),
    });

    if (!res.ok) {
      // Telegram explains refusals in the body ("chat not found" when the id
      // is wrong or the bot was removed, "Unauthorized" for a revoked token),
      // and that sentence is the only thing that makes this debuggable.
      const text = await res.text().catch(() => '');
      return { ok: false, reason: 'send_failed', detail: `${res.status}: ${text.slice(0, 400)}` };
    }
    return { ok: true, to: [chatId] };
  } catch (e) {
    return { ok: false, reason: 'send_failed', detail: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Tell whoever needs to know that a lead arrived, on every channel that is
 * configured. Both are attempted even if one fails: they are independent, and
 * an email bouncing is no reason to skip the message that arrives in a second.
 */
export async function notifyNewLead(
  lead: LeadNotice,
): Promise<{ email: NotifyResult; telegram: NotifyResult }> {
  const [email, telegram] = await Promise.all([
    sendLeadEmail(lead),
    sendLeadTelegram(lead),
  ]);
  return { email, telegram };
}
