import type { NextConfig } from "next";
import { VARY_VALUE } from "./lib/agent/vary";

const nextConfig: NextConfig = {
  // Image Optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tyrmguosxbmwykfnxcvk.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '70wu4ifcxmk7qisg.public.blob.vercel-storage.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Performance
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  // `Vary: Accept` for the HTML/Markdown content negotiation in proxy.ts.
  //
  // The value is a superset, not just `Accept`, and that is the whole point.
  // Next.js emits its own Vary on every App Router response
  // (base-server.ts setVaryHeader: the four RSC routing headers) and, on a page
  // response, that value replaces anything set from proxy.ts or from here -
  // verified against `next start`, where the entry below has no effect on a
  // page. On Vercel, custom headers are applied by the Edge Network and win
  // instead. Whichever layer ends up on top, the response then carries every
  // entry it needs: drop the RSC names and a deploy would silently break
  // client-side navigation caching.
  //
  // If a future Next version changes that list, this string has to follow it.
  async headers() {
    return [
      {
        // Not _next/static or _next/image: those are immutable assets that
        // never negotiate, and adding routing headers to their Vary only
        // fragments the cache.
        source: '/((?!_next/static|_next/image).*)',
        headers: [
          { key: 'Vary', value: VARY_VALUE },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // Birth-order consolidation (SEO audit P1-8): two published articles
      // competed for the same topic; the shorter one 301s into the richer one.
      {
        source: '/articles/birth-order-family-dynamics',
        destination: '/articles/family-birth-order-meaning-and-impact',
        permanent: true,
      },
      // /blog is a route this site has never had, but GA4 shows 9 sessions
      // landing there in 28 days - roughly a tenth of all traffic, from links
      // shared before the site moved to /articles. They were all hitting a 404.
      {
        source: '/blog',
        destination: '/articles',
        permanent: true,
      },
      {
        source: '/blog/:path*',
        destination: '/articles',
        permanent: true,
      },
    ];
  },
  
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    optimizeCss: true,
  },
};

export default nextConfig;
