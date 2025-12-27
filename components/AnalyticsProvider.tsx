'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  identifyVisitorType,
  trackScrollDepth,
  trackEngagementTime,
  trackPagePerformance,
  trackFunnelStage,
} from '@/lib/analytics';

// Determine page type from pathname
const getPageType = (pathname: string): string => {
  if (pathname === '/') return 'homepage';
  if (pathname === '/about') return 'about';
  if (pathname === '/contact') return 'contact';
  if (pathname === '/articles') return 'articles_list';
  if (pathname.startsWith('/articles/')) return 'article';
  return 'other';
};

// Determine page ID for articles
const getPageId = (pathname: string): string | undefined => {
  if (pathname.startsWith('/articles/')) {
    return pathname.replace('/articles/', '');
  }
  return undefined;
};

// Determine funnel stage from page
const getFunnelStage = (pathname: string): 'awareness' | 'interest' | 'consideration' | 'intent' | null => {
  if (pathname === '/') return 'awareness';
  if (pathname === '/articles' || pathname.startsWith('/articles/')) return 'interest';
  if (pathname === '/about') return 'consideration';
  if (pathname === '/contact') return 'intent';
  return null;
};

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const scrollThresholdsReached = useRef<Set<number>>(new Set());
  const timeThresholdsReached = useRef<Set<number>>(new Set());
  const startTime = useRef<number>(Date.now());
  const engagementInterval = useRef<NodeJS.Timeout | null>(null);

  // Identify visitor type on mount
  useEffect(() => {
    identifyVisitorType();
    
    // Track page performance
    if (typeof window !== 'undefined' && window.performance) {
      const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (timing) {
        const loadTime = Math.round(timing.loadEventEnd - timing.startTime);
        if (loadTime > 0) {
          trackPagePerformance(loadTime, getPageType(pathname));
        }
      }
    }
  }, [pathname]);

  // Reset on page change
  useEffect(() => {
    scrollThresholdsReached.current.clear();
    timeThresholdsReached.current.clear();
    startTime.current = Date.now();

    // Track funnel stage
    const funnelStage = getFunnelStage(pathname);
    if (funnelStage) {
      trackFunnelStage(funnelStage, pathname);
    }

    return () => {
      if (engagementInterval.current) {
        clearInterval(engagementInterval.current);
      }
    };
  }, [pathname]);

  // Scroll tracking
  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = Math.round((scrollTop / docHeight) * 100);
    
    const thresholds = [25, 50, 75, 90, 100];
    for (const threshold of thresholds) {
      if (scrollPercent >= threshold && !scrollThresholdsReached.current.has(threshold)) {
        scrollThresholdsReached.current.add(threshold);
        trackScrollDepth(threshold, getPageType(pathname), getPageId(pathname));
      }
    }
  }, [pathname]);

  // Set up scroll listener
  useEffect(() => {
    let ticking = false;
    
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [handleScroll]);

  // Engagement time tracking
  useEffect(() => {
    const checkEngagementTime = () => {
      const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
      const milestones = [30, 60, 120, 180, 300];
      
      for (const milestone of milestones) {
        if (elapsed >= milestone && !timeThresholdsReached.current.has(milestone)) {
          timeThresholdsReached.current.add(milestone);
          trackEngagementTime(milestone, getPageType(pathname), getPageId(pathname));
        }
      }
    };

    engagementInterval.current = setInterval(checkEngagementTime, 10000); // Check every 10s
    
    return () => {
      if (engagementInterval.current) {
        clearInterval(engagementInterval.current);
      }
    };
  }, [pathname]);

  return <>{children}</>;
}
