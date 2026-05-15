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

  async redirects() {
    const appName = process.env.NEXT_PUBLIC_GITHUB_APP_NAME || 'gh-gg';
    return [
      {
        source: '/developers',
        destination: '/api',
        permanent: true,
      },
      {
        source: '/hire/map',
        destination: '/discover',
        permanent: false,
      },
      {
        source: '/hire/search',
        destination: '/hire',
        permanent: false,
      },
      // /discover is merged into /hire. Query (e.g. ?seed=) forwards automatically.
      {
        source: '/discover',
        destination: '/hire',
        permanent: false,
      },
      // /install is dead — installation lives on github.com.
      // /install/callback is exempt (matched first below via more-specific source).
      {
        source: '/install',
        destination: `https://github.com/apps/${appName}/installations/new`,
        permanent: false,
      },
    ];
  },

  // Exclude shiki from server externalization to avoid version conflicts
  serverExternalPackages: [],

  // Bundle shiki packages to avoid version conflicts
  transpilePackages: ['shiki', 'react-shiki'],
};

export default nextConfig;
