import Script from 'next/script';
import { GA_MEASUREMENT_ID, GOOGLE_ADS_ID, usingGtm } from '@/lib/tagging';

// Owner-controlled GA4 property (created 2026-07 under dangabay2@gmail.com).
// The previous hardcoded ID (G-9275H0XYFW) belonged to a property no current
// account could access, so its data was invisible to everyone - do not revert.
//
// The Google Ads tag rides the same gtag.js load rather than adding a second
// script. Its job here is auto-tagging and gclid capture; the conversions
// themselves are imported from GA4 key events (see lib/conversions.ts).

export default function GoogleAnalytics() {
  // GTM loads GA4 itself. Embedding gtag.js alongside it would double every
  // pageview and event (see lib/tagging.ts).
  if (usingGtm) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          // transport_type: 'beacon' - WhatsApp and phone CTAs navigate away
          // the instant they are clicked, and a normal request gets cancelled
          // with the page. Those are the conversions we care about most, so
          // they are exactly the ones a non-beacon transport would drop.
          gtag('config', '${GA_MEASUREMENT_ID}', { transport_type: 'beacon' });
          ${GOOGLE_ADS_ID ? `gtag('config', '${GOOGLE_ADS_ID}');` : ''}
        `}
      </Script>
    </>
  );
}
