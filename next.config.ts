import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@supabase/supabase-js'],
  async headers() {
    return [
      {
        // Applica headers CORS per le API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },

}

export default nextConfig
