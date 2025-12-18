import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'נירה גבאי - פסיכותרפיה והדרכת הורים',
    short_name: 'נירה גבאי',
    description: 'מטפלת בפסיכותרפיה ומדריכת הורים. מלווה מתבגרים, מבוגרים וזוגות בדרכם להגשמה עצמית.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#d97706',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    lang: 'he',
    dir: 'rtl',
  }
}
