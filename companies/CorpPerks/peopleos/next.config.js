/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/workforce/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL + '/:path*',
      },
      {
        source: '/api/learning/:path*',
        destination: process.env.NEXT_PUBLIC_LEARNING_API_URL + '/:path*',
      },
      {
        source: '/api/org/:path*',
        destination: process.env.NEXT_PUBLIC_ORG_API_URL + '/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
