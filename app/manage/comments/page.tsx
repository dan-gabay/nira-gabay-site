'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { 
  CheckCircle,
  XCircle,
  Trash2,
  MessageSquare,
  Clock,
  User,
  Mail
} from 'lucide-react';

type Comment = {
  id: string;
  article_id: string;
  author_name: string;
  author_email: string;
  content: string;
  is_approved: boolean;
  created_date: string;
  article?: {
    title: string;
    slug: string;
  };
};

export default function ManageCommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');

  useEffect(() => {
    loadComments();
  }, []);

  async function loadComments() {
    try {
      // First get all comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .order('created_date', { ascending: false });

      if (commentsError) throw commentsError;
      
      // Then get articles separately
      if (commentsData && commentsData.length > 0) {
        const articleIds = [...new Set(commentsData.map(c => c.article_id))];
        const { data: articlesData } = await supabase
          .from('articles')
          .select('id, title, slug')
          .in('id', articleIds);
        
        const articlesMap = new Map(articlesData?.map(a => [a.id, a]) || []);
        
        const commentsWithArticles = commentsData.map(comment => ({
          ...comment,
          article: articlesMap.get(comment.article_id) || undefined
        }));
        
        setComments(commentsWithArticles);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function approveComment(id: string) {
    try {
      const { error } = await supabase
        .from('comments')
        .update({ is_approved: true })
        .eq('id', id);

      if (error) throw error;
      
      setComments(comments.map(c => 
        c.id === id ? { ...c, is_approved: true } : c
      ));
    } catch (error) {
      console.error('Error approving comment:', error);
      alert('שגיאה באישור התגובה');
    }
  }

  async function rejectComment(id: string) {
    try {
      const { error } = await supabase
        .from('comments')
        .update({ is_approved: false })
        .eq('id', id);

      if (error) throw error;
      
      setComments(comments.map(c => 
        c.id === id ? { ...c, is_approved: false } : c
      ));
    } catch (error) {
      console.error('Error rejecting comment:', error);
      alert('שגיאה בדחיית התגובה');
    }
  }

  async function deleteComment(id: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק את התגובה?')) return;

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setComments(comments.filter(c => c.id !== id));
      alert('התגובה נמחקה בהצלחה');
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('שגיאה במחיקת התגובה');
    }
  }

  const filteredComments = comments.filter(comment => {
    if (filter === 'pending') return !comment.is_approved;
    if (filter === 'approved') return comment.is_approved;
    return true;
  });

  const pendingCount = comments.filter(c => !c.is_approved).length;
  const approvedCount = comments.filter(c => c.is_approved).length;

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-600">טוען תגובות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-stone-800 mb-3 md:mb-4">ניהול תגובות</h1>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 min-h-[40px] rounded-full text-xs md:text-sm font-medium whitespace-nowrap flex-shrink-0 border transition-colors ${
                filter === 'pending'
                  ? 'bg-stone-800 text-white border-stone-800'
                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                }`}
            >
              ממתינות לאישור ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 min-h-[40px] rounded-full text-xs md:text-sm font-medium whitespace-nowrap flex-shrink-0 border transition-colors ${
                filter === 'approved'
                  ? 'bg-stone-800 text-white border-stone-800'
                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                }`}
            >
              מאושרות ({approvedCount})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 min-h-[40px] rounded-full text-xs md:text-sm font-medium whitespace-nowrap flex-shrink-0 border transition-colors ${
                filter === 'all'
                  ? 'bg-stone-800 text-white border-stone-800'
                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                }`}
            >
              הכל ({comments.length})
            </button>
          </div>
        </div>
      </div>

      <div>
        {/* Comments List */}
        <div className="space-y-3">
          {filteredComments.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-8 md:p-12 text-center">
              <MessageSquare className="w-10 h-10 text-stone-300 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm md:text-base text-stone-600">
                {filter === 'pending' && 'אין תגובות ממתינות לאישור'}
                {filter === 'approved' && 'אין תגובות מאושרות'}
                {filter === 'all' && 'אין תגובות עדיין'}
              </p>
            </div>
          ) : (
            filteredComments.map((comment) => (
              <div
                key={comment.id}
                className={`bg-white rounded-2xl border p-3.5 md:p-5 ${
                  comment.is_approved 
                    ? 'border-stone-200' 
                    : 'border-amber-200 ring-1 ring-amber-100'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1.5">
                      <div className="flex items-center gap-1.5 text-stone-800 text-sm md:text-base font-medium">
                        <User className="w-4 h-4" />
                        {comment.author_name}
                      </div>
                      {comment.author_email && (
                        <div className="flex items-center gap-1.5 text-stone-500 text-[11px] md:text-sm min-w-0 truncate">
                          <Mail className="w-4 h-4" />
                          {comment.author_email}
                        </div>
                      )}
                    </div>
                    {comment.article ? (
                      <Link
                        href={`/articles/${comment.article.slug}`}
                        target="_blank"
                        className="text-[11px] md:text-sm text-amber-600 hover:text-amber-700 line-clamp-1"
                      >
                        מאמר: {comment.article.title}
                      </Link>
                    ) : (
                      <span className="text-[11px] md:text-sm text-stone-500">
                        מאמר: {comment.article_id} (לא נמצא)
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {comment.is_approved ? (
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        מאושר
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-800 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        ממתין
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="bg-stone-50 rounded-xl p-3 md:p-4 mb-3">
                  <p className="text-xs md:text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                </div>

                {/* Footer */}
                <div className="flex flex-col gap-2.5">
                  <div className="text-[11px] md:text-xs text-stone-400">
                    {new Date(comment.created_date).toLocaleString('he-IL')}
                  </div>

                  <div className="flex items-center gap-2">
                    {!comment.is_approved && (
                      <button
                        onClick={() => approveComment(comment.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white min-h-[44px] rounded-xl text-xs md:text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        אשר
                      </button>
                    )}
                    
                    {comment.is_approved && (
                      <button
                        onClick={() => rejectComment(comment.id)}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white min-h-[44px] rounded-xl text-xs md:text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        בטל אישור
                      </button>
                    )}

                    <button
                      onClick={() => deleteComment(comment.id)}
                      className="min-h-[44px] px-4 border border-stone-200 text-stone-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-xl text-xs md:text-sm font-medium flex items-center justify-center gap-1.5 transition-colors flex-shrink-0"
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
