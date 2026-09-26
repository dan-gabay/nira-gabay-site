'use client';

import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { isOptedOut } from '@/lib/ownerOptOut';

// Vercel's beacons with the owner switch applied (lib/ownerOptOut.ts).
// beforeSend is a function, so it has to live in a client component rather
// than in the server-rendered root layout.
export default function VercelInsights() {
  return (
    <>
      <Analytics beforeSend={(e) => (isOptedOut() ? null : e)} />
      <SpeedInsights beforeSend={(e) => (isOptedOut() ? null : e)} />
    </>
  );
}
