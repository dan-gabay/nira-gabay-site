import type { Metadata } from 'next';

// Its own manifest, so "add to home screen" on this page makes an icon that
// opens straight onto the form instead of the public site's start_url. The
// file is static and public on purpose: browsers fetch a manifest without
// cookies, so one behind the /manage gate would be redirected to the login
// screen. It holds nothing but a name, a path and the site icons.
export const metadata: Metadata = {
  title: 'פנייה חדשה',
  manifest: '/manage-lead.webmanifest',
  appleWebApp: { capable: true, title: 'פנייה חדשה', statusBarStyle: 'default' },
};

export default function NewLeadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
