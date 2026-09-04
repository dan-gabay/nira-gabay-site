'use client';

import { useEffect, useRef } from 'react';
import { trackArticleRead, trackArticleCompletion } from '@/lib/analytics';

type ArticleReadTrackerProps = {
  articleId: string;
  articleTitle: string;
  /** Minutes, from articles.reading_time. Sets the bar for "finished". */
  readingTime?: number;
};

/**
 * The article-specific read signals. Generic scroll-depth events fire from
 * AnalyticsProvider for every page; this adds "read" and "completed".
 *
 * article_completed had never fired once - 0 events against 19 reads - and it
 * was not that nobody finishes. Three separate reasons, all mechanical:
 *
 *   1. The condition was only re-evaluated inside the scroll handler. Someone
 *      who reached the bottom at 0:80 and stopped scrolling was never checked
 *      again, so the two-minute clause could not come true. Reaching the end
 *      and then sitting still to read is the exact behaviour of a finisher.
 *   2. "100% of the document" is not "end of the article". Below the article
 *      body sit related articles, a newsletter form, comments and a banner, so
 *      it demanded scrolling past all of that.
 *   3. Two minutes flat, against articles that run 3 to 9 minutes.
 *
 * So: the end of the article body is marked by this component's own position
 * in the tree - it renders immediately after </article> - and watched with an
 * IntersectionObserver. Time is counted only while the tab is actually visible,
 * checked once a second rather than only on scroll, and the bar scales with the
 * article. article_read is deliberately left exactly as it was; it works.
 */
export default function ArticleReadTracker({
  articleId,
  articleTitle,
  readingTime,
}: ArticleReadTrackerProps) {
  const endRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    let hasTracked = false;
    let hasCompleted = false;
    let reachedEnd = false;
    let activeMs = 0;
    let scrollTimeout: NodeJS.Timeout;

    // 40% of the estimated reading time, floored and capped so neither a
    // three-minute piece nor a nine-minute one gets an absurd bar.
    const needMs =
      Math.min(180, Math.max(45, Math.round((readingTime || 5) * 60 * 0.4))) * 1000;

    const maybeComplete = () => {
      if (hasCompleted || !reachedEnd || activeMs < needMs) return;
      hasCompleted = true;
      trackArticleCompletion(articleId, Math.round(activeMs / 1000));
      clearInterval(ticker);
    };

    // Reading time, not wall-clock time: an article opened in a background tab
    // and forgotten used to accumulate the full two minutes on its own.
    const ticker = setInterval(() => {
      if (document.visibilityState === 'visible') {
        activeMs += 1000;
        maybeComplete();
      }
    }, 1000);

    // Unchanged: 50% of the page, or 30 seconds, marks the article as read.
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (hasTracked) return;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.scrollY;
        const scrollPercentage = Math.round(((scrollTop + windowHeight) / documentHeight) * 100);
        if (scrollPercentage >= 50) {
          trackArticleRead(articleId, articleTitle);
          hasTracked = true;
        }
      }, 1000);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Also track if user stays on page for 30 seconds
    const timeoutId = setTimeout(() => {
      if (!hasTracked) {
        trackArticleRead(articleId, articleTitle);
        hasTracked = true;
      }
    }, 30000); // 30 seconds

    // The end of the article body is wherever this component sits, which is
    // directly after </article>. Once it has been seen, it stays seen.
    // No rootMargin: the marker entering the viewport at all means the last
    // line of the article has been reached, which is the whole definition.
    // Shrinking the root would quietly reintroduce a dependency on how much
    // content happens to sit below the article.
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        reachedEnd = true;
        maybeComplete();
      }
    });
    if (endRef.current) observer.observe(endRef.current);

    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
      clearInterval(ticker);
      clearTimeout(scrollTimeout);
      clearTimeout(timeoutId);
    };
  }, [articleId, articleTitle, readingTime]);

  // 1px rather than zero: IntersectionObserver reports a zero-area target
  // inconsistently, and this element exists only to be observed.
  return <span ref={endRef} aria-hidden="true" className="block h-px" />;
}
