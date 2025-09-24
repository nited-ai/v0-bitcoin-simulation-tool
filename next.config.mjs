/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Production-ready configuration
  images: {
    unoptimized: true,
  },
  // Aggressive Windows permission fix
  webpack: (config, { dev, isServer }) => {
    // Always apply Windows fixes regardless of environment
    if (process.platform === 'win32') {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/Anwendungsdaten/**',
          '**/AppData/**',
          'C:\\\\Users\\\\**\\\\Anwendungsdaten\\\\**',
          'C:\\\\Users\\\\**\\\\AppData\\\\**',
        ],
        poll: false,
        aggregateTimeout: 300,
      };

      // Disable symlinks completely
      config.resolve = {
        ...config.resolve,
        symlinks: false,
      };

      // Set cache to memory only
      config.cache = {
        type: 'memory',
      };

      // Add custom resolver to avoid problematic paths
      config.resolve.plugins = config.resolve.plugins || [];
    }

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
