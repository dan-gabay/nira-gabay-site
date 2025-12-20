import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/manage/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/manage/'],
      },
    ],
    sitemap: [
      'https://www.niragabay.com/sitemap.xml',
      'https://www.niragabay.com/sitemap-images.xml'
    ],
  }
}
