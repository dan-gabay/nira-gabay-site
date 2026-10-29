'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { CLARITY_ID } from '@/lib/tagging';
import { clarityTag, pageType, trafficType } from '@/lib/clarity';

// Microsoft Clarity: session replay and heatmaps.
//
// Here to answer one question the event data could not. Visitors read the
// service pages to the end - 65% reach 90% depth - and then reach out from
// the contact page or the footer instead of the button in front of them.
// Counting events says that happens; a replay shows why.
//
// Privacy is the whole design constraint. This is a site about therapy, and
// the contact form carries the reason someone is looking for a therapist.
// Three layers, so no single mistake exposes it:
//
//   1. Clarity's own masking, set to Strict in the project settings.
//   2. data-clarity-mask="true" on every field that takes typed text, which
//      holds even if someone relaxes that dashboard setting later. Code the
//      privacy, do not rely on a toggle.
//   3. Not loaded on /manage at all - see SiteChrome. The admin screens list
//      real people's names, phone numbers and messages.
//
// The project id defaults in lib/tagging.ts, so every build records -
// including local and preview ones. Their visits are automated or ours; use
// the owner switch in /manage to keep a browser out.
export default function Clarity() {
  const pathname = usePathname();

  // Session tags for the Clarity filters (lib/clarity.ts). The traffic type
  // is read from the URL the visit landed on, so only the first render counts:
  // client-side navigation keeps the referrer but changes the query.
  useEffect(() => {
    clarityTag('traffic', trafficType(window.location.search, document.referrer));
  }, []);
  useEffect(() => {
    if (pathname) clarityTag('page_type', pageType(pathname));
  }, [pathname]);

  if (!CLARITY_ID) return null;

  return (
    // lazyOnload: a replay does not need the first second, and the visitor's
    // phone does (U-19).
    <Script id="ms-clarity" strategy="lazyOnload">
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${CLARITY_ID}");
      `}
    </Script>
  );
}
