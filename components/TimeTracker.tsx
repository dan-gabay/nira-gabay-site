'use client';

import { useEffect, useRef } from 'react';
import { trackTimeMilestone, trackReturningVisitor } from '@/lib/analytics';

export default function TimeTracker() {
  const milestones = useRef(new Set<number>());
  const startTime = useRef(Date.now());

  useEffect(() => {
    // Track returning visitors
    const visitKey = 'site_visit_count';
    const visitCount = parseInt(localStorage.getItem(visitKey) || '0') + 1;
    localStorage.setItem(visitKey, visitCount.toString());
    
    if (visitCount > 1) {
      trackReturningVisitor(visitCount);
    }

    // Track time milestones: 2, 5, 10 minutes
    const intervals = [
      { minutes: 2, timeout: 120000 },
      { minutes: 5, timeout: 300000 },
      { minutes: 10, timeout: 600000 },
    ];

    const timeouts = intervals.map(({ minutes, timeout }) =>
      setTimeout(() => {
        if (!milestones.current.has(minutes)) {
          milestones.current.add(minutes);
          trackTimeMilestone(minutes, window.location.pathname);
        }
      }, timeout)
    );

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  return null;
}
