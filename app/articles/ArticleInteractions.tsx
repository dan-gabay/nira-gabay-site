'use client';

import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Facebook, Instagram, Share2, Link2 } from 'lucide-react';
import { getUserIdentifier } from '@/lib/userIdentifier';
import { supabase as supabaseClient } from '@/lib/supabaseClient';
import { trackArticleLike, trackArticleShare, reportSiteError } from '@/lib/analytics';
import { FACEBOOK_APP_ID } from '@/lib/facebook';
import { isOptedOut } from '@/lib/ownerOptOut';

// The Postgres/PostgREST code when there is one (e.g. 42501 for a policy
// refusal), never the message: these writes go straight from the browser to
// Supabase, so no server route sees them fail.
function supabaseErrorReason(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && code ? `db_${code}` : 'network';
}

type ArticleInteractionsProps = {
  articleId: string;
  initialLikesCount: number;
  initialViewsCount: number;
};

export default function ArticleInteractions({ 
  articleId, 
  initialLikesCount,
  initialViewsCount 
}: ArticleInteractionsProps) {
  const [hasLiked, setHasLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLiking, setIsLiking] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [canNativeShare, setCanNativeShare] = useState(false);

  // בדיקה אם המשתמש כבר נתן לייק
  useEffect(() => {
    checkUserLike();
    incrementViewCount();
    // navigator.share is only known on the client (avoid hydration mismatch)
    setCanNativeShare(typeof navigator !== 'undefined' && !!navigator.share);
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

  async function incrementViewCount() {
    // The owner rereading an article is not a view (lib/ownerOptOut.ts).
    if (isOptedOut()) return;
    // עדכון ספירת הצפיות (רק אם טרם נספר היום)
    const lastViewedKey = `article_viewed_${articleId}`;
    const lastViewed = localStorage.getItem(lastViewedKey);
    const today = new Date().toDateString();
    
    if (lastViewed !== today) {
      // Atomic increment via RPC; fall back to the old read-modify-write
      // update if the function doesn't exist yet in the DB.
      const { error: rpcError } = await supabaseClient
        .rpc('increment_article_views', { aid: articleId });

      if (rpcError) {
        await supabaseClient
          .from('articles')
          .update({ views_count: initialViewsCount + 1 })
          .eq('id', articleId);
      }

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

      // עדכון מונה הלייקים - atomic increment via RPC; fall back to the old
      // read-modify-write update if the function doesn't exist yet in the DB.
      const newLikesCount = likesCount + 1;
      const { error: rpcError } = await supabaseClient
        .rpc('increment_article_likes', { aid: articleId });

      if (rpcError) {
        await supabaseClient
          .from('articles')
          .update({ likes_count: newLikesCount })
          .eq('id', articleId);
      }

      setLikesCount(newLikesCount);
      setHasLiked(true);
      setToastMessage('תודה על הלייק! ❤️');
      
      // Track conversion
      trackArticleLike(articleId, document.title);
    } catch (error) {
      console.error('Error liking article:', error);
      reportSiteError('like', supabaseErrorReason(error));
      setToastMessage('משהו השתבש, נסו שוב');
    } finally {
      setIsLiking(false);
    }
  }

  async function shareNative() {
    trackArticleShare('native', articleId, document.title);
    try {
      await navigator.share({ title: document.title, url: window.location.href });
    } catch {
      // User cancelled the share sheet - nothing to do
    }
  }

  async function copyLink() {
    trackArticleShare('copy_link', articleId, document.title);
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToastMessage('הקישור הועתק!');
    } catch {
      setToastMessage('משהו השתבש, נסו שוב');
    }
  }

  function shareOnWhatsApp() {
    const url = window.location.href;
    const text = `קראו את המאמר הזה מאת נירה גבאי`;
    // Deliberately NOT trackWhatsAppClick: that is the "reached out to Nira"
    // event and it now reports a conversion to the ad platforms. Sharing an
    // article to WhatsApp is the opposite direction of traffic.
    trackArticleShare('whatsapp', articleId, document.title);
    window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
  }

  function shareOnFacebook() {
    // The canonical address, not location.href: a visitor who arrived from an
    // ad or a Facebook post carries gclid/fbclid/utm params, and those would
    // otherwise be baked into every re-share.
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
    const url = canonical || window.location.origin + window.location.pathname;
    trackArticleShare('facebook', articleId, document.title);

    // The official Share Dialog, not sharer.php: on a phone with the Facebook
    // app installed, sharer.php is handed to the app, which opens on its feed
    // and drops the link, while dialog/share stays in the browser and opens
    // the post composer. The dialog needs a live Facebook app whose App
    // Domains list niragabay.com - otherwise Facebook shows "the link may be
    // broken". sharer.php is only the fallback if the app id is ever cleared.
    //
    // Only app_id and href: with display=popup and redirect_uri added, the
    // dialog failed with the same "link may be broken" error, while the bare
    // URL opened the composer (tested by Dan, 2026-10-16). Facebook picks the
    // right display for the device itself.
    const appId = FACEBOOK_APP_ID;
    const target = appId
      ? `https://www.facebook.com/dialog/share?app_id=${encodeURIComponent(appId)}` +
        `&href=${encodeURIComponent(url)}`
      : `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

    // Window features belong in the third argument - window.open takes three.
    window.open(target, '_blank', 'noopener,noreferrer,width=600,height=600');
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
      {/* Like and share are one gesture, so from md up they sit together in
          the middle rather than at opposite ends of an 832px column - the
          same 467px of dead space the closing banner had. The rules stay on
          the row, not a wrapper, so the rules above and below stay full
          width. Below sm the row is a column and none of this applies. */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 md:justify-center md:gap-10 py-4 md:py-6 border-t border-b border-stone-200">
        <button
          onClick={handleLike}
          disabled={hasLiked || isLiking}
          className={`flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full text-sm md:text-base font-medium transition-all ${
            hasLiked
              ? 'bg-rose-500 text-white'
              : 'border-2 border-stone-300 text-stone-700 hover:border-rose-500 hover:text-rose-500'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Heart className={`w-4 h-4 md:w-5 md:h-5 ${hasLiked ? 'fill-white' : ''}`} />
          {hasLiked ? 'אהבתי!' : 'לייק'}
          {likesCount > 0 && ` (${likesCount})`}
        </button>

        {/* Uniform circular icon buttons in one row - the old mix of
            text-labelled and icon-only buttons wrapped to two ragged rows
            on mobile. */}
        <div className="flex items-center gap-2 md:gap-2.5">
          <span className="text-stone-500 text-xs md:text-sm ml-1">שתפו:</span>
          {canNativeShare && (
            <button
              onClick={shareNative}
              aria-label="שיתוף"
              title="שיתוף"
              className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full border-2 border-stone-200 text-amber-700 hover:border-amber-500 hover:bg-amber-50 transition-all"
            >
              <Share2 className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          )}
          <button
            onClick={shareOnWhatsApp}
            aria-label="שיתוף בוואטסאפ"
            title="וואטסאפ"
            className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full border-2 border-stone-200 text-green-600 hover:border-green-500 hover:bg-green-50 transition-all"
          >
            <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            onClick={shareOnFacebook}
            aria-label="שיתוף בפייסבוק"
            title="פייסבוק"
            className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full border-2 border-stone-200 text-blue-600 hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <Facebook className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            onClick={shareOnInstagram}
            aria-label="שיתוף באינסטגרם"
            title="אינסטגרם"
            className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full border-2 border-stone-200 text-pink-600 hover:border-pink-500 hover:bg-pink-50 transition-all"
          >
            <Instagram className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            onClick={copyLink}
            aria-label="העתקת קישור"
            title="העתקת קישור"
            className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full border-2 border-stone-200 text-stone-600 hover:border-amber-500 hover:bg-amber-50 transition-all"
          >
            <Link2 className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>

    </>
  );
}
