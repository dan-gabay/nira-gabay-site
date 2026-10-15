import type { Metadata } from 'next';

// The same home-screen manifest as /manage/update: an icon added from here
// opens the update screen, which links back to this form.
export const metadata: Metadata = {
  title: 'פנייה חדשה',
  manifest: '/manage-update.webmanifest',
};

export default function NewLeadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
