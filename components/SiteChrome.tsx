'use client';

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

// The public site's chrome. /manage is an admin app, not a page of the site:
// it brings its own header and navigation, so rendering these on top of it
// put the site logo over the admin title and floated the WhatsApp and
// accessibility buttons across the admin content.
//
// The trackers are skipped there too - the owner working in the admin is not
// site traffic, and counting her sessions would distort the very numbers the
// dashboard reports. Clarity especially: the admin screens show real people's
// names, phone numbers and messages, and it records the screen.
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname?.startsWith('/manage')) {
    return <>{children}</>;
  }

  return (
    <>
      <GoogleTagManager />
      <GoogleAnalytics />
      <MetaPixel />
      <Clarity />
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
