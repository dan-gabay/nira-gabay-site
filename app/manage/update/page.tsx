'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Inbox, Plus } from 'lucide-react';
import {
  CHANNEL_LABELS,
  intentSource,
  leadStatus,
  patchLead,
  splitNote,
  withNote,
  timeAgo,
  type ContactIntent,
  type ContactMessage,
  type LeadStatus,
} from '@/components/manage/leads';

// "What happened with them?" - the one screen Nira opens, after she has spoken
// to someone, to record how it ended. Built for her phone: the new-enquiry
// email and Telegram message link straight here (?lead=<id> puts that lead
// first), and a home-screen icon opens it too (see layout.tsx).
//
// There are exactly two answers, because those are the only two that change
// anything (owner decision, 2026-10-15): a treatment was booked, or it is not
// relevant. "We spoke" is not an outcome. Tapping one saves it at once and
// opens a name field and a free-text box for a few words - for an irrelevant
// enquiry, ideally the reason. The words are kept at the end of the message
// (see withNote in leads.ts), not in a column of their own.
//
// It shows only what is still open (status new or spoke), plus taps on the
// site's WhatsApp/phone/email buttons not yet answered: did a message arrive?

// Older open enquiries are left to the full inbox, so this list stays short.
const OPEN_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

type Outcome = 'started_therapy' | 'irrelevant';

const OUTCOMES: Array<{ key: Outcome; label: string; on: string; hint: string }> = [
  {
    key: 'started_therapy',
    label: 'קבענו טיפול',
    on: 'bg-emerald-600 border-emerald-600 text-white',
    hint: 'רוצה לפרט? למשל: על מה הטיפול, איך שמעו עלייך (לא חובה)',
  },
  {
    key: 'irrelevant',
    label: 'לא רלוונטי',
    on: 'bg-stone-600 border-stone-600 text-white',
    hint: 'רוצה לפרט? למשל: למה לא מתאים, איך שמעו עלייך (לא חובה)',
  },
];

const btn =
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[52px] px-2 rounded-xl border-2 text-[15px] font-semibold transition-colors';
const off = 'bg-white border-stone-200 text-stone-700';
const field =
  'w-full px-4 rounded-xl border border-stone-300 bg-white text-base focus:ring-2 focus:ring-stone-400 focus:outline-none';

export default function UpdateLeadsPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [intents, setIntents] = useState<ContactIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  // Leads answered on this screen stay on it, so a mis-tap can be corrected
  // and the details filled in; they drop off on the next visit.
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

  // Optimistic, rolled back on failure. Throws so a card can say it failed.
  async function update(id: string, patch: { status?: LeadStatus; name?: string; outcome_note?: string }) {
    const before = messages;
    setTouched((t) => new Set(t).add(id));
    const { outcome_note, ...fields } = patch;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              ...fields,
              ...(outcome_note !== undefined ? { message: withNote(m.message, outcome_note) } : {}),
              is_read: true,
            }
          : m,
      ),
    );
    try {
      await patchLead(id, { ...patch, is_read: true });
    } catch (e) {
      setMessages(before);
      alert('העדכון לא נשמר. נסי שוב.');
      throw e;
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
              ? 'אחרי שדיברתם: לחיצה על מה שקרה, וזה נשמר.'
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

// Placeholder names (a lead logged without one) are shown as such, and the
// name field starts empty for them rather than holding the placeholder.
const NO_NAME = 'ללא שם';

function LeadCard({
  m,
  focused,
  onUpdate,
}: {
  m: ContactMessage;
  focused: boolean;
  onUpdate: (patch: { status?: LeadStatus; name?: string; outcome_note?: string }) => Promise<void>;
}) {
  const status = leadStatus(m);
  const outcome = OUTCOMES.find((o) => o.key === status);
  const [name, setName] = useState(m.name === NO_NAME ? '' : m.name || '');
  const { text, note: savedNote } = splitNote(m.message);
  const [note, setNote] = useState(savedNote);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveDetails() {
    setSaving(true);
    try {
      await onUpdate({ name: name.trim() || undefined, outcome_note: note });
      setSaved(true);
    } catch {
      // update() already told her
    } finally {
      setSaving(false);
    }
  }

  return (
    <article
      className={`bg-white rounded-2xl border p-4 space-y-3.5 ${focused ? 'border-stone-900 ring-2 ring-stone-900/10' : 'border-stone-200'}`}
    >
      <div>
        <h2 className="text-lg font-bold text-stone-900">{m.name || NO_NAME}</h2>
        <p className="text-[13px] text-stone-500">
          {timeAgo(m.created_date)} · {CHANNEL_LABELS[m.channel || 'form'] || m.channel}
        </p>
        {text && <p className="text-sm text-stone-700 mt-2 line-clamp-3 whitespace-pre-wrap">{text}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="מה קרה">
        {OUTCOMES.map((o) => {
          const on = status === o.key;
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                if (on) return;
                setSaved(false);
                onUpdate({ status: o.key }).catch(() => {});
              }}
              className={`${btn} ${on ? o.on : off}`}
            >
              {on && <Check className="w-4 h-4 flex-shrink-0" aria-hidden="true" />}
              {o.label}
            </button>
          );
        })}
      </div>

      {/* Opens once an outcome is chosen. The outcome itself is already saved;
          this only adds the details. */}
      {outcome && (
        <div className="space-y-2.5 pt-1">
          <label className="block">
            <span className="block text-[13px] font-semibold text-stone-600 mb-1">שם</span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              placeholder="לא חובה"
              autoComplete="off"
              className={`${field} min-h-[48px]`}
            />
          </label>
          <label className="block">
            <span className="block text-[13px] font-semibold text-stone-600 mb-1">פרטים</span>
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setSaved(false);
              }}
              placeholder={outcome.hint}
              className={`${field} min-h-24 py-3`}
            />
          </label>
          <button
            type="button"
            onClick={saveDetails}
            disabled={saving || saved}
            className="w-full min-h-[48px] rounded-xl bg-stone-900 text-white text-base font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" aria-hidden="true" />
                נשמר
              </>
            ) : saving ? (
              'שומרת...'
            ) : (
              'שמירה'
            )}
          </button>
        </div>
      )}
    </article>
  );
}

// A tap on the site's button: "yes, a message arrived" logs it as an open
// enquiry (with the tap's ad attribution), which then waits above for its
// outcome like any other. A name can be added now or later.
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
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/manage/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, channel: intent.channel, intent_id: intent.id }),
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
        <span className="text-stone-500">
          {' '}
          · {timeAgo(intent.created_at)} · {intentSource(intent)}
        </span>
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
        <div className="space-y-2.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="שם (לא חובה)"
            aria-label="שם"
            autoComplete="off"
            className={`${field} min-h-[48px]`}
          />
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full min-h-[48px] rounded-xl bg-stone-900 text-white text-base font-semibold disabled:opacity-60"
          >
            {saving ? 'שומרת...' : 'שמירה'}
          </button>
        </div>
      )}
    </article>
  );
}
