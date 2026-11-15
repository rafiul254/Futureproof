import type { MetadataRoute } from 'next';

/**
 * The demo database holds no real user data, but crawlers have no business in
 * per-result pages: those are private by default.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/en/', '/bn/', '/en/methodology', '/bn/methodology'],
        disallow: ['/api/', '/en/results/', '/bn/results/', '/en/settings', '/bn/settings'],
      },
    ],
  };
}
