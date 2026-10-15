'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Mail, MessageCircle, MoreHorizontal, Phone, Inbox, Plus } from 'lucide-react';
import { CHANNEL_LABELS, intentSource, timeAgo, type ContactIntent, type LeadStatus } from '@/components/manage/leads';

// The one-screen "someone just contacted me" form. Built for Nira's phone and
// a home-screen icon (see layout.tsx): open, tap how they reached her, type a
// name if she has one, save. Everything but the channel is optional - a lead
// logged with nothing else still counts, and counting every enquiry is what
// lead quality is measured by.
//
// It writes through the same POST /api/manage/contacts as the inbox's manual
// form, so the lead lands in the inbox like any other.

const CHANNELS = [
  { key: 'whatsapp', icon: MessageCircle },
  { key: 'phone', icon: Phone },
  { key: 'email', icon: Mail },
  { key: 'other', icon: MoreHorizontal },
] as const;

// Where things stand by the time she logs it. Usually still "new"; often she
// already spoke to them, or already knows it is not for her.
const OUTCOMES: Array<{ key: LeadStatus; label: string }> = [
  { key: 'new', label: 'עוד לא דיברנו' },
  { key: 'spoke', label: 'דיברנו' },
  { key: 'started_therapy', label: 'קבענו טיפול' },
  { key: 'irrelevant', label: 'לא רלוונטי' },
];

// One tap for the common answers to "how did you hear about me"; anything
// else is typed. What the person said, in their words - never filled in from
// the ad tracking (see startLeadFromIntent in the inbox for why).
const HEARD_FROM = ['גוגל', 'המלצה של מישהו', 'פייסבוק / אינסטגרם', 'מטופל/ת בעבר'];

// A tap on the site's WhatsApp/phone/email buttons is offered as "was it
// this?" only if it is recent enough to plausibly be the same person.
const RECENT_TAP_MS = 3 * 24 * 60 * 60 * 1000;

type Form = {
  channel: string;
  name: string;
  phone: string;
  message: string;
  heard_from: string;
  status: LeadStatus;
};

const EMPTY: Form = { channel: '', name: '', phone: '', message: '', heard_from: '', status: 'new' };

export default function NewLeadPage() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [intents, setIntents] = useState<ContactIntent[]>([]);
  const [intentId, setIntentId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Pending taps, to offer linking the lead to the visit it came from. A
    // failure just means no offer - the form works without it.
    fetch('/api/manage/contacts')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setIntents(d.intents || []))
      .catch(() => {});
  }, []);

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const recentTaps = intents.filter(
    (i) => i.channel === form.channel && Date.now() - new Date(i.created_at).getTime() < RECENT_TAP_MS,
  );

  async function save() {
    if (!form.channel) {
      setError('נא לבחור איך פנו אלייך');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/manage/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intentId !== null ? { ...form, intent_id: intentId } : form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'save failed');
      }
      setSaved(true);
      window.scrollTo({ top: 0 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      // Server messages in Hebrew (a bad phone number) are shown as they are.
      setError(/[א-ת]/.test(msg) ? msg : 'השמירה נכשלה. נסי שוב.');
    } finally {
      setSaving(false);
    }
  }

  function another() {
    setForm(EMPTY);
    setIntentId(null);
    setSaved(false);
    setError('');
    if (intentId !== null) setIntents((prev) => prev.filter((i) => i.id !== intentId));
  }

  const field =
    'w-full min-h-[52px] px-4 rounded-xl border border-stone-300 bg-white text-base focus:ring-2 focus:ring-stone-400 focus:outline-none';
  const chip = (on: boolean) =>
    `min-h-[44px] px-4 rounded-full border text-sm font-medium transition-colors ${
      on ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-300 text-stone-700'
    }`;

  if (saved) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center gap-5 px-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <Check className="w-8 h-8 text-emerald-700" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-stone-900">נשמר, תודה!</h2>
          <p className="text-stone-500 mt-1">הפנייה נמצאת ברשימת הפניות.</p>
        </div>
        <div className="w-full max-w-sm space-y-2.5">
          <button
            onClick={another}
            className="w-full min-h-[52px] rounded-xl bg-stone-900 text-white text-base font-medium inline-flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
            פנייה נוספת
          </button>
          <Link
            href="/manage/contacts"
            className="w-full min-h-[52px] rounded-xl bg-white border border-stone-300 text-stone-700 text-base font-medium inline-flex items-center justify-center gap-2"
          >
            <Inbox className="w-5 h-5" aria-hidden="true" />
            לכל הפניות
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">פנייה חדשה</h1>
        <p className="text-stone-500 text-sm mt-1">רק הבחירה הראשונה חובה. כל השאר - אם יש לך.</p>
      </div>

      {/* 1. The only required answer */}
      <fieldset className="space-y-2.5">
        <legend className="text-base font-semibold text-stone-900 mb-2.5">1. איך פנו אלייך?</legend>
        <div className="grid grid-cols-2 gap-2.5">
          {CHANNELS.map(({ key, icon: Icon }) => {
            const on = form.channel === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  set({ channel: key });
                  setIntentId(null);
                  setError('');
                }}
                className={`min-h-[64px] rounded-2xl border-2 text-base font-semibold inline-flex items-center justify-center gap-2 transition-colors ${
                  on ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-200 text-stone-800'
                }`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                {CHANNEL_LABELS[key]}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* A recent tap on the site's own button of the same kind: if it was
          this person, linking it carries the ad/search attribution over. */}
      {recentTaps.length > 0 && (
        <fieldset className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 space-y-2">
          <legend className="sr-only">לחיצה מהאתר</legend>
          <p className="text-sm font-medium text-emerald-900">
            מישהו לחץ על כפתור ה{CHANNEL_LABELS[form.channel]} באתר לאחרונה. זה אולי אותו אדם?
          </p>
          <div className="flex flex-wrap gap-2">
            {recentTaps.slice(0, 3).map((i) => (
              <button
                key={i.id}
                type="button"
                aria-pressed={intentId === i.id}
                onClick={() => setIntentId(intentId === i.id ? null : i.id)}
                className={chip(intentId === i.id)}
              >
                {timeAgo(i.created_at)} · {intentSource(i)}
              </button>
            ))}
          </div>
          <p className="text-xs text-emerald-800/80">לא בטוחה? אפשר לדלג.</p>
        </fieldset>
      )}

      <div className="space-y-3">
        <label className="block">
          <span className="block text-base font-semibold text-stone-900 mb-1.5">2. שם</span>
          <input
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="לא חובה"
            autoComplete="off"
            className={field}
          />
        </label>
        <label className="block">
          <span className="block text-base font-semibold text-stone-900 mb-1.5">3. טלפון</span>
          <input
            value={form.phone}
            onChange={(e) => set({ phone: e.target.value })}
            placeholder="לא חובה"
            dir="ltr"
            inputMode="tel"
            autoComplete="off"
            className={`${field} text-left placeholder:text-right`}
          />
        </label>
      </div>

      <fieldset>
        <legend className="text-base font-semibold text-stone-900 mb-2">4. איך שמעו עלייך?</legend>
        <div className="flex flex-wrap gap-2 mb-2.5">
          {HEARD_FROM.map((h) => (
            <button
              key={h}
              type="button"
              aria-pressed={form.heard_from === h}
              onClick={() => set({ heard_from: form.heard_from === h ? '' : h })}
              className={chip(form.heard_from === h)}
            >
              {h}
            </button>
          ))}
        </div>
        <input
          value={form.heard_from}
          onChange={(e) => set({ heard_from: e.target.value })}
          placeholder="או לכתוב במילים שלהם (לא חובה)"
          aria-label="איך שמעו עלייך"
          className={field}
        />
      </fieldset>

      <fieldset>
        <legend className="text-base font-semibold text-stone-900 mb-2">5. מה המצב כרגע?</legend>
        <div className="flex flex-wrap gap-2">
          {OUTCOMES.map((o) => (
            <button
              key={o.key}
              type="button"
              aria-pressed={form.status === o.key}
              onClick={() => set({ status: o.key })}
              className={chip(form.status === o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="block text-base font-semibold text-stone-900 mb-1.5">6. במה מדובר?</span>
        <textarea
          value={form.message}
          onChange={(e) => set({ message: e.target.value })}
          placeholder="כמה מילים, לא חובה (למשל: טיפול זוגי, CBT, הדרכת הורים)"
          className={`${field} min-h-24 py-3`}
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {/* Kept in reach of the thumb on a phone, whatever was scrolled to. */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] lg:bottom-4">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="w-full min-h-[56px] rounded-2xl bg-stone-900 text-white text-lg font-semibold shadow-lg disabled:opacity-60"
        >
          {saving ? 'שומרת...' : 'שמירה'}
        </button>
      </div>
    </div>
  );
}
