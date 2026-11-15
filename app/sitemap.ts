import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://futureproof.example';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/analyze', '/methodology', '/privacy'];
  const now = new Date();

  return ['en', 'bn'].flatMap((locale) =>
    routes.map((route) => ({
      url: `${BASE}/${locale}${route}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: route === '' ? 1 : 0.7,
    })),
  );
}
