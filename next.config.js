/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Ignore TypeScript errors during build in development
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  eslint: {
    // Ignore ESLint errors during build in development
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
  // Exclude problematic directories from compilation
  webpack: (config, { isServer }) => {
    // Exclude questionsWT and test files from compilation
    config.module.rules.push({
      test: /\.(ts|tsx|js|jsx)$/,
      exclude: [
        /questionsWT/,
        /test-.*\.ts$/,
        /analyze-api-status\.ts$/,
        /api-based-data-insert\.ts$/,
        /debug-api-issues\.ts$/,
        /final-verification\.ts$/,
        /resume-gap-filling\.ts$/,
      ],
    })
    return config
  },
}

module.exports = nextConfig
