'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Sends a person who lands on a broken link straight to the homepage instead
// of leaving them on the 404 page to pick a link themselves (Dan, 2026-10-16).
//
// Client-side on purpose: the response keeps its real 404 status, so crawlers
// drop the dead URL. A blanket server redirect to / would turn every wrong URL
// into a soft-404 in Search Console. Known old URLs that deserve a real 301
// belong in next.config.ts redirects() instead.
//
// replace(), not push(): the broken URL should not stay in history, or Back
// would bounce the visitor into the redirect again.
export default function NotFoundRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);
  return null;
}
