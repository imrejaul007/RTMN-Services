/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/studio/:path*',
        destination: 'http://localhost:5750/api/studio/:path*',
      },
    ];
  },
};

module.exports = nextConfig;