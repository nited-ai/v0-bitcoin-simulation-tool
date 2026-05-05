import path from 'path'

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    after: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Enhanced webpack configuration for stable development and performance
  webpack: (config, { dev, isServer }) => {
    // Apply optimizations for development stability only
    if (dev) {
      // Enhanced file watching optimization
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/dist/**',
          '**/build/**'
        ],
        aggregateTimeout: 500, // Increased debounce time to reduce excessive rebuilds
        poll: false, // Disable polling to prevent continuous file system checks
      };

      // Optimize caching to prevent cache failures (development only)
      if (process.platform === 'win32') {
        config.cache = {
          type: 'filesystem',
          cacheDirectory: path.resolve(process.cwd(), '.next/cache/webpack')
        };
      }

      // Reduce module resolution overhead (development only)
      config.resolve = {
        ...config.resolve,
        symlinks: false, // Disable symlink resolution for performance
      };
    }

    return config;
  },
  // Production-ready configuration
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
