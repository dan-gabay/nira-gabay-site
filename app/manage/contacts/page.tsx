'use client';

import { useEffect, useState } from 'react';
import {
  Mail,
  Phone,
  MessageCircle,
  Trash2,
  Plus,
  Check,
  RotateCcw,
  ChevronDown,
  Inbox,
} from 'lucide-react';
import { useManageSummary } from '@/components/manage/ManageShell';

type LeadStatus = 'new' | 'spoke' | 'started_therapy' | 'ongoing' | 'irrelevant';

type ContactMessage = {
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
};

// Lead lifecycle - the quality signal campaign optimization is judged by.
const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'חדש',
  spoke: 'דיברנו',
  started_therapy: 'התחיל טיפול',
  ongoing: 'מטופל קבוע',
  irrelevant: 'לא רלוונטי',
};

const STATUS_TONE: Record<LeadStatus, string> = {
  new: 'bg-rose-100 text-rose-800 border-rose-200',
  spoke: 'bg-amber-100 text-amber-800 border-amber-200',
  started_therapy: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  ongoing: 'bg-sky-100 text-sky-800 border-sky-200',
  irrelevant: 'bg-stone-100 text-stone-600 border-stone-200',
};

const CHANNEL_LABELS: Record<string, string> = {
  form: 'טופס האתר',
  whatsapp: 'וואטסאפ',
  phone: 'טלפון',
  email: 'אימייל',
  other: 'אחר',
};

// wa.me needs an international number; leads arrive as local Israeli ones.
function waNumber(phone: string): string | null {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return `972${digits.slice(1)}`;
  return digits;
}

function timeAgo(iso: string): string {
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

// Compact "where did this lead come from" line for the admin card.
function attributionSummary(m: ContactMessage): string | null {
  const parts: string[] = [];
  if (m.utm_source || m.utm_medium) {
    parts.push(`מקור: ${[m.utm_source, m.utm_medium].filter(Boolean).join(' / ')}`);
  } else if (m.gclid) {
    parts.push('מקור: Google Ads');
  } else if (m.referrer) {
    try {
      parts.push(`הפניה: ${new URL(m.referrer).hostname}`);
    } catch {
      parts.push(`הפניה: ${m.referrer}`);
    }
  }
  if (m.utm_campaign) parts.push(`קמפיין: ${m.utm_campaign}`);
  if (m.utm_term) parts.push(`מילת חיפוש: ${m.utm_term}`);
  if (m.landing_page) parts.push(`דף נחיתה: ${m.landing_page}`);
  if (m.source_page && m.source_page !== m.landing_page) {
    parts.push(`נשלח מ: ${m.source_page}`);
  }
  return parts.length ? parts.join(' · ') : null;
}

export default function ManageContactsPage() {
  const { refresh } = useManageSummary();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'unread' | 'all' | 'read'>('unread');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    channel: 'whatsapp',
    heard_from: '',
    message: '',
  });

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    try {
      const res = await fetch('/api/manage/contacts');
      if (!res.ok) throw new Error(`load failed (${res.status})`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }

  async function setReadState(id: string, is_read: boolean) {
    try {
      const res = await fetch('/api/manage/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_read }),
      });
      if (!res.ok) throw new Error(`update failed (${res.status})`);
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, is_read } : m)));
      refresh();
    } catch (error) {
      console.error('Error updating read state:', error);
      alert('שגיאה בעדכון הסטטוס');
    }
  }

  async function updateLead(id: string, patch: { status?: LeadStatus; heard_from?: string }) {
    try {
      const res = await fetch('/api/manage/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) throw new Error(`update failed (${res.status})`);
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('שגיאה בעדכון הליד');
    }
  }

  async function addManualLead() {
    if (!newLead.name || !newLead.phone) {
      alert('נא למלא שם וטלפון');
      return;
    }
    setIsAddingLead(true);
    try {
      const res = await fetch('/api/manage/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead),
      });
      if (!res.ok) throw new Error(`insert failed (${res.status})`);
      setNewLead({ name: '', phone: '', channel: 'whatsapp', heard_from: '', message: '' });
      setShowAddForm(false);
      await loadMessages();
      refresh();
    } catch (error) {
      console.error('Error adding lead:', error);
      alert('שגיאה בהוספת הליד');
    } finally {
      setIsAddingLead(false);
    }
  }

  async function deleteMessage(id: string) {
    if (!confirm('למחוק את הפנייה? הפעולה אינה הפיכה.')) return;
    try {
      const res = await fetch(`/api/manage/contacts?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`delete failed (${res.status})`);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      refresh();
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('שגיאה במחיקת הפנייה');
    }
  }

  const unreadCount = messages.filter((m) => !m.is_read).length;
  const readCount = messages.length - unreadCount;

  const filtered = messages.filter((m) =>
    filter === 'unread' ? !m.is_read : filter === 'read' ? m.is_read : true,
  );

  const TABS = [
    { key: 'unread' as const, label: 'חדשות', count: unreadCount },
    { key: 'read' as const, label: 'טופלו', count: readCount },
    { key: 'all' as const, label: 'הכל', count: messages.length },
  ];

  if (loading) {
    return (
      <div className="py-20 text-center text-stone-500 text-sm">טוען פניות...</div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl md:text-3xl font-bold text-stone-800">פניות</h1>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs md:text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          {showAddForm ? 'סגירה' : 'פנייה ידנית'}
        </button>
      </div>

      {/* Manual lead - for calls and WhatsApp that never touched the form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-stone-200 p-4 md:p-5 space-y-3">
          <p className="text-xs md:text-sm text-stone-500">
            לתיעוד פנייה שהגיעה בטלפון או בוואטסאפ, כדי שתיספר יחד עם השאר.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              value={newLead.name}
              onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
              placeholder="שם *"
              aria-label="שם"
              className="min-h-[44px] px-3.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
            <input
              value={newLead.phone}
              onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
              placeholder="טלפון *"
              aria-label="טלפון"
              dir="ltr"
              inputMode="tel"
              className="min-h-[44px] px-3.5 rounded-xl border border-stone-300 text-sm text-left focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
            <select
              value={newLead.channel}
              onChange={(e) => setNewLead({ ...newLead, channel: e.target.value })}
              aria-label="ערוץ"
              className="min-h-[44px] px-3.5 rounded-xl border border-stone-300 text-sm bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
            >
              {Object.entries(CHANNEL_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <input
              value={newLead.heard_from}
              onChange={(e) => setNewLead({ ...newLead, heard_from: e.target.value })}
              placeholder="איך שמעו עלייך?"
              aria-label="איך שמעו עלייך"
              className="min-h-[44px] px-3.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>
          <textarea
            value={newLead.message}
            onChange={(e) => setNewLead({ ...newLead, message: e.target.value })}
            placeholder="מה הם רצו?"
            aria-label="תוכן הפנייה"
            className="w-full min-h-20 px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
          />
          <button
            onClick={addManualLead}
            disabled={isAddingLead}
            className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {isAddingLead ? 'שומר...' : 'שמירת הפנייה'}
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            aria-pressed={filter === t.key}
            className={`inline-flex items-center gap-1.5 px-4 min-h-[40px] rounded-full text-xs md:text-sm font-medium whitespace-nowrap flex-shrink-0 border transition-colors ${
              filter === t.key
                ? 'bg-stone-800 text-white border-stone-800'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}
          >
            {t.label}
            <span className={filter === t.key ? 'text-white/70' : 'text-stone-400'}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Leads */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 md:p-12 text-center">
          <Inbox className="w-10 h-10 text-stone-300 mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm md:text-base text-stone-600">
            {filter === 'unread' ? 'אין פניות חדשות' : 'אין פניות להצגה'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const status = (m.status || 'new') as LeadStatus;
            const wa = waNumber(m.phone);
            const attribution = attributionSummary(m);
            return (
              <article
                key={m.id}
                className={`bg-white rounded-2xl border overflow-hidden ${
                  m.is_read ? 'border-stone-200' : 'border-rose-200 ring-1 ring-rose-100'
                }`}
              >
                <div className="p-3.5 md:p-5 space-y-3">
                  {/* Who + when */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-bold text-stone-800 text-sm md:text-base truncate">
                        {!m.is_read && (
                          <span
                            className="inline-block w-2 h-2 rounded-full bg-rose-500 ml-1.5 align-middle"
                            aria-label="חדש"
                          />
                        )}
                        {m.name}
                      </h2>
                      <p className="text-[11px] md:text-xs text-stone-400 mt-0.5">
                        {timeAgo(m.created_date)}
                        {m.channel && ` · ${CHANNEL_LABELS[m.channel] || m.channel}`}
                        {m.heard_from && ` · שמעו: ${m.heard_from}`}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] md:text-xs px-2.5 py-1 rounded-full border font-medium whitespace-nowrap flex-shrink-0 ${STATUS_TONE[status]}`}
                    >
                      {STATUS_LABELS[status]}
                    </span>
                  </div>

                  {/* What they wrote */}
                  {m.message && (
                    <p className="text-xs md:text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">
                      {m.message}
                    </p>
                  )}

                  {/* Reply - the whole point of this screen */}
                  <div className="grid grid-cols-3 gap-2">
                    <a
                      href={wa ? `https://wa.me/${wa}` : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-disabled={!wa}
                      onClick={() => !m.is_read && setReadState(m.id, true)}
                      className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl text-xs md:text-sm font-medium transition-colors ${
                        wa
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-stone-100 text-stone-400 pointer-events-none'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" aria-hidden="true" />
                      וואטסאפ
                    </a>
                    <a
                      href={m.phone ? `tel:${m.phone}` : undefined}
                      aria-disabled={!m.phone}
                      onClick={() => !m.is_read && setReadState(m.id, true)}
                      className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl text-xs md:text-sm font-medium border transition-colors ${
                        m.phone
                          ? 'border-stone-300 text-stone-700 hover:bg-stone-50'
                          : 'border-stone-200 text-stone-300 pointer-events-none'
                      }`}
                    >
                      <Phone className="w-4 h-4" aria-hidden="true" />
                      חיוג
                    </a>
                    <a
                      href={m.email ? `mailto:${m.email}` : undefined}
                      aria-disabled={!m.email}
                      onClick={() => !m.is_read && setReadState(m.id, true)}
                      className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl text-xs md:text-sm font-medium border transition-colors ${
                        m.email
                          ? 'border-stone-300 text-stone-700 hover:bg-stone-50'
                          : 'border-stone-200 text-stone-300 pointer-events-none'
                      }`}
                    >
                      <Mail className="w-4 h-4" aria-hidden="true" />
                      מייל
                    </a>
                  </div>

                  {/* Pipeline */}
                  <div className="flex items-center gap-2">
                    <label htmlFor={`status-${m.id}`} className="sr-only">
                      סטטוס הליד
                    </label>
                    <select
                      id={`status-${m.id}`}
                      value={status}
                      onChange={(e) => updateLead(m.id, { status: e.target.value as LeadStatus })}
                      className="flex-1 min-h-[44px] px-3 rounded-xl border border-stone-300 bg-white text-xs md:text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    >
                      {Object.entries(STATUS_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setReadState(m.id, !m.is_read)}
                      title={m.is_read ? 'סימון כחדשה' : 'סימון כטופלה'}
                      aria-label={m.is_read ? 'סימון כחדשה' : 'סימון כטופלה'}
                      className="w-11 h-11 flex items-center justify-center rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50 transition-colors flex-shrink-0"
                    >
                      {m.is_read ? (
                        <RotateCcw className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Check className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteMessage(m.id)}
                      title="מחיקה"
                      aria-label="מחיקת הפנייה"
                      className="w-11 h-11 flex items-center justify-center rounded-xl border border-stone-200 text-stone-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Where it came from - present but out of the way */}
                {attribution && (
                  <details className="group border-t border-stone-100">
                    <summary className="flex items-center justify-between gap-2 px-3.5 md:px-5 py-2.5 min-h-[44px] cursor-pointer list-none text-[11px] md:text-xs text-stone-500 [&::-webkit-details-marker]:hidden">
                      מקור הפנייה
                      <ChevronDown
                        className="w-3.5 h-3.5 transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <p className="px-3.5 md:px-5 pb-3 text-[11px] md:text-xs text-stone-500 leading-relaxed break-words">
                      {attribution}
                    </p>
                  </details>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
