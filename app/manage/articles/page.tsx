'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import {
  Plus, Edit, Trash2, Eye, Heart,
  CheckCircle, XCircle, Clock, ArrowRight, Search,
} from 'lucide-react';
import Image from 'next/image';

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  image_url: string | null;
  views_count: number;
  likes_count: number;
  is_published: boolean;
  scheduled_publish_at: string | null;
  created_date: string;
};

function articleStatus(a: Article): 'published' | 'scheduled' | 'draft' {
  if (a.is_published) return 'published';
  if (a.scheduled_publish_at && new Date(a.scheduled_publish_at) > new Date()) return 'scheduled';
  return 'draft';
}

export default function ManageArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Silently trigger scheduled publish check on every manage page visit
    fetch('/api/cron/publish-scheduled').catch(() => {});
    loadArticles();
  }, []);

  async function loadArticles() {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('id, title, slug, excerpt, image_url, views_count, likes_count, is_published, scheduled_publish_at, created_date')
        .order('created_date', { ascending: false });
      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  }

  async function togglePublish(id: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('articles')
        .update({ is_published: !currentStatus, scheduled_publish_at: null })
        .eq('id', id);
      if (error) throw error;
      setArticles(articles.map(a =>
        a.id === id ? { ...a, is_published: !currentStatus, scheduled_publish_at: null } : a
      ));
    } catch (error) {
      console.error('Error toggling publish:', error);
      alert('שגיאה בעדכון סטטוס הפרסום');
    }
  }

  async function cancelSchedule(id: string) {
    try {
      const { error } = await supabase
        .from('articles')
        .update({ scheduled_publish_at: null })
        .eq('id', id);
      if (error) throw error;
      setArticles(articles.map(a =>
        a.id === id ? { ...a, scheduled_publish_at: null } : a
      ));
    } catch (error) {
      console.error('Error cancelling schedule:', error);
      alert('שגיאה בביטול התיזמון');
    }
  }

  async function deleteArticle(id: string, title: string) {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המאמר "${title}"?`)) return;
    try {
      const { error } = await supabase.from('articles').delete().eq('id', id);
      if (error) throw error;
      setArticles(articles.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('שגיאה במחיקת המאמר');
    }
  }

  const filtered = articles.filter(a =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.excerpt?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const scheduledCount = articles.filter(a => articleStatus(a) === 'scheduled').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-600">טוען מאמרים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50" dir="rtl">
      <div className="bg-white border-b border-stone-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Link href="/manage" className="text-amber-600 hover:text-amber-700 text-sm mb-2 inline-flex items-center gap-1">
                <ArrowRight className="w-4 h-4" />
                חזרה ללוח בקרה
              </Link>
              <h1 className="text-3xl font-bold text-stone-800">ניהול מאמרים</h1>
            </div>
            <Link href="/manage/articles/new" className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors">
              <Plus className="w-5 h-5" />
              מאמר חדש
            </Link>
          </div>
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="text"
              placeholder="חיפוש מאמרים..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-12 pl-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg border border-stone-200">
            <p className="text-stone-600 text-sm">סה"כ מאמרים</p>
            <p className="text-2xl font-bold text-stone-800">{articles.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-stone-200">
            <p className="text-stone-600 text-sm">מפורסמים</p>
            <p className="text-2xl font-bold text-green-600">{articles.filter(a => a.is_published).length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-stone-200">
            <p className="text-stone-600 text-sm">מתוזמנים</p>
            <p className="text-2xl font-bold text-blue-600">{scheduledCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-stone-200">
            <p className="text-stone-600 text-sm">טיוטות</p>
            <p className="text-2xl font-bold text-amber-600">{articles.filter(a => articleStatus(a) === 'draft').length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-100">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-stone-600">
              {searchTerm ? 'לא נמצאו מאמרים התואמים לחיפוש' : 'אין מאמרים עדיין'}
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {filtered.map((article) => {
                const status = articleStatus(article);
                return (
                  <div key={article.id} className="p-6 hover:bg-stone-50 transition-colors">
                    <div className="flex gap-6">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0">
                        {article.image_url ? (
                          <Image src={article.image_url} alt={article.title} width={120} height={80} unoptimized className="rounded-lg object-cover" />
                        ) : (
                          <div className="w-[120px] h-[80px] bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-center">
                            <span className="text-xs text-amber-600 text-center px-2">ללא תמונה</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-stone-800 mb-1">{article.title}</h3>
                            <p className="text-stone-600 text-sm line-clamp-2">{article.excerpt}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {status === 'published' && (
                              <span className="bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> מפורסם
                              </span>
                            )}
                            {status === 'scheduled' && (
                              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                                <Clock className="w-3 h-3" /> מתוזמן
                              </span>
                            )}
                            {status === 'draft' && (
                              <span className="bg-amber-100 text-amber-800 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> טיוטה
                              </span>
                            )}
                            {status === 'scheduled' && article.scheduled_publish_at && (
                              <span className="text-xs text-blue-600 mt-0.5">
                                {new Date(article.scheduled_publish_at).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-6 mb-4 text-sm text-stone-600">
                          <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{article.views_count || 0} צפיות</span>
                          <span className="flex items-center gap-1"><Heart className="w-4 h-4" />{article.likes_count || 0} לייקים</span>
                          <span>{new Date(article.created_date).toLocaleDateString('he-IL')}</span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/manage/articles/edit/${article.id}`} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                            <Edit className="w-4 h-4" /> עריכה
                          </Link>
                          <Link
                            href={
                              status === 'published'
                                ? `/articles/${article.slug}`
                                : `/api/preview?secret=${process.env.NEXT_PUBLIC_PREVIEW_SECRET}&slug=${article.slug}`
                            }
                            target="_blank"
                            className="bg-stone-200 hover:bg-stone-300 text-stone-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                          >
                            <Eye className="w-4 h-4" /> תצוגה מקדימה
                          </Link>
                          {status === 'scheduled' ? (
                            <>
                              <button onClick={() => togglePublish(article.id, false)} className="bg-green-100 hover:bg-green-200 text-green-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                פרסם עכשיו
                              </button>
                              <button onClick={() => cancelSchedule(article.id)} className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                בטל תיזמון
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => togglePublish(article.id, article.is_published)}
                              className={`${article.is_published ? 'bg-amber-100 hover:bg-amber-200 text-amber-800' : 'bg-green-100 hover:bg-green-200 text-green-800'} px-4 py-2 rounded-lg text-sm font-medium transition-colors`}
                            >
                              {article.is_published ? 'הסר פרסום' : 'פרסם'}
                            </button>
                          )}
                          <button onClick={() => deleteArticle(article.id, article.title)} className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors mr-auto">
                            <Trash2 className="w-4 h-4" /> מחק
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
