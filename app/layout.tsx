import { FACEBOOK_APP_ID } from '@/lib/facebook';
import type { Metadata } from "next";
import { Heebo, Assistant } from "next/font/google";
import "./globals.css";
import "./accessibility.css";
import JsonLd from "@/components/JsonLd";
import { personSchema, practiceSchema, webSiteSchema } from "@/lib/identitySchema";
import SiteChrome from "@/components/SiteChrome";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-heebo",
  display: "optional",
  preload: true,
  adjustFontFallback: true,
});

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-assistant",
  display: "optional",
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.niragabay.com'),
  title: {
    default: 'נירה גבאי - פסיכותרפיה והדרכת הורים',
    template: '%s | נירה גבאי'
  },
  description: 'מטפלת בפסיכותרפיה ומדריכת הורים. מלווה מתבגרים, מבוגרים וזוגות בדרכם להגשמה עצמית. התמחות בטיפול זוגי, CBT וטיפול מיני.',
  keywords: [
    'פסיכותרפיה',
    'הדרכת הורים', 
    'טיפול זוגי',
    'CBT',
    'טיפול קוגניטיבי התנהגותי',
    'טיפול מיני',
    'טיפול במתבגרים',
    'טיפול במבוגרים',
    'פסיכותרפיסט',
    'מטפלת רגשית',
    'מטפלת זוגית',
    'יעוץ זוגי',
    'יעוץ הורי',
    'הורות מיטבית',
    'חרדה',
    'דיכאון',
    'משבר זוגי',
    'ביטחון עצמי',
    'פסיכותרפיה שואבה',
    'טיפול זוגי ירושלים',
    'פסיכותרפיה בית שמש',
    'הדרכת הורים מבשרת',
    'פסיכותרפיה מודיעין',
    'נירה גבאי',
    'שואבה',
    'ירושלים',
    'מבשרת ציון',
    'בית שמש',
    'מודיעין',
    'נס ציונה'
  ],
  authors: [{ name: 'נירה גבאי' }],
  creator: 'נירה גבאי',
  applicationName: 'נירה גבאי',
  // Each entry now points at a file whose real dimensions match what it
  // claims. /icon.png is 1024x1026, so it was declaring 512x512 in one place
  // and 180x180 in another, and every Apple device was pulling 64KB for a
  // 180px slot.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
  },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: 'https://www.niragabay.com',
    siteName: 'נירה גבאי',
    title: 'נירה גבאי - פסיכותרפיה והדרכת הורים',
    description: 'מטפלת בפסיכותרפיה ומדריכת הורים. מלווה מתבגרים, מבוגרים וזוגות בדרכם להגשמה עצמית.',
    images: [
      {
        url: 'https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/hero-desktop.png',
        width: 1200,
        height: 630,
        alt: 'נירה גבאי - פסיכותרפיה והדרכת הורים',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'נירה גבאי - פסיכותרפיה והדרכת הורים',
    description: 'מטפלת בפסיכותרפיה ומדריכת הורים',
    images: ['https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/hero-desktop.png'],
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com" />
        <link rel="dns-prefetch" href="https://tyrmguosxbmwykfnxcvk.supabase.co" />
        {/* Associates shares with the Facebook app behind the article Share
            Dialog. Emitted here rather than via metadata.other, which renders
            name= while Facebook documents property=. */}
        <meta property="fb:app_id" content={FACEBOOK_APP_ID} />
        {/* Identity graph: see lib/identitySchema.ts. Person and practice are
            linked by @id so a parser reads one entity, not two. */}
        <JsonLd data={personSchema} />
        <JsonLd data={practiceSchema} />
        <JsonLd data={webSiteSchema} />
      </head>
      <body className={`${heebo.variable} ${assistant.variable} antialiased font-heebo`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[100] focus:bg-white focus:text-stone-900 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
        >
          דלגו לתוכן הראשי
        </a>
        <SiteChrome>{children}</SiteChrome>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
