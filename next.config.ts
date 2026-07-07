import type { NextConfig } from "next";

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

  async redirects() {
    return [
      // Birth-order consolidation (SEO audit P1-8): two published articles
      // competed for the same topic; the shorter one 301s into the richer one.
      {
        source: '/articles/birth-order-family-dynamics',
        destination: '/articles/family-birth-order-meaning-and-impact',
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
