import type { Metadata } from 'next';
import ManageShell from '@/components/manage/ManageShell';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ManageShell supplies the header, the desktop nav and the mobile tab bar,
  // and skips all of it on the login screen.
  return <ManageShell>{children}</ManageShell>;
}
