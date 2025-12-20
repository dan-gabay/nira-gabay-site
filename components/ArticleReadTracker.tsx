'use client';

import { useEffect } from 'react';
import { trackArticleRead } from '@/lib/analytics';

type ArticleReadTrackerProps = {
  articleId: string;
  articleTitle: string;
};

export default function ArticleReadTracker({ articleId, articleTitle }: ArticleReadTrackerProps) {
  useEffect(() => {
    let hasTracked = false;
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      if (hasTracked) return;

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.scrollY;
        const scrollPercentage = (scrollTop + windowHeight) / documentHeight;

        // Track if user scrolled at least 50% of the article
        if (scrollPercentage >= 0.5) {
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

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
      clearTimeout(timeoutId);
    };
  }, [articleId, articleTitle]);

  return null;
}
