/** @type {import('next').NextConfig} */
const basePath = '/artchive';

const nextConfig = {
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'collectionapi.metmuseum.org' },
      { protocol: 'https', hostname: 'www.rijksmuseum.nl' },
      { protocol: 'https', hostname: 'www.artic.edu' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/array/:path*',
        destination: 'https://us-assets.i.posthog.com/array/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};
module.exports = nextConfig;
