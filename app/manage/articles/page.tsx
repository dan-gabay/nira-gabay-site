'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import {
  Plus, Edit, Trash2, Eye, Heart,
  CheckCircle, XCircle, Clock, Search, FileText, Download,
} from 'lucide-react';
import Image from 'next/image';
import { useManageSummary } from '@/components/manage/ManageShell';

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
    return <div className="py-20 text-center text-stone-500 text-sm">טוען מאמרים...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl md:text-3xl font-bold text-stone-800">מאמרים</h1>
        <Link
          href="/manage/articles/new"
          className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs md:text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          מאמר חדש
        </Link>
      </div>

      {/* The content pipeline, end to end: what is waiting, what is written,
          what is live. Each stage is a filter, so the strip is navigation. */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {[
          { key: 'queue' as FilterKey, label: 'בתור', n: counts.queue, tone: 'text-stone-500' },
          { key: 'draft' as FilterKey, label: 'טיוטות', n: counts.draft, tone: 'text-amber-600' },
          { key: 'published' as FilterKey, label: 'באתר', n: counts.published, tone: 'text-emerald-600' },
        ].map((stage, i) => (
          <button
            key={stage.key}
            onClick={() => setFilter(stage.key)}
            aria-pressed={filter === stage.key}
            className={`relative bg-white rounded-2xl border p-3 md:p-4 text-center transition-colors ${
              filter === stage.key ? 'border-stone-800' : 'border-stone-200 hover:border-stone-300'
            }`}
          >
            <p className={`text-xl md:text-3xl font-bold leading-none ${stage.tone}`}>{stage.n}</p>
            <p className="text-[11px] md:text-sm text-stone-500 mt-1">{stage.label}</p>
            {i < 2 && (
              <span
                aria-hidden="true"
                className="hidden md:block absolute top-1/2 -left-2 -translate-y-1/2 text-stone-300"
              >
                ←
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
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

      {/* Status filter, doubling as the counts the old stat grid showed */}
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
            <div className="space-y-2">
              {queuePending.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center gap-3 bg-white rounded-2xl border border-stone-200 p-3 md:p-4"
                >
                  <span className="flex-1 min-w-0 text-sm md:text-base text-stone-800 line-clamp-2">
                    {q.source_title || 'ללא כותרת'}
                  </span>
                  <button
                    onClick={() => parkQueueItem(q.id, 'skipped')}
                    className="min-h-[44px] px-4 rounded-xl border border-stone-200 text-stone-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-xs md:text-sm font-medium transition-colors flex-shrink-0"
                  >
                    דילוג
                  </button>
                </div>
              ))}
            </div>
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
        <div className="space-y-3">
          {filtered.map((article) => {
            const status = articleStatus(article);
            const badge = STATUS_BADGE[status];
            return (
              <article
                key={article.id}
                className="bg-white rounded-2xl border border-stone-200 p-3 md:p-4 space-y-3"
              >
                <div className="flex items-stretch gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      <span
                        className={`${badge.cls} text-[11px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 flex-shrink-0`}
                      >
                        <badge.Icon className="w-3 h-3" aria-hidden="true" />
                        {badge.label}
                      </span>
                    </div>
                    <h2 className="text-sm md:text-lg font-bold text-stone-800 leading-snug line-clamp-2">
                      {article.title}
                    </h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] md:text-xs text-stone-500">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        {article.views_count || 0}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" aria-hidden="true" />
                        {article.likes_count || 0}
                      </span>
                      <span>{new Date(article.created_date).toLocaleDateString('he-IL')}</span>
                      {status === 'scheduled' && article.scheduled_publish_at && (
                        <span className="text-blue-600">
                          {new Date(article.scheduled_publish_at).toLocaleString('he-IL', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="relative w-20 md:w-28 flex-shrink-0 self-stretch min-h-[68px] rounded-xl overflow-hidden bg-amber-50 border border-amber-100">
                    {article.image_url ? (
                      <Image
                        src={article.image_url}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="112px"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-amber-600 text-center px-1">
                        ללא תמונה
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions: edit and publish carry the weight, the rest are icons */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/manage/articles/edit/${article.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs md:text-sm font-medium transition-colors"
                  >
                    <Edit className="w-4 h-4" aria-hidden="true" />
                    עריכה
                  </Link>

                  {status === 'scheduled' ? (
                    <>
                      <button
                        onClick={() => togglePublish(article.id, false)}
                        className="flex-1 min-h-[44px] rounded-xl bg-green-100 hover:bg-green-200 text-green-800 text-xs md:text-sm font-medium transition-colors"
                      >
                        פרסום עכשיו
                      </button>
                      <button
                        onClick={() => cancelSchedule(article.id)}
                        className="min-h-[44px] px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs md:text-sm font-medium transition-colors"
                      >
                        ביטול
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => togglePublish(article.id, article.is_published)}
                      className={`flex-1 min-h-[44px] rounded-xl text-xs md:text-sm font-medium transition-colors ${
                        article.is_published
                          ? 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                          : 'bg-green-100 hover:bg-green-200 text-green-800'
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
                    className="w-11 h-11 flex items-center justify-center rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50 transition-colors flex-shrink-0"
                  >
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  </Link>
                  <button
                    onClick={() => deleteArticle(article.id, article.title)}
                    title="מחיקה"
                    aria-label="מחיקת המאמר"
                    className="w-11 h-11 flex items-center justify-center rounded-xl border border-stone-200 text-stone-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
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
