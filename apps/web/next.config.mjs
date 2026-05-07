import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  // Tell Next we're inside a monorepo so it doesn't pick up a stray lockfile higher up.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  typedRoutes: true,
  transpilePackages: ['@outflow/ui', '@outflow/contracts'],
  // In dev the browser calls `/api/v1/...` on the Next origin; we proxy to
  // Nest on 4000 so we don't need NEXT_PUBLIC_API_URL in .env.local.
  async rewrites() {
    if (process.env.NODE_ENV !== 'production') {
      const target = process.env.API_DEV_PROXY_TARGET ?? 'http://127.0.0.1:4000';
      const base = target.replace(/\/$/, '');
      return [{ source: '/api/:path*', destination: `${base}/api/:path*` }];
    }
    return [];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
