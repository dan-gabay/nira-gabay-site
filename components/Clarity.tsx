'use client';

import Script from 'next/script';
import { CLARITY_ID } from '@/lib/tagging';

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
// Renders nothing without NEXT_PUBLIC_CLARITY_ID, so local and preview builds
// record nobody.
export default function Clarity() {
  if (!CLARITY_ID) return null;

  return (
    <Script id="ms-clarity" strategy="afterInteractive">
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
