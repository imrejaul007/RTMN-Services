import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@nextabizz/shared-types', '@nextabizz/webhook-sdk', '@nextabizz/rez-auth-client'],
  outputFileTracingRoot: '/Users/rejaulkarim/Documents/ReZ Full App/nextabizz',
};

export default nextConfig;
