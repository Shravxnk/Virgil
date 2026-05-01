/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Proxy /api/* to the FastAPI backend.
  // - In production (Render): API_INTERNAL_URL = http://chakravyuh-api:10000
  //   Browser calls /api/... → Next.js server rewrites → internal API
  // - In local dev: NEXT_PUBLIC_API_URL is set, so API_BASE is absolute
  //   and these rewrites are never triggered by the browser.
  async rewrites() {
    const apiUrl = process.env.API_INTERNAL_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
