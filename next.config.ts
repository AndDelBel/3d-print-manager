import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Turbopack configuration (stable in Next.js 15.4+)
  turbopack: {
    // Configure module resolution for Turbopack
    resolveAlias: {
      // Turbopack handles Node.js polyfills automatically
    },
  },
  
  // Experimental features
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@supabase/supabase-js', 'recharts'],
  },
  
  // Ottimizzazioni per la produzione
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  
  // Ottimizzazioni per le immagini
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  
  // Ottimizzazioni per il caching
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
      ],
    },
  ],
}

export default nextConfig
