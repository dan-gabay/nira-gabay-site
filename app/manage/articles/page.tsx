'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import {
  Plus, Trash2, Eye, Heart, ExternalLink,
  CheckCircle, XCircle, Clock, Search, FileText, Download,
} from 'lucide-react';
import Image from 'next/image';
import { useManageSummary } from '@/components/manage/ManageShell';
import ContentTabs from '@/components/manage/ContentTabs';

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

type QueueItem = {
  id: string;
  source_title: string | null;
  status: string;
  imported_article_id: string | null;
};

type StatusKey = 'published' | 'scheduled' | 'draft';
type FilterKey = 'all' | StatusKey | 'queue';

function articleStatus(a: Article): StatusKey {
  if (a.is_published) return 'published';
  if (a.scheduled_publish_at && new Date(a.scheduled_publish_at) > new Date()) return 'scheduled';
  return 'draft';
}

const STATUS_BADGE: Record<StatusKey, { label: string; cls: string; Icon: typeof CheckCircle }> = {
  published: { label: 'מפורסם', cls: 'bg-green-100 text-green-800', Icon: CheckCircle },
  scheduled: { label: 'מתוזמן', cls: 'bg-blue-100 text-blue-800', Icon: Clock },
  draft: { label: 'טיוטה', cls: 'bg-amber-100 text-amber-800', Icon: XCircle },
};

function ManageArticlesInner() {
  const searchParams = useSearchParams();
  const { refresh } = useManageSummary();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  // The dashboard links straight to the drafts that need publishing.
  const [filter, setFilter] = useState<FilterKey>(
    (searchParams.get('filter') as FilterKey) || 'all',
  );

  useEffect(() => {
    // Silently trigger scheduled publish check on every manage page visit
    fetch('/api/cron/publish-scheduled').catch(() => {});
    loadArticles();
    loadQueue();
  }, []);

  async function loadQueue() {
    try {
      const res = await fetch('/api/manage/queue');
      if (!res.ok) return;
      const data = await res.json();
      setQueue(data.items || []);
    } catch {
      // the pipeline strip degrades to article counts only
    }
  }

  async function parkQueueItem(id: string, status: 'skipped' | 'pending') {
    try {
      const res = await fetch('/api/manage/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
      refresh();
    } catch {
      alert('שגיאה בעדכון התור');
    }
  }

  async function loadArticles() {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('id, title, slug, excerpt, image_url, views_count, likes_count, is_published, scheduled_publish_at, created_date')
        // Consolidated articles (status 'redirected') are archive, not work:
        // permanently unpublished, their slug held only so the 301 in
        // next.config.ts can never be shadowed by a new article reusing it.
        .or('status.is.null,status.neq.redirected')
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
      setArticles((prev) => prev.map((a) =>
        a.id === id ? { ...a, is_published: !currentStatus, scheduled_publish_at: null } : a
      ));
      refresh();
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
      setArticles((prev) => prev.map((a) =>
        a.id === id ? { ...a, scheduled_publish_at: null } : a
      ));
    } catch (error) {
      console.error('Error cancelling schedule:', error);
      alert('שגיאה בביטול התיזמון');
    }
  }

  async function deleteArticle(id: string, title: string) {
    if (!confirm(`למחוק את המאמר "${title}"? הפעולה אינה הפיכה.`)) return;
    try {
      const { error } = await supabase.from('articles').delete().eq('id', id);
      if (error) throw error;
      setArticles((prev) => prev.filter((a) => a.id !== id));
      refresh();
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('שגיאה במחיקת המאמר');
    }
  }

  const queuePending = queue.filter((q) => q.status === 'pending');

  const counts: Record<FilterKey, number> = {
    all: articles.length,
    queue: queuePending.length,
    published: articles.filter((a) => articleStatus(a) === 'published').length,
    draft: articles.filter((a) => articleStatus(a) === 'draft').length,
    scheduled: articles.filter((a) => articleStatus(a) === 'scheduled').length,
  };

  const filtered = articles
    .filter((a) => {
      const matchesFilter = filter === 'all' || articleStatus(a) === filter;
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q || a.title.toLowerCase().includes(q) || a.excerpt?.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    })
    // Drafts first, newest first within each group: what still needs a
    // decision sits at the top of the list, and the piece written most
    // recently is the one waiting at the very top.
    .sort((a, b) => {
      const rank = (x: Article) => (articleStatus(x) === 'published' ? 1 : 0);
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return (
        new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
      );
    });

  const TABS: Array<{ key: FilterKey; label: string }> = [
    { key: 'all', label: 'הכל' },
    { key: 'draft', label: 'טיוטות' },
    { key: 'published', label: 'מפורסמים' },
    { key: 'scheduled', label: 'מתוזמנים' },
    { key: 'queue', label: 'בתור' },
  ];

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-5">
        <ContentTabs />
        <div className="py-20 text-center text-stone-500 text-sm">טוען מאמרים...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-5">
      <ContentTabs />

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none"
            aria-hidden="true"
          />
          <label htmlFor="manage-article-search" className="sr-only">
            חיפוש מאמרים
          </label>
          <input
            id="manage-article-search"
            type="search"
            placeholder="חיפוש מאמרים..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full min-h-[44px] pr-11 pl-4 rounded-xl border border-stone-300 bg-white text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
          />
        </div>
        <Link
          href="/manage/articles/new"
          className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs md:text-sm font-medium transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          מאמר חדש
        </Link>
      </div>

      {/* One filter row, carrying the counts. (A second strip of the same
          three counts used to sit above it and filter the same list.) */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
        {TABS.filter((t) => t.key === 'all' || counts[t.key] > 0 || filter === t.key).map((t) => (
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
            <span className={filter === t.key ? 'text-white/70' : 'text-stone-400'}>
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {filter === 'queue' ? (
        queuePending.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 md:p-12 text-center">
            <Download className="w-10 h-10 text-stone-300 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm md:text-base text-stone-600">התור ריק</p>
          </div>
        ) : (
          <>
            <p className="text-[11px] md:text-sm text-stone-500 leading-relaxed">
              מקורות שממתינים להמרה. ההמרה עצמה רצה בפייפליין, שמבצע כתיבה
              מחדש מלאה - אפשר לפנות כאן מקורות שלא רלוונטיים כדי שלא יגיעו אליה.
            </p>
            <ul className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 overflow-hidden">
              {queuePending.map((q) => (
                <li key={q.id} className="flex items-center gap-3 p-3 md:px-4">
                  <span className="flex-1 min-w-0 text-sm md:text-base text-stone-800 line-clamp-2">
                    {q.source_title || 'ללא כותרת'}
                  </span>
                  <button
                    onClick={() => parkQueueItem(q.id, 'skipped')}
                    className="min-h-[40px] px-4 rounded-xl border border-stone-200 text-stone-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-xs md:text-sm font-medium transition-colors flex-shrink-0"
                  >
                    דילוג
                  </button>
                </li>
              ))}
            </ul>
          </>
        )
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 md:p-12 text-center">
          <FileText className="w-10 h-10 text-stone-300 mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm md:text-base text-stone-600">
            {searchTerm ? 'לא נמצאו מאמרים התואמים לחיפוש' : 'אין מאמרים להצגה'}
          </p>
        </div>
      ) : (
        // One compact row per article: the title opens the editor, the status
        // and counters sit under it, and the actions sit beside it (under it
        // on a phone, so the title keeps the full width).
        <ul className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 overflow-hidden">
          {filtered.map((article) => {
            const status = articleStatus(article);
            const badge = STATUS_BADGE[status];
            return (
              <li key={article.id} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 p-3 md:px-4">
                {article.image_url && (
                  <div className="relative hidden sm:block w-16 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-stone-100">
                    <Image
                      src={article.image_url}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/manage/articles/edit/${article.id}`}
                    className="block text-sm md:text-base font-semibold text-stone-800 leading-snug line-clamp-2 hover:underline underline-offset-2"
                  >
                    {article.title}
                  </Link>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] md:text-xs text-stone-500">
                    <span
                      className={`${badge.cls} font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1`}
                    >
                      <badge.Icon className="w-3 h-3" aria-hidden="true" />
                      {badge.label}
                      {status === 'scheduled' && article.scheduled_publish_at && (
                        <> · {new Date(article.scheduled_publish_at).toLocaleDateString('he-IL')}</>
                      )}
                    </span>
                    <span className="inline-flex items-center gap-1" title="צפיות">
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      <span className="sr-only">צפיות</span>
                      {article.views_count || 0}
                    </span>
                    <span className="inline-flex items-center gap-1" title="לייקים">
                      <Heart className="w-3.5 h-3.5" aria-hidden="true" />
                      <span className="sr-only">לייקים</span>
                      {article.likes_count || 0}
                    </span>
                    <span>{new Date(article.created_date).toLocaleDateString('he-IL')}</span>
                    {!article.image_url && <span className="text-amber-700">ללא תמונה</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 self-end sm:self-auto -mb-1 sm:mb-0">
                  {status === 'scheduled' ? (
                    <>
                      <button
                        onClick={() => togglePublish(article.id, false)}
                        className="min-h-[36px] px-3 rounded-lg bg-green-50 hover:bg-green-100 text-green-800 text-xs font-medium transition-colors"
                      >
                        פרסום עכשיו
                      </button>
                      <button
                        onClick={() => cancelSchedule(article.id)}
                        className="min-h-[36px] px-2.5 rounded-lg text-stone-600 hover:bg-stone-100 text-xs font-medium transition-colors"
                      >
                        ביטול
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => togglePublish(article.id, article.is_published)}
                      className={`min-h-[36px] px-3 rounded-lg text-xs font-medium transition-colors ${
                        article.is_published
                          ? 'text-stone-600 hover:bg-stone-100'
                          : 'bg-green-50 hover:bg-green-100 text-green-800'
                      }`}
                    >
                      {article.is_published ? 'הסרת פרסום' : 'פרסום'}
                    </button>
                  )}
                  <Link
                    href={
                      status === 'published'
                        ? `/articles/${article.slug}`
                        : `/api/preview?secret=${process.env.NEXT_PUBLIC_PREVIEW_SECRET}&slug=${article.slug}`
                    }
                    target="_blank"
                    title="תצוגה מקדימה"
                    aria-label="תצוגה מקדימה"
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" aria-hidden="true" />
                  </Link>
                  <button
                    onClick={() => deleteArticle(article.id, article.title)}
                    title="מחיקה"
                    aria-label="מחיקת המאמר"
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function ManageArticlesPage() {
  // useSearchParams needs a Suspense boundary
  return (
    <Suspense fallback={<div className="py-20 text-center text-stone-500 text-sm">טוען...</div>}>
      <ManageArticlesInner />
    </Suspense>
  );
}
