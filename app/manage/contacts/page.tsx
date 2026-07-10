'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight,
  Mail,
  User,
  Phone,
  MessageSquare,
  Clock,
  CheckCircle,
  Trash2
} from 'lucide-react';

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

const CHANNEL_LABELS: Record<string, string> = {
  form: 'טופס האתר',
  whatsapp: 'וואטסאפ',
  phone: 'טלפון',
  email: 'אימייל',
  other: 'אחר',
};

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
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('unread');
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

      setMessages(messages.map(m =>
        m.id === id ? { ...m, is_read } : m
      ));
    } catch (error) {
      console.error('Error updating read state:', error);
      alert('שגיאה בעדכון הסטטוס');
    }
  }

  const markAsRead = (id: string) => setReadState(id, true);
  const markAsUnread = (id: string) => setReadState(id, false);

  async function updateLead(id: string, patch: { status?: LeadStatus; heard_from?: string }) {
    try {
      const res = await fetch('/api/manage/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) throw new Error(`update failed (${res.status})`);
      setMessages(messages.map(m => (m.id === id ? { ...m, ...patch } : m)));
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
    } catch (error) {
      console.error('Error adding lead:', error);
      alert('שגיאה בהוספת הליד');
    } finally {
      setIsAddingLead(false);
    }
  }

  async function deleteMessage(id: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הפנייה?')) return;

    try {
      const res = await fetch(`/api/manage/contacts?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`delete failed (${res.status})`);

      setMessages(messages.filter(m => m.id !== id));
      alert('הפנייה נמחקה בהצלחה');
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('שגיאה במחיקת הפנייה');
    }
  }

  const filteredMessages = messages.filter(message => {
    if (filter === 'unread') return !message.is_read;
    if (filter === 'read') return message.is_read;
    return true;
  });

  const unreadCount = messages.filter(m => !m.is_read).length;
  const readCount = messages.filter(m => m.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-600">טוען פניות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-stone-200">
        <div className="container mx-auto px-4 py-6">
          <Link href="/manage" className="text-amber-600 hover:text-amber-700 text-sm mb-2 inline-flex items-center gap-1">
            <ArrowRight className="w-4 h-4" />
            חזרה ללוח בקרה
          </Link>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h1 className="text-3xl font-bold text-stone-800">פניות צור קשר</h1>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-stone-800 hover:bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {showAddForm ? 'סגירה' : '+ פנייה חדשה (טלפון/וואטסאפ)'}
            </button>
          </div>

          {/* Manual lead entry - phone/WhatsApp inquiries that never touch the form */}
          {showAddForm && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="שם *"
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  className="px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <input
                  type="tel"
                  dir="ltr"
                  placeholder="טלפון *"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  className="px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-left"
                />
                <select
                  value={newLead.channel}
                  onChange={(e) => setNewLead({ ...newLead, channel: e.target.value })}
                  className="px-3 py-2 border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="whatsapp">וואטסאפ</option>
                  <option value="phone">טלפון</option>
                  <option value="email">אימייל</option>
                  <option value="other">אחר</option>
                </select>
                <input
                  type="text"
                  placeholder="איך הגיעו אליי? (גוגל, המלצה...)"
                  value={newLead.heard_from}
                  onChange={(e) => setNewLead({ ...newLead, heard_from: e.target.value })}
                  className="px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="הערה (לא חובה)"
                  value={newLead.message}
                  onChange={(e) => setNewLead({ ...newLead, message: e.target.value })}
                  className="flex-1 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  onClick={addManualLead}
                  disabled={isAddingLead}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isAddingLead ? 'שומר...' : 'שמירה'}
                </button>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              לא נקראו ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'read'
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              נקראו ({readCount})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              הכל ({messages.length})
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Messages List */}
        <div className="space-y-4">
          {filteredMessages.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center">
              <Mail className="w-16 h-16 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-600">
                {filter === 'unread' && 'אין פניות חדשות'}
                {filter === 'read' && 'אין פניות שנקראו'}
                {filter === 'all' && 'אין פניות עדיין'}
              </p>
            </div>
          ) : (
            filteredMessages.map((message) => (
              <div
                key={message.id}
                className={`bg-white rounded-xl shadow-sm border-2 p-6 ${
                  message.is_read 
                    ? 'border-stone-200' 
                    : 'border-amber-200 bg-amber-50/30'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2 flex-wrap">
                      <div className="flex items-center gap-2 text-stone-800 font-medium">
                        <User className="w-4 h-4" />
                        {message.name}
                      </div>
                      {message.email && (
                        <a
                          href={`mailto:${message.email}`}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                        >
                          <Mail className="w-4 h-4" />
                          {message.email}
                        </a>
                      )}
                      {message.phone && (
                        <a
                          href={`tel:${message.phone}`}
                          className="flex items-center gap-2 text-green-600 hover:text-green-700 text-sm"
                        >
                          <Phone className="w-4 h-4" />
                          {message.phone}
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {message.is_read ? (
                      <span className="bg-stone-100 text-stone-700 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        נקרא
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-800 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        חדש
                      </span>
                    )}
                  </div>
                </div>

                {/* Message Content */}
                <div className="bg-white rounded-lg border border-stone-200 p-4 mb-4">
                  <div className="flex items-start gap-2 mb-2">
                    <MessageSquare className="w-5 h-5 text-stone-400 flex-shrink-0 mt-0.5" />
                    <p className="text-stone-800 whitespace-pre-wrap flex-1">{message.message}</p>
                  </div>
                </div>

                {/* Attribution - where this lead came from */}
                {attributionSummary(message) && (
                  <p className="text-xs text-stone-500 bg-stone-50 rounded-lg px-3 py-2 mb-4" dir="rtl">
                    {attributionSummary(message)}
                  </p>
                )}

                {/* Lead pipeline: status + heard-from */}
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <label className="text-sm text-stone-500">סטטוס:</label>
                  <select
                    value={message.status || 'new'}
                    onChange={(e) => updateLead(message.id, { status: e.target.value as LeadStatus })}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      message.status === 'ongoing' || message.status === 'started_therapy'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : message.status === 'irrelevant'
                        ? 'bg-stone-100 border-stone-200 text-stone-500'
                        : 'bg-white border-stone-200 text-stone-800'
                    }`}
                  >
                    {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  {message.channel && message.channel !== 'form' && (
                    <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">
                      {CHANNEL_LABELS[message.channel] || message.channel}
                    </span>
                  )}
                  <input
                    type="text"
                    placeholder="איך הגיעו אליי?"
                    defaultValue={message.heard_from || ''}
                    onBlur={(e) => {
                      if (e.target.value !== (message.heard_from || '')) {
                        updateLead(message.id, { heard_from: e.target.value });
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 flex-1 min-w-40"
                  />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-stone-500">
                    {new Date(message.created_date).toLocaleString('he-IL')}
                  </div>

                  <div className="flex items-center gap-2">
                    {!message.is_read ? (
                      <button
                        onClick={() => markAsRead(message.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        סמן כנקרא
                      </button>
                    ) : (
                      <button
                        onClick={() => markAsUnread(message.id)}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                      >
                        <Clock className="w-4 h-4" />
                        סמן כלא נקרא
                      </button>
                    )}

                    <button
                      onClick={() => deleteMessage(message.id)}
                      className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      מחק
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
