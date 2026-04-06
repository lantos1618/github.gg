import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/boneyard-preview/', '/auth/'],
    },
    sitemap: 'https://github.gg/sitemap.xml', // Sitemap index that references all sitemaps
  };
}
