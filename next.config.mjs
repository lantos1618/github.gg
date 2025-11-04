/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use separate directories for dev (turbopack) vs production build
  distDir: process.env.NODE_ENV === 'production' ? '.next' : '.next-dev',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
      },
    ],
  },
  allowedDevOrigins: ["https://dev.github.gg", "dev.github.gg"],

  // Exclude shiki from server externalization to avoid version conflicts
  serverExternalPackages: [],

  // Bundle shiki packages to avoid version conflicts
  transpilePackages: ['shiki', 'react-shiki'],
};

export default nextConfig;
