'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import AccessibilityMenu from '@/components/AccessibilityMenu';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import AnalyticsProvider from '@/components/AnalyticsProvider';
import ExitIntentTracker from '@/components/ExitIntentTracker';

// The public site's chrome. /manage is an admin app, not a page of the site:
// it brings its own header and navigation, so rendering these on top of it
// put the site logo over the admin title and floated the WhatsApp and
// accessibility buttons across the admin content.
//
// The trackers are skipped there too - the owner working in the admin is not
// site traffic, and counting her sessions would distort the very numbers the
// dashboard reports.
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname?.startsWith('/manage')) {
    return <>{children}</>;
  }

  return (
    <>
      <GoogleAnalytics />
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
