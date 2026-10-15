import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // scripts/deploy.sh builds into .next-build while the live site keeps serving .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',

  reactStrictMode: true,

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'i.etsystatic.com' },
      { protocol: 'https', hostname: 'openapi.etsy.com' },
    ],
  },

  compiler: {
    // Strip debug logging in production but keep errors, warnings and info, or a
    // failure on the server (email, Etsy, database) leaves no trace in the logs.
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn', 'info'] } : false,
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options',        value: 'DENY'    },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ]
  },

  async redirects() {
    return [
      { source: '/app', destination: '/dashboard', permanent: false },
    ]
  },
}

export default nextConfig
