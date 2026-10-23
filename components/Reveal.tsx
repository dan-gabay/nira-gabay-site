'use client';

import { useEffect, useRef, type ReactNode } from 'react';

// Scroll-reveal (fade + rise, once) that never hides content in the server
// HTML. framer-motion's `initial` was serialised as opacity:0, so /about,
// /contact and the home page stayed blank until the JS bundle hydrated, and
// for good if it never did.
//
// Here the element renders visible. After hydration, only an element that is
// still below the fold is hidden (the visitor has not seen it yet, so nothing
// flickers) and faded in when it scrolls into view. Anything already on screen
// is left alone, as is everything for visitors who asked for reduced motion.
export default function Reveal({
  children,
  delay = 0,
  duration = 0.6,
  x = 0,
  y = 30,
  scale = 1,
  className,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  x?: number;
  y?: number;
  scale?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    el.style.opacity = '0';
    el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        el.style.transition = `opacity ${duration}s ease-out ${delay}s, transform ${duration}s ease-out ${delay}s`;
        el.style.opacity = '';
        el.style.transform = '';
      },
      // Fire once ~10% of the viewport into the element; a ratio threshold
      // would never fire for blocks taller than the screen.
      { rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, duration, x, y, scale]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
