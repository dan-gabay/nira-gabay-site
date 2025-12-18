import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-heebo",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL('https://nira-gabay-site.vercel.app'),
  title: {
    default: 'נירה גבאי - פסיכותרפיה והדרכת הורים',
    template: '%s | נירה גבאי'
  },
  description: 'מטפלת בפסיכותרפיה ומדריכת הורים. מלווה מתבגרים, מבוגרים וזוגות בדרכם להגשמה עצמית. התמחות בטיפול זוגי, CBT וטיפול מיני.',
  keywords: ['פסיכותרפיה', 'הדרכת הורים', 'טיפול זוגי', 'CBT', 'טיפול מיני', 'טיפול במתבגרים', 'נירה גבאי'],
  authors: [{ name: 'נירה גבאי' }],
  creator: 'נירה גבאי',
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: 'https://nira-gabay-site.vercel.app',
    siteName: 'נירה גבאי - פסיכותרפיה',
    title: 'נירה גבאי - פסיכותרפיה והדרכת הורים',
    description: 'מטפלת בפסיכותרפיה ומדריכת הורים. מלווה מתבגרים, מבוגרים וזוגות בדרכם להגשמה עצמית.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'נירה גבאי - פסיכותרפיה והדרכת הורים',
    description: 'מטפלת בפסיכותרפיה ומדריכת הורים',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${heebo.variable} antialiased font-heebo`}>
        <nav style={{
          width: '100%',
          background: '#fff',
          borderBottom: '1px solid #eee',
          padding: '0.5rem 0',
          marginBottom: 24,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)'
        }}>
          <div style={{maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'flex-end', padding: '0 1rem'}}>
            <a href="/" style={{fontWeight: 500, color: '#222', textDecoration: 'none'}}>דף הבית</a>
            <a href="/about" style={{fontWeight: 500, color: '#222', textDecoration: 'none'}}>אודות</a>
            <a href="/articles" style={{fontWeight: 500, color: '#222', textDecoration: 'none'}}>מאמרים</a>
            <a href="/contact" style={{fontWeight: 500, color: '#222', textDecoration: 'none'}}>צור קשר</a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
