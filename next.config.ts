import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@supabase/supabase-js'],
  webpack: (config, { isServer }) => {
    // Risolve problemi con Supabase
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      }
    }
    
    return config
  },
  // Disabilita il logging di Next.js per i file 404
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}

export default nextConfig
