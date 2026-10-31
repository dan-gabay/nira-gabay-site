'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Mail,
  Phone,
  MessageCircle,
  Trash2,
  Plus,
  Check,
  ChevronDown,
  ChevronRight,
  Inbox,
  X,
  Search,
  MousePointerClick,
} from 'lucide-react';
import { useManageSummary } from '@/components/manage/ManageShell';
import PageHeader from '@/components/manage/PageHeader';
import { EnquiryJourneyLoader } from '@/components/manage/analytics/EnquiryJourney';
import {
  CHANNEL_LABELS,
  STATUSES,
  STATUS_OF,
  attribution,
  intentSource,
  leadStatus,
  patchLead,
  splitNote,
  timeAgo,
  waNumber,
  type ContactIntent,
  type ContactMessage,
  type LeadStatus,
} from '@/components/manage/leads';

// The enquiries inbox. Two panes on a laptop - the list, and the open lead
// beside it - and list-then-lead on a phone. Everything about a lead is in
// its pane: replying, its status (one tap, not a dropdown), how they heard
// about Nira, where the visit came from, and the visit itself.
//
// A lead is "new" until its STATUS says otherwise - not until it has been
// opened. Tapping WhatsApp to reply marks a lead read, and while the tabs
// filtered on is_read that single tap moved the lead out of חדשות before
// anyone had spoken to the person. Replying is the beginning of handling a
// lead, not the end of it. Rows predating the status column read as new,
// which is the truthful default for a lead nobody has classified.

type View = 'new' | 'spoke' | 'clients' | 'irrelevant' | 'all';

const VIEWS: Array<{ key: View; label: string; match: (s: LeadStatus) => boolean }> = [
  { key: 'new', label: 'חדשות', match: (s) => s === 'new' },
  { key: 'spoke', label: 'דיברנו', match: (s) => s === 'spoke' },
  { key: 'clients', label: 'מטופלים', match: (s) => s === 'started_therapy' || s === 'ongoing' },
  { key: 'irrelevant', label: 'לא רלוונטי', match: (s) => s === 'irrelevant' },
  { key: 'all', label: 'הכל', match: () => true },
];

const EMPTY_LEAD = { name: '', phone: '', channel: 'whatsapp', heard_from: '', message: '' };

export default function ManageContactsPage() {
  const { refresh } = useManageSummary();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [intents, setIntents] = useState<ContactIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('new');
  const [query, setQuery] = useState('');
  // The lead opened by a tap. On a laptop, with none chosen, the first lead
  // of the list is shown; on a phone the list is shown until one is tapped.
  const [openId, setOpenId] = useState<string | null>(null);

  // The manual lead form, and the tap it is answering "it arrived" for, so
  // its campaign is copied onto the lead the server creates.
  const [showAddForm, setShowAddForm] = useState(false);
  const [linkedIntent, setLinkedIntent] = useState<ContactIntent | null>(null);
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [newLead, setNewLead] = useState(EMPTY_LEAD);
  const [leadError, setLeadError] = useState('');
  // Set when "הגיע" already saved the lead: the form then fills it in.
  const [savedLeadId, setSavedLeadId] = useState<string | null>(null);

  useEffect(() => {
    loadMessages();
    // The home screen links straight to one lead: /manage/contacts?lead=<id>.
    const lead = new URLSearchParams(window.location.search).get('lead');
    if (lead) setOpenId(lead);
  }, []);

  async function loadMessages() {
    try {
      const res = await fetch('/api/manage/contacts');
      if (!res.ok) throw new Error(`load failed (${res.status})`);
      const data = await res.json();
      setMessages(data.messages || []);
      setIntents(data.intents || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateLead(id: string, patch: { status?: LeadStatus; heard_from?: string; is_read?: boolean }) {
    const before = messages;
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    try {
      await patchLead(id, patch);
      if (patch.status) refresh();
    } catch (error) {
      console.error('Error updating lead:', error);
      setMessages(before);
      alert('שגיאה בעדכון הפנייה');
    }
  }

  // "No message arrived." One tap, and the row leaves the queue. Kept in the
  // table rather than deleted: taps that produced nothing are what make the
  // button-to-conversation rate measurable.
  async function dismissIntent(id: number) {
    setIntents((prev) => prev.filter((i) => i.id !== id));
    try {
      const res = await fetch('/api/manage/contact-intents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, dismissed: true }),
      });
      if (!res.ok) throw new Error(`dismiss failed (${res.status})`);
      refresh();
    } catch (error) {
      console.error('Error dismissing intent:', error);
      // Put it back rather than leave the admin thinking it was handled.
      await loadMessages();
    }
  }

  // "A message did arrive." Saves the lead at once (Dan, 31 Oct: one tap is
  // the answer, the form is optional), carrying this tap so the server copies
  // its campaign onto the lead and claims the tap - it does not come back on
  // refresh. Then the short form opens on that lead for the phone and notes,
  // which are written onto it with PATCH.
  //
  // heard_from is deliberately NOT filled in from the tap. It holds what the
  // client herself said when asked how she found Nira, and strategy §4 keeps
  // it precisely because it is independent of the technical attribution:
  // someone can arrive on a Google ad and still be there because a friend
  // recommended her, with the ad only being how she found the page again.
  // Writing "גוגל" into it from the gclid would overwrite the one signal that
  // can contradict the tracking, and leave no way to notice when it is wrong.
  async function startLeadFromIntent(intent: ContactIntent) {
    setIntents((prev) => prev.filter((i) => i.id !== intent.id));
    try {
      const res = await fetch('/api/manage/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: intent.channel, intent_id: intent.id }),
      });
      if (!res.ok) throw new Error(`insert failed (${res.status})`);
      const d = await res.json().catch(() => ({}));
      setLinkedIntent(intent);
      setSavedLeadId(typeof d.id === 'string' ? d.id : null);
      setNewLead({ ...EMPTY_LEAD, channel: intent.channel });
      setLeadError('');
      setShowAddForm(true);
      setView('new');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await loadMessages();
      refresh();
    } catch (error) {
      console.error('Error saving lead from tap:', error);
      alert('השמירה נכשלה. נסי שוב.');
      await loadMessages();
    }
  }

  function closeLeadForm() {
    setNewLead(EMPTY_LEAD);
    setLinkedIntent(null);
    setSavedLeadId(null);
    setLeadError('');
    setShowAddForm(false);
  }

  // Saved with one of the two outcomes Nira records (Dan, 31 Oct: the save
  // button is "קבענו טיפול" / "לא רלוונטי"), or with none yet - the lead then
  // stays new.
  async function addManualLead(status?: LeadStatus) {
    const typed = !!(newLead.phone.trim() || newLead.message.trim() || newLead.name.trim());
    // A tap already saved the lead; with nothing typed there is nothing to add.
    if (savedLeadId && !typed && !status) {
      closeLeadForm();
      return;
    }
    setIsAddingLead(true);
    setLeadError('');
    try {
      // A tap already saved the lead: only the details typed here are added.
      const res = savedLeadId
        ? await fetch('/api/manage/contacts', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: savedLeadId,
              phone: newLead.phone,
              message: newLead.message,
              name: newLead.name,
              ...(status ? { status } : {}),
            }),
          })
        : await fetch('/api/manage/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(status ? { ...newLead, status } : newLead),
          });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `save failed (${res.status})`);
      }
      closeLeadForm();
      setView(status === 'started_therapy' ? 'clients' : status === 'irrelevant' ? 'irrelevant' : 'new');
      await loadMessages();
      refresh();
    } catch (error) {
      console.error('Error adding lead:', error);
      const msg = error instanceof Error ? error.message : '';
      // Server messages in Hebrew (a bad phone number) are shown as they are.
      setLeadError(/[א-ת]/.test(msg) ? msg : 'השמירה נכשלה. נסי שוב.');
    } finally {
      setIsAddingLead(false);
    }
  }

  async function deleteMessage(id: string) {
    if (!confirm('למחוק את הפנייה? הפעולה אינה הפיכה.')) return;
    try {
      const res = await fetch(`/api/manage/contacts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`delete failed (${res.status})`);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      setOpenId(null);
      refresh();
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('שגיאה במחיקת הפנייה');
    }
  }

  const counts = useMemo(() => {
    const c = {} as Record<View, number>;
    for (const v of VIEWS) c[v.key] = messages.filter((m) => v.match(leadStatus(m))).length;
    return c;
  }, [messages]);

  const filtered = useMemo(() => {
    const v = VIEWS.find((x) => x.key === view)!;
    const q = query.trim().toLowerCase();
    return messages.filter((m) => {
      if (!v.match(leadStatus(m))) return false;
      if (!q) return true;
      return [m.name, m.phone, m.email, m.message, m.heard_from]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q));
    });
  }, [messages, view, query]);

  // The open lead is looked up in all messages, not the filtered list, so a
  // lead whose status was just changed stays open instead of vanishing.
  const chosen = openId ? messages.find((m) => m.id === openId) ?? null : null;
  const shown = chosen ?? filtered[0] ?? null;

  if (loading) {
    return (
      <>
        <PageHeader title="פניות" />
        <div className="py-20 text-center text-stone-500 text-sm">טוען פניות...</div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="פניות"
        sub="כל מי שפנה, ומה קרה איתו."
        actions={
          <button
            onClick={() => {
              if (showAddForm) closeLeadForm();
              else setShowAddForm(true);
            }}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium transition-colors"
          >
            {showAddForm ? <X className="w-4 h-4" aria-hidden="true" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
            {showAddForm ? 'סגירה' : 'פנייה ידנית'}
          </button>
        }
      />

      <div className="space-y-4 md:space-y-5">
        {showAddForm && (
          <ManualLeadForm
            linkedIntent={linkedIntent}
            lead={newLead}
            onChange={setNewLead}
            saving={isAddingLead}
            error={leadError}
            onSave={(status) => addManualLead(status)}
          />
        )}

        {/* On a phone, an open lead has the screen to itself. */}
        {intents.length > 0 && (
          <div className={chosen ? 'hidden lg:block' : ''}>
            <IntentQueue intents={intents} onArrived={startLeadFromIntent} onDismiss={dismissIntent} />
          </div>
        )}

        {/* Toolbar: the lifecycle as tabs, and a search */}
        <div className={`flex-col md:flex-row md:items-center gap-2.5 md:gap-4 ${chosen ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 pb-0.5" role="tablist" aria-label="סינון לפי סטטוס">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                role="tab"
                aria-selected={view === v.key}
                onClick={() => {
                  setView(v.key);
                  setOpenId(null);
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 min-h-[38px] rounded-full text-[13px] font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                  view === v.key ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                }`}
              >
                {v.label}
                <span className={`tabular-nums ${view === v.key ? 'text-white/60' : 'text-stone-400'}`}>{counts[v.key]}</span>
              </button>
            ))}
          </div>
          <div className="relative md:ms-auto md:w-64">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" aria-hidden="true" />
            <label htmlFor="lead-search" className="sr-only">
              חיפוש בפניות
            </label>
            <input
              id="lead-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש שם, טלפון או תוכן"
              className="w-full min-h-[40px] pr-10 pl-3 rounded-xl border border-stone-200 bg-white text-sm focus:ring-2 focus:ring-stone-300 focus:outline-none"
            />
          </div>
        </div>

        {filtered.length === 0 && !chosen ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-10 md:p-14 text-center">
            <Inbox className="w-10 h-10 text-stone-300 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm md:text-base text-stone-600">
              {query ? 'לא נמצאו פניות לחיפוש הזה' : view === 'new' ? 'אין פניות חדשות. הכל מטופל.' : 'אין פניות להצגה'}
            </p>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-5 lg:items-start">
            {/* List. Hidden on a phone while a lead is open. */}
            <ul
              className={`bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 overflow-hidden ${
                chosen ? 'hidden lg:block' : ''
              }`}
            >
              {filtered.map((m) => (
                <LeadRow
                  key={m.id}
                  lead={m}
                  active={shown?.id === m.id}
                  onOpen={() => {
                    setOpenId(m.id);
                    if (window.matchMedia('(max-width: 1023px)').matches) window.scrollTo({ top: 0 });
                  }}
                />
              ))}
            </ul>

            {/* The open lead. On a phone only once one was tapped. */}
            {shown && (
              <div className={`${chosen ? '' : 'hidden lg:block'} lg:sticky lg:top-6`}>
                <button
                  type="button"
                  onClick={() => setOpenId(null)}
                  className="lg:hidden inline-flex items-center gap-1 min-h-[44px] mb-1 text-sm font-medium text-stone-600"
                >
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  לכל הפניות
                </button>
                <LeadPane
                  key={shown.id}
                  lead={shown}
                  onUpdate={(patch) => updateLead(shown.id, patch)}
                  onDelete={() => deleteMessage(shown.id)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function LeadRow({ lead: m, active, onOpen }: { lead: ContactMessage; active: boolean; onOpen: () => void }) {
  const status = STATUS_OF[leadStatus(m)];
  const isNew = leadStatus(m) === 'new';
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-current={active ? 'true' : undefined}
        className={`w-full text-start px-4 py-3.5 flex gap-3 transition-colors ${
          active ? 'lg:bg-stone-50 lg:shadow-[inset_-3px_0_0_0_#1c1917]' : 'hover:bg-stone-50'
        }`}
      >
        <span
          className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${isNew ? 'bg-rose-500' : 'bg-transparent'}`}
          aria-hidden="true"
        />
        <span className="flex-1 min-w-0">
          <span className="flex items-baseline justify-between gap-2">
            <span className={`truncate text-sm ${isNew ? 'font-bold text-stone-900' : 'font-semibold text-stone-800'}`}>
              {m.name}
            </span>
            <span className="text-[11px] text-stone-400 flex-shrink-0">{timeAgo(m.created_date)}</span>
          </span>
          <span className="block text-[13px] text-stone-500 truncate mt-0.5">
            {m.message || (m.channel ? CHANNEL_LABELS[m.channel] || m.channel : 'ללא הודעה')}
          </span>
          <span className="mt-1.5 flex items-center gap-2 text-[11px]">
            <span className={`px-2 py-0.5 rounded-full border font-medium ${status.tone}`}>{status.label}</span>
            {m.channel && <span className="text-stone-400">{CHANNEL_LABELS[m.channel] || m.channel}</span>}
          </span>
        </span>
      </button>
    </li>
  );
}

function LeadPane({
  lead: m,
  onUpdate,
  onDelete,
}: {
  lead: ContactMessage;
  onUpdate: (patch: { status?: LeadStatus; heard_from?: string; is_read?: boolean }) => void;
  onDelete: () => void;
}) {
  const status = leadStatus(m);
  const wa = waNumber(m.phone);
  const source = attribution(m);
  const markRead = () => !m.is_read && onUpdate({ is_read: true });
  const { text, note } = splitNote(m.message);

  return (
    <article className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      {/* Who, when, what they wrote */}
      <div className="p-5 md:p-6 space-y-4">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-stone-900">{m.name}</h2>
          <p className="text-[13px] text-stone-500 mt-0.5">
            {new Date(m.created_date).toLocaleString('he-IL', { dateStyle: 'medium', timeStyle: 'short' })}
            {' · '}
            {timeAgo(m.created_date)}
            {m.channel && ` · ${CHANNEL_LABELS[m.channel] || m.channel}`}
          </p>
          {(m.phone || m.email) && (
            <p className="text-[13px] text-stone-600 mt-1 flex flex-wrap gap-x-4">
              {m.phone && (
                <span dir="ltr" className="tabular-nums">
                  {m.phone}
                </span>
              )}
              {m.email && <span dir="ltr">{m.email}</span>}
            </p>
          )}
        </div>

        {text && (
          <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap bg-stone-50 rounded-xl px-4 py-3">
            {text}
          </p>
        )}

        {/* Reply - the whole point of this screen */}
        <div className="grid grid-cols-3 gap-2">
          <a
            href={wa ? `https://wa.me/${wa}` : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!wa}
            onClick={markRead}
            className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors ${
              wa ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-stone-100 text-stone-400 pointer-events-none'
            }`}
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            וואטסאפ
          </a>
          <a
            href={m.phone ? `tel:${m.phone}` : undefined}
            aria-disabled={!m.phone}
            onClick={markRead}
            className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl text-sm font-medium border transition-colors ${
              m.phone ? 'border-stone-300 text-stone-700 hover:bg-stone-50' : 'border-stone-200 text-stone-300 pointer-events-none'
            }`}
          >
            <Phone className="w-4 h-4" aria-hidden="true" />
            חיוג
          </a>
          <a
            href={m.email ? `mailto:${m.email}` : undefined}
            aria-disabled={!m.email}
            onClick={markRead}
            className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl text-sm font-medium border transition-colors ${
              m.email ? 'border-stone-300 text-stone-700 hover:bg-stone-50' : 'border-stone-200 text-stone-300 pointer-events-none'
            }`}
          >
            <Mail className="w-4 h-4" aria-hidden="true" />
            מייל
          </a>
        </div>
      </div>

      {/* Status: every stage one tap away */}
      <section className="px-5 md:px-6 py-4 border-t border-stone-100" aria-labelledby={`st-${m.id}`}>
        <h3 id={`st-${m.id}`} className="text-[12px] font-semibold text-stone-500 mb-2">
          מה קרה עם הפנייה
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-1.5" role="radiogroup" aria-labelledby={`st-${m.id}`}>
          {STATUSES.map((s) => {
            const on = status === s.key;
            return (
              <button
                key={s.key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => !on && onUpdate({ status: s.key })}
                className={`inline-flex items-center justify-center gap-1.5 min-h-[40px] px-2 rounded-xl border text-[13px] font-medium transition-colors ${
                  on ? s.tone : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                {on && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                {s.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Nira's own words on how it ended, written on /manage/update */}
      {note && (
        <section className="px-5 md:px-6 py-4 border-t border-stone-100">
          <h3 className="text-[12px] font-semibold text-stone-500 mb-1.5">פרטים</h3>
          <p className="text-sm text-stone-700 whitespace-pre-wrap">{note}</p>
        </section>
      )}

      {/* How they heard: what the client said, independent of tracking */}
      <section className="px-5 md:px-6 py-4 border-t border-stone-100">
        <HeardFrom value={m.heard_from ?? ''} onSave={(v) => onUpdate({ heard_from: v })} />
      </section>

      {/* Where the visit came from */}
      {source.length > 0 && (
        <section className="px-5 md:px-6 py-4 border-t border-stone-100">
          <h3 className="text-[12px] font-semibold text-stone-500 mb-2">מקור הפנייה באתר</h3>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-[13px]">
            {source.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-stone-400">{k}</dt>
                <dd dir="auto" className="text-stone-700 break-words text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {m.session_id && <VisitFold session={m.session_id} />}

      <div className="px-5 md:px-6 py-3 border-t border-stone-100 bg-stone-50/60 flex justify-end">
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg text-[13px] text-stone-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          מחיקת הפנייה
        </button>
      </div>
    </article>
  );
}

// What the client said when asked how they found Nira. Saved on blur or
// Enter, and only when it changed.
function HeardFrom({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [saved, setSaved] = useState(false);
  const commit = () => {
    const v = draft.trim();
    if (v === value.trim()) return;
    onSave(v);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };
  return (
    <div>
      <label htmlFor="heard-from" className="flex items-center justify-between text-[12px] font-semibold text-stone-500 mb-2">
        איך שמעו עלייך? (מה הם אמרו)
        {saved && (
          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
            נשמר
          </span>
        )}
      </label>
      <input
        id="heard-from"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
        placeholder="למשל: חברה המליצה, גוגל, רופא המשפחה"
        className="w-full min-h-[42px] px-3.5 rounded-xl border border-stone-200 text-sm focus:ring-2 focus:ring-stone-300 focus:outline-none"
      />
    </div>
  );
}

// The visit the lead came from, page by page - the same panel as a row in the
// analytics enquiry log. Loaded only when opened.
function VisitFold({ session }: { session: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="border-t border-stone-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-5 md:px-6 py-3 min-h-[48px] text-start text-[13px] font-medium text-stone-600 hover:bg-stone-50"
      >
        הביקור באתר, עמוד אחרי עמוד
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="px-5 md:px-6 pb-4">
          <EnquiryJourneyLoader session={session} />
        </div>
      )}
    </section>
  );
}

// Taps waiting on the one thing the site cannot know: did a message actually
// arrive. Each row already holds the ad click that produced it, so answering
// "yes" carries the campaign onto the lead.
function IntentQueue({
  intents,
  onArrived,
  onDismiss,
}: {
  intents: ContactIntent[];
  onArrived: (i: ContactIntent) => void;
  onDismiss: (id: number) => void;
}) {
  return (
    <section className="bg-amber-50/70 rounded-2xl border border-amber-200 overflow-hidden" aria-labelledby="intents-h">
      <div className="flex items-start gap-2.5 px-4 md:px-5 pt-4 pb-3">
        <MousePointerClick className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div>
          <h2 id="intents-h" className="text-sm font-semibold text-stone-900">
            {intents.length === 1 ? 'מישהו לחץ על יצירת קשר. הגיעה הודעה?' : `${intents.length} לחיצות על יצירת קשר. הגיעו הודעות?`}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">סימון &quot;הגיע&quot; שומר את הפנייה מיד, יחד עם המקור.</p>
        </div>
      </div>
      <ul className="divide-y divide-amber-200/60 border-t border-amber-200/60">
        {intents.map((i) => (
          <li key={i.id} className="px-4 md:px-5 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex-1 min-w-[180px]">
              <p className="text-sm font-medium text-stone-800">
                {CHANNEL_LABELS[i.channel] || i.channel}
                <span className="font-normal text-stone-400"> · {timeAgo(i.created_at)}</span>
              </p>
              <p className="text-[11px] text-stone-500 truncate">
                {intentSource(i)}
                {i.source_page && <span className="text-stone-400"> · {i.source_page}</span>}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onArrived(i)}
                className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
              >
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                הגיע
              </button>
              <button
                onClick={() => onDismiss(i.id)}
                className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 rounded-xl bg-white border border-stone-300 text-stone-600 hover:bg-stone-50 text-xs font-medium transition-colors"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                לא הגיע
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Manual lead - for calls and WhatsApp that never touched the form, or for a
// tap that turned out to be a message.
//
// Built to fit one phone screen (Dan, 31 Oct): name, phone, notes and the two
// outcome buttons, nothing else. For a tap from the site the source is already
// known - the tap's campaign is copied onto the lead and its channel is the
// tap's - so nothing about it is asked or shown. A hand-logged lead keeps the
// default channel. heard_from and the site visit are on the saved lead's card,
// as before; heard_from is never filled from the tap (see startLeadFromIntent).
function ManualLeadForm({
  linkedIntent,
  lead,
  onChange,
  saving,
  error,
  onSave,
}: {
  linkedIntent: ContactIntent | null;
  lead: typeof EMPTY_LEAD;
  onChange: (l: typeof EMPTY_LEAD) => void;
  saving: boolean;
  error: string;
  onSave: (status?: LeadStatus) => void;
}) {
  const field =
    'w-full min-h-[48px] px-3.5 rounded-xl border border-stone-300 text-base bg-white focus:ring-2 focus:ring-stone-300 focus:outline-none';
  return (
    <section className="bg-white rounded-2xl border border-stone-300 shadow-sm p-4 md:p-5 space-y-2.5" aria-label="פנייה חדשה">
      {linkedIntent && (
        <p className="text-sm text-emerald-800 inline-flex items-center gap-1.5">
          <Check className="w-4 h-4" aria-hidden="true" />
          הפנייה נשמרה. מה קרה איתה?
        </p>
      )}
      <input
        value={lead.name}
        onChange={(e) => onChange({ ...lead, name: e.target.value })}
        placeholder="שם"
        aria-label="שם"
        autoComplete="off"
        className={field}
      />
      <input
        value={lead.phone}
        onChange={(e) => onChange({ ...lead, phone: e.target.value })}
        placeholder="טלפון"
        aria-label="טלפון"
        dir="ltr"
        inputMode="tel"
        autoComplete="off"
        className={`${field} text-left placeholder:text-right`}
      />
      <textarea
        value={lead.message}
        onChange={(e) => onChange({ ...lead, message: e.target.value })}
        placeholder="הערות (מה רצו, מתי לחזור...)"
        aria-label="הערות"
        rows={2}
        className={`${field} py-2.5 resize-none`}
      />
      {error && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => onSave('started_therapy')}
          disabled={saving}
          className="min-h-[52px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-base font-semibold transition-colors disabled:opacity-60"
        >
          קבענו טיפול
        </button>
        <button
          onClick={() => onSave('irrelevant')}
          disabled={saving}
          className="min-h-[52px] rounded-xl bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 text-base font-semibold transition-colors disabled:opacity-60"
        >
          לא רלוונטי
        </button>
      </div>
      <button
        onClick={() => onSave()}
        disabled={saving}
        className="w-full min-h-[40px] text-sm text-stone-500 underline underline-offset-4 disabled:opacity-60"
      >
        {saving ? 'שומרת...' : 'עוד לא ידוע - לשמור בינתיים'}
      </button>

    </section>
  );
}
