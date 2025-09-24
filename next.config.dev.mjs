/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Minimal configuration for development to avoid Windows permission issues
  webpack: (config, { isServer, dev }) => {
    // Disable file watching entirely for builds
    if (!dev) {
      config.cache = false;
      config.watchOptions = {
        ignored: '**/*'
      };
    }
    
    return config;
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
