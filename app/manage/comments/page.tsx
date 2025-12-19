'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { 
  ArrowRight,
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

      console.log('Comments data:', commentsData);
      console.log('Comments error:', commentsError);
      
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
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-600">טוען תגובות...</p>
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
          <h1 className="text-3xl font-bold text-stone-800 mb-4">ניהול תגובות</h1>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              ממתינות לאישור ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'approved'
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              מאושרות ({approvedCount})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              הכל ({comments.length})
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Comments List */}
        <div className="space-y-4">
          {filteredComments.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-12 text-center">
              <MessageSquare className="w-16 h-16 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-600">
                {filter === 'pending' && 'אין תגובות ממתינות לאישור'}
                {filter === 'approved' && 'אין תגובות מאושרות'}
                {filter === 'all' && 'אין תגובות עדיין'}
              </p>
            </div>
          ) : (
            filteredComments.map((comment) => (
              <div
                key={comment.id}
                className={`bg-white rounded-xl shadow-sm border-2 p-6 ${
                  comment.is_approved 
                    ? 'border-green-200' 
                    : 'border-amber-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2 text-stone-800 font-medium">
                        <User className="w-4 h-4" />
                        {comment.author_name}
                      </div>
                      {comment.author_email && (
                        <div className="flex items-center gap-2 text-stone-600 text-sm">
                          <Mail className="w-4 h-4" />
                          {comment.author_email}
                        </div>
                      )}
                    </div>
                    {comment.article ? (
                      <Link
                        href={`/articles/${comment.article.slug}`}
                        target="_blank"
                        className="text-sm text-amber-600 hover:text-amber-700"
                      >
                        מאמר: {comment.article.title}
                      </Link>
                    ) : (
                      <span className="text-sm text-stone-500">
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
                <div className="bg-stone-50 rounded-lg p-4 mb-4">
                  <p className="text-stone-800 whitespace-pre-wrap">{comment.content}</p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-stone-500">
                    {new Date(comment.created_date).toLocaleString('he-IL')}
                  </div>

                  <div className="flex items-center gap-2">
                    {!comment.is_approved && (
                      <button
                        onClick={() => approveComment(comment.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        אשר
                      </button>
                    )}
                    
                    {comment.is_approved && (
                      <button
                        onClick={() => rejectComment(comment.id)}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        בטל אישור
                      </button>
                    )}

                    <button
                      onClick={() => deleteComment(comment.id)}
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
