'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Inbox, Plus } from 'lucide-react';
import {
  CHANNEL_LABELS,
  intentSource,
  leadStatus,
  patchLead,
  splitNote,
  timeAgo,
  type ContactIntent,
  type ContactMessage,
} from '@/components/manage/leads';

// "What happened with them?" - the one screen Nira opens, after she has spoken
// to someone, to record how it ended. Built for her phone: the new-enquiry
// email and Telegram message link straight here (?lead=<id> puts that lead
// first), and a home-screen icon opens it too (see layout.tsx).
//
// One step per enquiry (owner feedback, 2026-10-21): tapping an outcome only
// opens the fields under it - name and a few words - and a single שמירה saves
// all of it. Nothing is written, and nothing reloads, until then.
//
// There are exactly two outcomes, because those are the only two that change
// anything (owner decision, 2026-10-15): a treatment was booked, or it is not
// relevant. "We spoke" is not an outcome. The few words are kept at the end
// of the message (see withNote in leads.ts), not in a column of their own.
//
// The data comes from GET /api/manage/contacts?view=open, which returns only
// what this screen shows, so it opens quickly from a notification.

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
const saveBtn =
  'w-full min-h-[52px] rounded-xl bg-stone-900 text-white text-base font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-1.5';

// Placeholder names (a lead logged without one) are shown as such, and the
// name field starts empty for them rather than holding the placeholder.
const NO_NAME = 'ללא שם';

export default function UpdateLeadsPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [intents, setIntents] = useState<ContactIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    const lead = new URLSearchParams(window.location.search).get('lead');
    const q = new URLSearchParams({ view: 'open' });
    if (lead) q.set('lead', lead);
    fetch(`/api/manage/contacts?${q}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) => {
        const list: ContactMessage[] = d.messages || [];
        setFocusId(lead);
        // The lead the notification linked to comes first.
        setMessages(lead ? [...list].sort((a, b) => (a.id === lead ? -1 : b.id === lead ? 1 : 0)) : list);
        setIntents(d.intents || []);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  async function dismissTap(id: number) {
    setIntents((prev) => prev.filter((i) => i.id !== id));
    const res = await fetch('/api/manage/contact-intents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, dismissed: true }),
    }).catch(() => null);
    if (!res?.ok) alert('העדכון לא נשמר. כדאי לרענן ולנסות שוב.');
  }

  // "כן, הגיעה" saves at once (owner feedback, 2026-10-28): the tap becomes an
  // enquiry carrying its ad attribution and leaves the question list. Its card
  // then opens at the top like any other open enquiry, where what happened,
  // the name and the details are filled in as usual.
  async function confirmTap(intent: ContactIntent) {
    const res = await fetch('/api/manage/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: intent.channel, status: 'new', intent_id: intent.id }),
    }).catch(() => null);
    const d = res?.ok ? await res.json().catch(() => null) : null;
    if (!d?.id) {
      alert('השמירה נכשלה. נסי שוב.');
      return;
    }
    setIntents((prev) => prev.filter((i) => i.id !== intent.id));
    setMessages((prev) => [
      {
        id: d.id,
        name: NO_NAME,
        email: '',
        phone: '',
        message: '',
        is_read: true,
        created_date: new Date().toISOString(),
        status: 'new',
        channel: intent.channel,
      },
      ...prev,
    ]);
    setFocusId(d.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const empty = !loading && !failed && messages.length === 0 && intents.length === 0;

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">מה קרה עם הפניות?</h1>
        <p className="text-stone-500 text-sm mt-1">
          {loading ? 'טוען...' : empty ? 'הכל מעודכן. אין פניות שמחכות לך.' : 'אחרי שדיברתם: בוחרים מה קרה, ממלאים ושומרים.'}
        </p>
      </div>

      {failed && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          לא הצלחתי לטעון את הפניות. כדאי לרענן את העמוד.
        </p>
      )}

      {loading && (
        <div className="space-y-3" aria-hidden="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-white border border-stone-200 animate-pulse" />
          ))}
        </div>
      )}

      {messages.map((m) => (
        <LeadCard key={m.id} m={m} focused={m.id === focusId} />
      ))}

      {intents.length > 0 && (
        <section className="space-y-3" aria-labelledby="taps-heading">
          <h2 id="taps-heading" className="text-base font-bold text-stone-900 pt-2">
            לחצו על כפתור באתר. הגיעה מהם הודעה?
          </h2>
          {intents.map((i) => (
            <TapCard key={i.id} intent={i} onConfirm={() => confirmTap(i)} onDismiss={() => dismissTap(i.id)} />
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

// Name and details, opened by choosing an outcome. Shared by both cards.
function DetailFields({
  name,
  note,
  hint,
  onName,
  onNote,
}: {
  name: string;
  note: string;
  hint: string;
  onName: (v: string) => void;
  onNote: (v: string) => void;
}) {
  return (
    <>
      <label className="block">
        <span className="block text-[13px] font-semibold text-stone-600 mb-1">שם</span>
        <input
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="לא חובה"
          autoComplete="off"
          className={`${field} min-h-[48px]`}
        />
      </label>
      <label className="block">
        <span className="block text-[13px] font-semibold text-stone-600 mb-1">פרטים</span>
        <textarea value={note} onChange={(e) => onNote(e.target.value)} placeholder={hint} className={`${field} min-h-24 py-3`} />
      </label>
    </>
  );
}

function LeadCard({ m, focused }: { m: ContactMessage; focused: boolean }) {
  const saved0 = leadStatus(m);
  const { text, note: savedNote } = splitNote(m.message);
  // The choice is local until שמירה: tapping an outcome only opens the fields.
  const [choice, setChoice] = useState<Outcome | null>(
    saved0 === 'started_therapy' || saved0 === 'irrelevant' ? saved0 : null,
  );
  const [name, setName] = useState(m.name === NO_NAME ? '' : m.name || '');
  const [note, setNote] = useState(savedNote);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const outcome = OUTCOMES.find((o) => o.key === choice);

  async function save() {
    if (!choice) return;
    setSaving(true);
    try {
      await patchLead(m.id, { status: choice, name: name.trim() || undefined, outcome_note: note, is_read: true });
      setSaved(true);
    } catch {
      alert('השמירה נכשלה. נסי שוב.');
    } finally {
      setSaving(false);
    }
  }

  const edit = () => setSaved(false);

  return (
    <article
      className={`bg-white rounded-2xl border p-4 space-y-3.5 ${focused ? 'border-stone-900 ring-2 ring-stone-900/10' : 'border-stone-200'}`}
    >
      <div>
        <h2 className="text-lg font-bold text-stone-900">{name.trim() || m.name || NO_NAME}</h2>
        <p className="text-[13px] text-stone-500">
          {timeAgo(m.created_date)} · {CHANNEL_LABELS[m.channel || 'form'] || m.channel}
        </p>
        {text && <p className="text-sm text-stone-700 mt-2 line-clamp-3 whitespace-pre-wrap">{text}</p>}
      </div>

      {saved && outcome ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
          <p className="text-sm font-medium text-emerald-900 inline-flex items-center gap-1.5">
            <Check className="w-4 h-4" aria-hidden="true" />
            נשמר: {outcome.label}
          </p>
          <button type="button" onClick={edit} className="text-sm text-emerald-900 underline underline-offset-2 min-h-[40px] px-1">
            עריכה
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="מה קרה">
            {OUTCOMES.map((o) => {
              const on = choice === o.key;
              return (
                <button
                  key={o.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setChoice(o.key)}
                  className={`${btn} ${on ? o.on : off}`}
                >
                  {on && <Check className="w-4 h-4 flex-shrink-0" aria-hidden="true" />}
                  {o.label}
                </button>
              );
            })}
          </div>

          {outcome && (
            <div className="space-y-2.5 pt-1">
              <DetailFields name={name} note={note} hint={outcome.hint} onName={setName} onNote={setNote} />
              <button type="button" onClick={save} disabled={saving} className={saveBtn}>
                {saving ? 'שומרת...' : 'שמירה'}
              </button>
            </div>
          )}
        </>
      )}
    </article>
  );
}

// A tap on the site's button: one tap answers whether a message came.
// "כן, הגיעה" logs it as an enquiry right away (see confirmTap); "לא הגיעה"
// dismisses it.
function TapCard({
  intent,
  onConfirm,
  onDismiss,
}: {
  intent: ContactIntent;
  onConfirm: () => Promise<void>;
  onDismiss: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function confirm() {
    setSaving(true);
    try {
      await onConfirm();
    } finally {
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
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={confirm}
          disabled={saving}
          className={`${btn} bg-stone-900 border-stone-900 text-white disabled:opacity-60`}
        >
          {saving ? 'שומרת...' : 'כן, הגיעה'}
        </button>
        <button type="button" onClick={onDismiss} disabled={saving} className={`${btn} ${off}`}>
          לא הגיעה
        </button>
      </div>
    </article>
  );
}
