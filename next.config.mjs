/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Fix Windows permission issues
  webpack: (config, { isServer, dev }) => {
    // Configure watch options properly
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/Anwendungsdaten/**',
        '**/AppData/**',
        '**/Application Data/**',
        'C:\\Users\\**\\Anwendungsdaten\\**',
        'C:\\Users\\**\\AppData\\**',
      ],
    };

    // Additional webpack configuration to avoid scanning system directories
    config.resolve = {
      ...config.resolve,
      symlinks: false,
    };

    return config;
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'x-forwarded-proto',
            value: 'http',
          },
        ],
        destination: 'https://firehodl.com/:path*',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
