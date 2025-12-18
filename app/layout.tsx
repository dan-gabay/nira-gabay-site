import type { Metadata } from "next";
import { Heebo, Assistant } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import JsonLd from "@/components/JsonLd";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-heebo",
  display: "swap",
  preload: true,
});

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-assistant",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL('https://niragabay.com'),
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
    url: 'https://niragabay.com',
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
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Psychologist',
    name: 'נירה גבאי',
    description: 'מטפלת בפסיכותרפיה ומדריכת הורים',
    url: 'https://niragabay.com',
    logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6939893ccce1b9a0f8ccda5e/e2d28bde5_Screenshot2025-12-11at1546BackgroundRemoved19.png',
    image: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6939893ccce1b9a0f8ccda5e/e176dba49_gemini-cleaned-aph4ywt.png',
    telephone: '+972-50-7936681',
    email: 'niraga1123@gmail.com',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'שואבה',
      addressCountry: 'IL',
    },
    sameAs: [
      'https://www.facebook.com/nira.gabay',
      'https://www.instagram.com/niragabay',
    ],
    priceRange: '$$',
    areaServed: {
      '@type': 'Country',
      name: 'ישראל',
    },
    availableService: [
      {
        '@type': 'Service',
        name: 'טיפול במתבגרים',
        description: 'ליווי מקצועי ורגיש בתקופה מאתגרת של התבגרות',
      },
      {
        '@type': 'Service',
        name: 'טיפול במבוגרים',
        description: 'מרחב בטוח לעיבוד רגשי והתמודדות עם אתגרי החיים',
      },
      {
        '@type': 'Service',
        name: 'טיפול זוגי',
        description: 'חיזוק הקשר הזוגי ושיפור התקשורת',
      },
      {
        '@type': 'Service',
        name: 'הדרכת הורים',
        description: 'כלים מעשיים להורות מיטבית',
      },
      {
        '@type': 'Service',
        name: 'טיפול מיני',
        description: 'התמחות במיניות בריאה',
      },
      {
        '@type': 'Service',
        name: 'טיפול קוגניטיבי התנהגותי (CBT)',
        description: 'גישה מעשית לטיפול בחרדות ודיכאון',
      },
    ],
  };

  return (
    <html lang="he" dir="rtl">
      <head>
        <JsonLd data={organizationSchema} />
      </head>
      <body className={`${heebo.variable} ${assistant.variable} antialiased font-heebo`}>
        <Header />
        <main className="pt-20">
          {children}
        </main>
        <Footer />
        <WhatsAppButton />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
