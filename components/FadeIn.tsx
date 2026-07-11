'use client';

import { motion } from 'framer-motion';

type FadeInProps = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
};

// Subtle, fast entrance used across the homepage sections: small rise +
// fade, once per visit. Transform/opacity only (GPU-composited) - this site
// has a history of iOS scroll-jank bugs, so nothing here may shift layout.
export default function FadeIn({ children, delay = 0, className }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
