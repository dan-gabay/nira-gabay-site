'use client';

import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Facebook, Send, User, Mail, Loader2, Instagram } from 'lucide-react';
import { getUserIdentifier } from '@/lib/userIdentifier';
import { supabase as supabaseClient } from '@/lib/supabaseClient';
import { trackArticleLike, trackCommentSubmit, trackArticleShare, trackWhatsAppClick } from '@/lib/analytics';

type ArticleInteractionsProps = {
  articleId: string;
  initialLikesCount: number;
  initialViewsCount: number;
};

type Comment = {
  id: string;
  author_name: string;
  author_email: string;
  content: string;
  created_date: string;
};

export default function ArticleInteractions({ 
  articleId, 
  initialLikesCount,
  initialViewsCount 
}: ArticleInteractionsProps) {
  const [hasLiked, setHasLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLiking, setIsLiking] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const [commentForm, setCommentForm] = useState({
    author_name: '',
    author_email: '',
    content: ''
  });

  // בדיקה אם המשתמש כבר נתן לייק
  useEffect(() => {
    checkUserLike();
    loadComments();
    incrementViewCount();
  }, [articleId]);

  // הצגת toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  async function checkUserLike() {
    const userIdentifier = getUserIdentifier();
    const { data } = await supabaseClient
      .from('article_likes')
      .select('id')
      .eq('article_id', articleId)
      .eq('user_identifier', userIdentifier)
      .single();
    
    setHasLiked(!!data);
  }

  async function loadComments() {
    const { data } = await supabaseClient
      .from('comments')
      .select('*')
      .eq('article_id', articleId)
      .eq('is_approved', true)
      .order('created_date', { ascending: false });
    
    setComments(data || []);
    setIsLoadingComments(false);
  }

  async function incrementViewCount() {
    // עדכון ספירת הצפיות (רק אם טרם נספר היום)
    const lastViewedKey = `article_viewed_${articleId}`;
    const lastViewed = localStorage.getItem(lastViewedKey);
    const today = new Date().toDateString();
    
    if (lastViewed !== today) {
      await supabaseClient
        .from('articles')
        .update({ views_count: initialViewsCount + 1 })
        .eq('id', articleId);
      
      localStorage.setItem(lastViewedKey, today);
    }
  }

  async function handleLike() {
    if (hasLiked || isLiking) return;
    
    setIsLiking(true);
    const userIdentifier = getUserIdentifier();
    
    try {
      // הוספת לייק
      const { error: likeError } = await supabaseClient
        .from('article_likes')
        .insert({ 
          id: crypto.randomUUID(),
          article_id: articleId, 
          user_identifier: userIdentifier,
          created_date: new Date().toISOString()
        });
      
      if (likeError) throw likeError;
      
      // עדכון מונה הלייקים
      const newLikesCount = likesCount + 1;
      await supabaseClient
        .from('articles')
        .update({ likes_count: newLikesCount })
        .eq('id', articleId);
      
      setLikesCount(newLikesCount);
      setHasLiked(true);
      setToastMessage('תודה על הלייק! ❤️');
      
      // Track conversion
      trackArticleLike(articleId, document.title);
    } catch (error) {
      console.error('Error liking article:', error);
      setToastMessage('משהו השתבש, נסו שוב');
    } finally {
      setIsLiking(false);
    }
  }

  async function handleSubmitComment() {
    if (!commentForm.author_name || !commentForm.content) {
      setToastMessage('נא למלא את כל השדות הנדרשים');
      return;
    }
    
    setIsSubmittingComment(true);
    
    try {
      const { error } = await supabaseClient
        .from('comments')
        .insert({
          id: crypto.randomUUID(),
          article_id: articleId,
          author_name: commentForm.author_name,
          author_email: commentForm.author_email,
          content: commentForm.content,
          is_approved: false,
          created_date: new Date().toISOString()
        });
      
      if (error) throw error;
      
      // Track conversion
      trackCommentSubmit(articleId);
      
      setCommentForm({ author_name: '', author_email: '', content: '' });
      setToastMessage('התגובה נשלחה! היא תפורסם לאחר אישור');
    } catch (error) {
      console.error('Error submitting comment:', error);
      setToastMessage('משהו השתבש, נסו שוב');
    } finally {
      setIsSubmittingComment(false);
    }
  }

  function shareOnWhatsApp() {
    const url = window.location.href;
    const text = `קראו את המאמר הזה מאת נירה גבאי`;
    trackArticleShare('whatsapp', articleId, document.title);
    trackWhatsAppClick('article_share');
    window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
  }

  function shareOnFacebook() {
    const url = window.location.href;
    trackArticleShare('facebook', articleId, document.title);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  }

  function shareOnInstagram() {
    const url = window.location.href;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Track conversion
    trackArticleShare('instagram', articleId, document.title);
    
    if (isMobile) {
      // Try to open Instagram app directly
      const instagramUrl = `instagram://story-camera`;
      window.location.href = instagramUrl;
      
      // Fallback: copy to clipboard after a delay (if app didn't open)
      setTimeout(() => {
        navigator.clipboard.writeText(url);
        setToastMessage('הקישור הועתק! הדביקו אותו בסטורי של Instagram');
      }, 1000);
    } else {
      // Desktop: copy URL and notify
      navigator.clipboard.writeText(url);
      setToastMessage('הקישור הועתק! פתחו את Instagram במובייל והדביקו בסטורי');
    }
  }

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-stone-800 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t border-b border-stone-200">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            disabled={hasLiked || isLiking}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              hasLiked 
                ? 'bg-rose-500 text-white' 
                : 'border-2 border-stone-300 text-stone-700 hover:border-rose-500 hover:text-rose-500'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Heart className={`w-5 h-5 ${hasLiked ? 'fill-white' : ''}`} />
            {hasLiked ? 'אהבתי!' : 'לייק'} ({likesCount})
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-stone-500 text-sm">שתפו:</span>
          <button
            onClick={shareOnWhatsApp}
            className="p-2 border-2 border-stone-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all"
            aria-label="שתף בוואטסאפ"
          >
            <MessageCircle className="w-5 h-5 text-green-600" />
          <button
            onClick={shareOnInstagram}
            className="p-2 border-2 border-stone-300 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition-all"
            aria-label="שתף באינסטגרם"
          >
            <Instagram className="w-5 h-5 text-pink-600" />
          </button>
          </button>
          <button
            onClick={shareOnFacebook}
            className="p-2 border-2 border-stone-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
            aria-label="שתף בפייסבוק"
          >
            <Facebook className="w-5 h-5 text-blue-600" />
          </button>
        </div>
      </div>

      {/* Comments Section */}
      <section className="mt-12">
        <h3 className="text-2xl font-bold text-stone-800 mb-8 font-serif">
          תגובות ({comments.length})
        </h3>

        {/* Comment Form */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-lg border border-stone-100 mb-8">
          <h4 className="text-lg font-bold text-stone-800 mb-4">השאירו תגובה</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="relative">
              <User className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                placeholder="שם *"
                value={commentForm.author_name}
                onChange={(e) => setCommentForm({ ...commentForm, author_name: e.target.value })}
                className="w-full pr-10 pl-4 py-3 border-2 border-stone-200 rounded-lg focus:border-amber-500 focus:outline-none transition-colors"
              />
            </div>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="email"
                placeholder="אימייל (לא יפורסם)"
                value={commentForm.author_email}
                onChange={(e) => setCommentForm({ ...commentForm, author_email: e.target.value })}
                className="w-full pr-10 pl-4 py-3 border-2 border-stone-200 rounded-lg focus:border-amber-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
          
          <textarea
            placeholder="התגובה שלכם *"
            value={commentForm.content}
            onChange={(e) => setCommentForm({ ...commentForm, content: e.target.value })}
            className="w-full px-4 py-3 border-2 border-stone-200 rounded-lg focus:border-amber-500 focus:outline-none transition-colors mb-4 min-h-24 resize-y"
          />
          
          <div className="flex justify-between items-center">
            <p className="text-sm text-stone-500">התגובה תפורסם לאחר אישור</p>
            <button
              onClick={handleSubmitComment}
              disabled={!commentForm.author_name || !commentForm.content || isSubmittingComment}
              className="flex items-center gap-2 bg-stone-800 hover:bg-stone-900 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmittingComment ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  שליחה
                </>
              )}
            </button>
          </div>
        </div>

        {/* Comments List */}
        {isLoadingComments ? (
          <div className="text-center py-8 text-stone-500">טוען תגובות...</div>
        ) : comments.length > 0 ? (
          <div className="space-y-6">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-stone-50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-200 to-stone-200 flex items-center justify-center">
                    <span className="text-sm font-bold text-stone-700">
                      {comment.author_name?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-stone-800">{comment.author_name}</p>
                    <p className="text-xs text-stone-500">
                      {new Date(comment.created_date).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                </div>
                <p className="text-stone-600 leading-relaxed">{comment.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-stone-500 py-8">
            אין תגובות עדיין. היו הראשונים להגיב!
          </p>
        )}
      </section>
    </>
  );
}
