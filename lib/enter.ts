import type { CSSProperties } from 'react';

// Inline custom properties for the CSS `.animate-enter` entrance in
// globals.css. Same shape as the framer-motion `initial` offsets they replace
// (px, seconds), so a call site reads like the old animation.
export function enterStyle({
  x = 0,
  y = 0,
  scale = 1,
  duration = 0.4,
  delay = 0,
}: {
  x?: number;
  y?: number;
  scale?: number;
  duration?: number;
  delay?: number;
} = {}): CSSProperties {
  return {
    '--enter-x': `${x}px`,
    '--enter-y': `${y}px`,
    '--enter-scale': scale,
    '--enter-duration': `${duration}s`,
    '--enter-delay': `${delay}s`,
  } as CSSProperties;
}
