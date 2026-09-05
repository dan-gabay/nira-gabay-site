import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // /api/md/* is the Markdown representation of the public pages and is
      // meant to be fetched. The Allow is longer than the Disallow, so it wins
      // under longest-match precedence. Everything else under /api/ stays shut.
      {
        userAgent: '*',
        allow: ['/', '/api/md/'],
        disallow: ['/api/', '/manage/'],
      },
      {
        userAgent: 'Googlebot',
        allow: ['/', '/api/md/'],
        disallow: ['/api/', '/manage/'],
      },
    ],
    sitemap: [
      'https://www.niragabay.com/sitemap.xml',
      'https://www.niragabay.com/sitemap-images.xml'
    ],
  }
}
