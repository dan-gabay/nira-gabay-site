'use client';

import Link from 'next/link';
import { trackReadMoreClick } from '@/lib/analytics';
import { ReactNode } from 'react';

type TrackedLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  trackingData?: {
    type: string;
    title?: string;
    location?: string;
  };
};

export default function TrackedLink({ href, children, className, trackingData }: TrackedLinkProps) {
  const handleClick = () => {
    if (trackingData) {
      trackReadMoreClick(trackingData.type, trackingData.title || '', trackingData.location || '');
    }
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
