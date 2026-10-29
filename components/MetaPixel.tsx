'use client';

import Script from 'next/script';
import { META_PIXEL_ID, usingGtm } from '@/lib/tagging';

// Meta Pixel. Installed ahead of any Meta spend on purpose: the remarketing
// audience is built from people who visited before the first ad ever runs, and
// with the site's current traffic that pool needs every week it can get.
//
// Renders nothing when NEXT_PUBLIC_META_PIXEL_ID is unset, so local and
// preview builds stay clean.
export default function MetaPixel() {
  // GTM loads the pixel itself when a container is configured.
  if (usingGtm || !META_PIXEL_ID) return null;

  return (
    <>
      {/* lazyOnload: the pixel builds an audience and is not part of the
          Google Ads conversion setup, so it waits for the page to finish
          loading instead of competing with hydration on a phone (U-19).
          A tap before then sends no Meta event - lib/conversions.ts
          already skips when fbq is missing. */}
      <Script id="meta-pixel" strategy="lazyOnload">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window,document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          alt=""
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
