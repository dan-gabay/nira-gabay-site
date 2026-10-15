'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Inbox, Plus } from 'lucide-react';
import {
  CHANNEL_LABELS,
  intentSource,
  leadStatus,
  patchLead,
  timeAgo,
  type ContactIntent,
  type ContactMessage,
  type LeadStatus,
} from '@/components/manage/leads';

// "What happened with them?" - the one screen Nira opens to keep the enquiries
// the site recorded up to date. Built for her phone: the new-enquiry email and
// Telegram message link straight here (?lead=<id> puts that lead first), and a
// home-screen icon opens it too (see layout.tsx).
//
// It shows only what is waiting for her, newest first:
// - enquiries still "new" or "spoke": one tap records the outcome, which is
//   what lead quality is measured by (only started_therapy/ongoing count as
//   qualified);
// - taps on the site's WhatsApp/phone/email buttons not yet answered: did a
//   message actually arrive? A yes logs the lead with the tap's attribution.
//
// Every tap saves at once - there is no save button to forget.

// Older open enquiries are left to the full inbox, so this list stays short.
const OPEN_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

const OUTCOMES: Array<{ key: LeadStatus; label: string; on: string }> = [
  { key: 'spoke', label: 'דיברנו', on: 'bg-amber-500 border-amber-500 text-white' },
  { key: 'started_therapy', label: 'התחיל טיפול', on: 'bg-emerald-600 border-emerald-600 text-white' },
  { key: 'irrelevant', label: 'לא רלוונטי', on: 'bg-stone-600 border-stone-600 text-white' },
];

const NEW_OUTCOMES: Array<{ key: LeadStatus; label: string; on: string }> = [
  { key: 'new', label: 'עוד לא דיברנו', on: 'bg-rose-500 border-rose-500 text-white' },
  ...OUTCOMES,
];

// What the person said, in their words - never filled in from the ad tracking
// (see startLeadFromIntent in the inbox for why).
const HEARD_FROM = ['גוגל', 'המלצה של מישהו', 'פייסבוק / אינסטגרם', 'מטופל/ת בעבר'];

const btn =
  'inline-flex items-center justify-center gap-1 whitespace-nowrap min-h-[48px] px-2 rounded-xl border-2 text-sm font-semibold transition-colors';
const off = 'bg-white border-stone-200 text-stone-700';
const chip = (on: boolean) =>
  `min-h-[40px] px-3.5 rounded-full border text-sm transition-colors ${
    on ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-300 text-stone-600'
  }`;

export default function UpdateLeadsPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [intents, setIntents] = useState<ContactIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  // Leads touched on this screen stay on it after reaching a final status, so
  // a mis-tap can be corrected; they drop off on the next visit.
  const [touched, setTouched] = useState<Set<string>>(new Set());

  async function load() {
    try {
      const res = await fetch('/api/manage/contacts');
      if (!res.ok) throw new Error(String(res.status));
      const d = await res.json();
      setMessages(d.messages || []);
      setIntents(d.intents || []);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setFocusId(new URLSearchParams(window.location.search).get('lead'));
    load();
  }, []);

  const open = useMemo(() => {
    const since = Date.now() - OPEN_WINDOW_MS;
    const list = messages.filter((m) => {
      if (m.id === focusId || touched.has(m.id)) return true;
      const s = leadStatus(m);
      return (s === 'new' || s === 'spoke') && new Date(m.created_date).getTime() >= since;
    });
    // The lead the notification linked to comes first.
    return list.sort((a, b) => (a.id === focusId ? -1 : b.id === focusId ? 1 : 0));
  }, [messages, focusId, touched]);

  async function update(id: string, patch: { status?: LeadStatus; heard_from?: string }) {
    const before = messages;
    setTouched((t) => new Set(t).add(id));
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch, is_read: true } : m)));
    try {
      await patchLead(id, { ...patch, is_read: true });
    } catch {
      setMessages(before);
      alert('העדכון לא נשמר. נסי שוב.');
    }
  }

  async function dismissTap(id: number) {
    setIntents((prev) => prev.filter((i) => i.id !== id));
    const res = await fetch('/api/manage/contact-intents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, dismissed: true }),
    }).catch(() => null);
    if (!res?.ok) {
      alert('העדכון לא נשמר. נסי שוב.');
      load();
    }
  }

  const waiting = open.filter((m) => !touched.has(m.id)).length + intents.length;

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">מה קרה עם הפניות?</h1>
        <p className="text-stone-500 text-sm mt-1">
          {loading
            ? 'טוען...'
            : waiting > 0
              ? 'לחיצה אחת על מה שקרה, וזה נשמר.'
              : 'הכל מעודכן. אין פניות שמחכות לך.'}
        </p>
      </div>

      {failed && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          לא הצלחתי לטעון את הפניות. כדאי לרענן את העמוד.
        </p>
      )}

      {open.map((m) => (
        <LeadCard key={m.id} m={m} focused={m.id === focusId} onUpdate={(p) => update(m.id, p)} />
      ))}

      {intents.length > 0 && (
        <section className="space-y-3" aria-labelledby="taps-heading">
          <h2 id="taps-heading" className="text-base font-bold text-stone-900 pt-2">
            לחצו על כפתור באתר. הגיעה מהם הודעה?
          </h2>
          {intents.map((i) => (
            <TapCard key={i.id} intent={i} onDismiss={() => dismissTap(i.id)} onLogged={load} />
          ))}
        </section>
      )}

      <div className="grid grid-cols-2 gap-2.5 pt-2">
        <Link
          href="/manage/new-lead"
          className="min-h-[48px] rounded-xl bg-white border border-stone-300 text-stone-700 text-sm font-medium inline-flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          פנייה שלא דרך האתר
        </Link>
        <Link
          href="/manage/contacts"
          className="min-h-[48px] rounded-xl bg-white border border-stone-300 text-stone-700 text-sm font-medium inline-flex items-center justify-center gap-1.5"
        >
          <Inbox className="w-4 h-4" aria-hidden="true" />
          כל הפניות
        </Link>
      </div>
    </div>
  );
}

function LeadCard({
  m,
  focused,
  onUpdate,
}: {
  m: ContactMessage;
  focused: boolean;
  onUpdate: (patch: { status?: LeadStatus; heard_from?: string }) => void;
}) {
  const status = leadStatus(m);
  const answered = status !== 'new';
  return (
    <article
      className={`bg-white rounded-2xl border p-4 space-y-3.5 ${focused ? 'border-stone-900 ring-2 ring-stone-900/10' : 'border-stone-200'}`}
    >
      <div>
        <h2 className="text-lg font-bold text-stone-900">{m.name}</h2>
        <p className="text-[13px] text-stone-500">
          {timeAgo(m.created_date)}
          {m.channel && ` · ${CHANNEL_LABELS[m.channel] || m.channel}`}
          {!m.channel && ' · טופס האתר'}
        </p>
        {m.message && <p className="text-sm text-stone-700 mt-2 line-clamp-3 whitespace-pre-wrap">{m.message}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="מה קרה">
        {OUTCOMES.map((o) => {
          const on = status === o.key;
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => !on && onUpdate({ status: o.key })}
              className={`${btn} ${on ? o.on : off}`}
            >
              {on && <Check className="w-4 h-4 flex-shrink-0" aria-hidden="true" />}
              {o.label}
            </button>
          );
        })}
      </div>

      {/* Asked once there was a conversation, and only while unanswered. */}
      {answered && status !== 'irrelevant' && (
        <div>
          <p className="text-[13px] font-semibold text-stone-600 mb-1.5">איך שמעו עלייך? (לא חובה)</p>
          <div className="flex flex-wrap gap-1.5">
            {HEARD_FROM.map((h) => (
              <button
                key={h}
                type="button"
                aria-pressed={m.heard_from === h}
                onClick={() => onUpdate({ heard_from: m.heard_from === h ? '' : h })}
                className={chip(m.heard_from === h)}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function TapCard({
  intent,
  onDismiss,
  onLogged,
}: {
  intent: ContactIntent;
  onDismiss: () => void;
  onLogged: () => void;
}) {
  const [arrived, setArrived] = useState(false);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<LeadStatus>('new');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/manage/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, channel: intent.channel, status, intent_id: intent.id }),
      });
      if (!res.ok) throw new Error(String(res.status));
      onLogged();
    } catch {
      alert('השמירה נכשלה. נסי שוב.');
      setSaving(false);
    }
  }

  return (
    <article className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
      <p className="text-[15px] text-stone-800">
        <span className="font-semibold">{CHANNEL_LABELS[intent.channel] || intent.channel}</span>
        <span className="text-stone-500"> · {timeAgo(intent.created_at)} · {intentSource(intent)}</span>
      </p>

      {!arrived ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setArrived(true)} className={`${btn} bg-stone-900 border-stone-900 text-white`}>
            כן, הגיעה
          </button>
          <button type="button" onClick={onDismiss} className={`${btn} ${off}`}>
            לא הגיעה
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="שם (לא חובה)"
            aria-label="שם"
            autoComplete="off"
            className="w-full min-h-[48px] px-4 rounded-xl border border-stone-300 text-base focus:ring-2 focus:ring-stone-400 focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="מה קרה">
            {NEW_OUTCOMES.map((o) => (
              <button
                key={o.key}
                type="button"
                role="radio"
                aria-checked={status === o.key}
                onClick={() => setStatus(o.key)}
                className={`${btn} ${status === o.key ? o.on : off}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full min-h-[52px] rounded-xl bg-stone-900 text-white text-base font-semibold disabled:opacity-60"
          >
            {saving ? 'שומרת...' : 'שמירה'}
          </button>
        </div>
      )}
    </article>
  );
}
