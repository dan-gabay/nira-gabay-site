// What the enquiries inbox and the home screen both need to know about a
// lead: its shape, the lifecycle it moves through, and how to reach it.

export type LeadStatus = 'new' | 'spoke' | 'started_therapy' | 'ongoing' | 'irrelevant';

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  is_read: boolean;
  created_date: string;
  status?: LeadStatus;
  heard_from?: string | null;
  channel?: string | null;
  // Attribution (nullable - only present on leads captured after the
  // Google Ads tracking work)
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  gclid?: string | null;
  landing_page?: string | null;
  referrer?: string | null;
  source_page?: string | null;
  /** The site visit this lead came from, when it could be matched. */
  session_id?: string | null;
};

// A tap on WhatsApp/phone/email, recorded server-side with the ad click that
// produced it. Pending until Nira says whether a message actually arrived -
// the site cannot know, because the tap hands the visitor to another app.
export type ContactIntent = {
  id: number;
  created_at: string;
  channel: string;
  source_page?: string | null;
  device?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  gclid?: string | null;
  landing_page?: string | null;
  /** The site visit this tap came from, when it could be matched. */
  session_id?: string | null;
};

// Lead lifecycle - the quality signal campaign optimization is judged by.
// In the order a lead moves through it. Only started_therapy and ongoing are
// paying clients; spoke is a conversation, not a qualified lead.
export const STATUSES: Array<{ key: LeadStatus; label: string; tone: string; dot: string }> = [
  { key: 'new', label: 'חדש', tone: 'bg-rose-50 text-rose-800 border-rose-200', dot: 'bg-rose-500' },
  { key: 'spoke', label: 'דיברנו', tone: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  {
    key: 'started_therapy',
    label: 'התחיל טיפול',
    tone: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  { key: 'ongoing', label: 'מטופל קבוע', tone: 'bg-sky-50 text-sky-800 border-sky-200', dot: 'bg-sky-500' },
  { key: 'irrelevant', label: 'לא רלוונטי', tone: 'bg-stone-100 text-stone-600 border-stone-200', dot: 'bg-stone-400' },
];

export const STATUS_OF = Object.fromEntries(STATUSES.map((s) => [s.key, s])) as Record<
  LeadStatus,
  (typeof STATUSES)[number]
>;

export const leadStatus = (m: ContactMessage): LeadStatus => m.status ?? 'new';

export const CHANNEL_LABELS: Record<string, string> = {
  form: 'טופס האתר',
  whatsapp: 'וואטסאפ',
  phone: 'טלפון',
  email: 'אימייל',
  other: 'אחר',
};

// wa.me needs an international number; leads arrive as local Israeli ones.
export function waNumber(phone: string): string | null {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return `972${digits.slice(1)}`;
  return digits;
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'עכשיו';
  if (mins < 60) return `לפני ${mins} דק׳`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שע׳`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'אתמול';
  if (days < 30) return `לפני ${days} ימים`;
  return new Date(iso).toLocaleDateString('he-IL');
}

/** "Where did this lead come from", as label/value pairs. */
export function attribution(m: ContactMessage): Array<[string, string]> {
  const parts: Array<[string, string]> = [];
  if (m.utm_source || m.utm_medium) {
    parts.push(['מקור', [m.utm_source, m.utm_medium].filter(Boolean).join(' / ')]);
  } else if (m.gclid) {
    parts.push(['מקור', 'Google Ads']);
  } else if (m.referrer) {
    try {
      parts.push(['הפניה', new URL(m.referrer).hostname]);
    } catch {
      parts.push(['הפניה', m.referrer]);
    }
  }
  if (m.utm_campaign) parts.push(['קמפיין', m.utm_campaign]);
  if (m.utm_term) parts.push(['מילת חיפוש', m.utm_term]);
  if (m.landing_page) parts.push(['דף נחיתה', m.landing_page]);
  if (m.source_page && m.source_page !== m.landing_page) parts.push(['נשלח מ', m.source_page]);
  return parts;
}

// Where a tap came from, in one line. Deliberately short: this list is a
// yes/no queue, not a report.
export function intentSource(i: ContactIntent): string {
  if (i.utm_term) return `Google Ads · ${i.utm_term}`;
  if (i.gclid) return 'Google Ads';
  if (i.utm_campaign) return `${i.utm_source || 'קמפיין'} · ${i.utm_campaign}`;
  if (i.utm_source) return i.utm_source;
  return 'ישיר / אורגני';
}

/** PATCH one lead. Throws on failure so the caller can roll back. */
export async function patchLead(
  id: string,
  patch: { status?: LeadStatus; heard_from?: string; is_read?: boolean },
): Promise<void> {
  const res = await fetch('/api/manage/contacts', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...patch }),
  });
  if (!res.ok) throw new Error(`update failed (${res.status})`);
}
