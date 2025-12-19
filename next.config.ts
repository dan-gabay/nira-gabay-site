import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image Optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qtrypzzcjebvfcihiynt.supabase.co',
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
  },
  
  // Performance
  compress: true,
  poweredByHeader: false,
  
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default nextConfig;
