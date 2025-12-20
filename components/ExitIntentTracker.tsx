'use client';

import { useEffect, useRef } from 'react';
import { trackExitIntent } from '@/lib/analytics';

export default function ExitIntentTracker() {
  const hasTracked = useRef(false);

  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      // Detect when mouse leaves from top of page (not bottom or sides)
      if (e.clientY <= 0 && !hasTracked.current) {
        hasTracked.current = true;
        trackExitIntent(window.location.pathname);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return null;
}
