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
    ],
  },
  allowedDevOrigins: ["https://dev.github.gg", "dev.github.gg"],
};

export default nextConfig;
