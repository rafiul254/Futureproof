import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/**
 * The app never calls the browser-side origins below, but Supabase auth does,
 * so its origin is allowed only when it is actually configured.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseOrigin = (() => {
  if (!supabaseUrl) return null;
  try {
    return new URL(supabaseUrl).origin;
  } catch {
    return null;
  }
})();

const cspDirectives = [
  "default-src 'self'",
  // 'unsafe-inline' is required by Next.js' hydration bootstrap when no nonce
  // is configured. See docs/SECURITY_CHECKLIST.md — moving to per-request
  // nonces is a tracked follow-up, not a silent gap.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ''}`,
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
];

/**
 * Origins allowed to put the app in an <iframe>, comma separated.
 *
 * Empty (the default) = nobody, which is what a real deployment wants. A demo
 * preview host (or a competition portal) can be allowed explicitly with
 * ALLOW_EMBED_ORIGINS=https://host — never with a wildcard.
 */
const embedOrigins = (process.env.ALLOW_EMBED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0 && !origin.includes('*'));

const isProduction = process.env.NODE_ENV === 'production';

const csp = [
  ...cspDirectives.filter((directive) => !directive.startsWith('frame-ancestors')),
  `frame-ancestors 'self'${embedOrigins.map((origin) => ` ${origin}`).join('')}`,
];

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // X-Frame-Options cannot express a list, so it is dropped entirely when
  // specific embed origins are allowed: CSP frame-ancestors then decides.
  ...(embedOrigins.length === 0
    ? [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }]
    : []),
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: isProduction ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only',
    value: csp.join('; '),
  },
];

if (isProduction) {
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains',
  });
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
