'use client';

import { useEffect, useRef } from 'react';
import { trackViewItem, trackSelectContent, trackUserInterest } from '@/lib/analytics';

interface ArticleViewTrackerProps {
  articleId: string;
  articleTitle: string;
  articleCategory?: string;
  tags?: string[];
}

export default function ArticleViewTracker({ 
  articleId, 
  articleTitle, 
  articleCategory = 'מאמרים',
  tags = []
}: ArticleViewTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    // Track GA4 recommended view_item event
    trackViewItem(articleId, articleTitle, articleCategory);
    
    // Track select_content
    trackSelectContent('article', articleId, articleTitle);
    
    // Track user interests based on tags
    tags.forEach(tag => {
      trackUserInterest(tag);
    });
  }, [articleId, articleTitle, articleCategory, tags]);

  return null;
}
