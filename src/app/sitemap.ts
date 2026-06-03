import { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/backend-config';
import { DEFAULT_SEEDS } from '@/utils/symbols';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_URL;
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/watchlist`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/screener`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/chart`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ];

  const stockRoutes: MetadataRoute.Sitemap = DEFAULT_SEEDS.map(({ symbol }) => ({
    url: `${baseUrl}/watchlist/${encodeURIComponent(symbol)}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }));

  return [...staticRoutes, ...stockRoutes];
}
