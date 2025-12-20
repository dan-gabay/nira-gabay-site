'use client';

import { useEffect } from 'react';
import { trackArticleRead, trackArticleScrollDepth, trackArticleCompletion } from '@/lib/analytics';

type ArticleReadTrackerProps = {
  articleId: string;
  articleTitle: string;
};

export default function ArticleReadTracker({ articleId, articleTitle }: ArticleReadTrackerProps) {
  useEffect(() => {
    let hasTracked = false;
    let hasCompleted = false;
    let scrollTimeout: NodeJS.Timeout;
    const scrollDepthTracked = new Set<number>();
    const startTime = Date.now();

    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.scrollY;
        const scrollPercentage = Math.round(((scrollTop + windowHeight) / documentHeight) * 100);

        // Track milestones: 25%, 50%, 75%, 100%
        [25, 50, 75, 100].forEach((milestone) => {
          if (scrollPercentage >= milestone && !scrollDepthTracked.has(milestone)) {
            scrollDepthTracked.add(milestone);
            trackArticleScrollDepth(milestone, articleId);
          }
        });

        // Track article completion: 100% scroll + at least 2 minutes
        if (scrollPercentage >= 100 && !hasCompleted) {
          const readTime = Math.round((Date.now() - startTime) / 1000);
          if (readTime >= 120) { // 2 minutes
            hasCompleted = true;
            trackArticleCompletion(articleId, readTime);
          }
        }

        // Track if user scrolled at least 50% of the article
        if (scrollPercentage >= 50 && !hasTracked) {
          trackArticleRead(articleId, articleTitle);
          hasTracked = true;
        }
      }, 1000); // Wait 1 second after scroll stops
    };

    window.addEventListener('scroll', handleScroll);
    
    // Also track if user stays on page for 30 seconds
    const timeoutId = setTimeout(() => {
      if (!hasTracked) {
        trackArticleRead(articleId, articleTitle);
        hasTracked = true;
      }
    }, 30000); // 30 seconds

    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
      clearTimeout(timeoutId);
    };
  }, [articleId, articleTitle]);

  return null;
}
