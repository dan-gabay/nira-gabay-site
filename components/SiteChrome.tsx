'use client';

import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import AccessibilityMenu from '@/components/AccessibilityMenu';
import GoogleTagManager from '@/components/GoogleTagManager';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import MetaPixel from '@/components/MetaPixel';
import Clarity from '@/components/Clarity';
import AnalyticsProvider from '@/components/AnalyticsProvider';
import ExitIntentTracker from '@/components/ExitIntentTracker';
import { isOptedOut } from '@/lib/ownerOptOut';

// The cookie only changes from /manage, which is a different page load, so
// there is nothing to subscribe to.
const noSubscribe = () => () => {};

// The public site's chrome. /manage is an admin app, not a page of the site:
// it brings its own header and navigation, so rendering these on top of it
// put the site logo over the admin title and floated the WhatsApp and
// accessibility buttons across the admin content.
//
// The trackers are skipped there too - the owner working in the admin is not
// site traffic, and counting her sessions would distort the very numbers the
// dashboard reports. Clarity especially: the admin screens show real people's
// names, phone numbers and messages, and it records the screen.
//
// The same goes for the owner on the public pages once the
// switch in /manage is on (lib/ownerOptOut.ts). The server cannot read the cookie
// without making every page dynamic, so it renders no trackers at all and the
// browser adds them after hydration when the switch is off. Every tracker here
// is an afterInteractive script, so that is when they would load anyway.
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const optedOut = useSyncExternalStore(noSubscribe, isOptedOut, () => true);

  if (pathname?.startsWith('/manage')) {
    return <>{children}</>;
  }

  return (
    <>
      {!optedOut && (
        <>
          <GoogleTagManager />
          <GoogleAnalytics />
          <MetaPixel />
          <Clarity />
        </>
      )}
      <AnalyticsProvider>
        <ExitIntentTracker />
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
        <WhatsAppButton />
        <AccessibilityMenu />
      </AnalyticsProvider>
    </>
  );
}
