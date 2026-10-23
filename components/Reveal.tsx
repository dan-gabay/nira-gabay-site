'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

// The scroll-reveal used on /about (fade + 30px rise, 0.6s, once), wrapped so
// server components like the home page can use it too.
//
// framer-motion animates via JS transforms, so the reduced-motion rules in
// globals.css do not reach it - useReducedMotion does, and renders the content
// in its final state for anyone who has asked for less movement.
export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
