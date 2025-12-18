'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
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

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  is_read: boolean;
  created_date: string;
};

export default function ManageContactsPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('unread');

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_date', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      
      setMessages(messages.map(m => 
        m.id === id ? { ...m, is_read: true } : m
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
      alert('שגיאה בעדכון הסטטוס');
    }
  }

  async function markAsUnread(id: string) {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ is_read: false })
        .eq('id', id);

      if (error) throw error;
      
      setMessages(messages.map(m => 
        m.id === id ? { ...m, is_read: false } : m
      ));
    } catch (error) {
      console.error('Error marking as unread:', error);
      alert('שגיאה בעדכון הסטטוס');
    }
  }

  async function deleteMessage(id: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הפנייה?')) return;

    try {
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
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
          <h1 className="text-3xl font-bold text-stone-800 mb-4">פניות צור קשר</h1>

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
