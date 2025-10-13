import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/'],
    },
    sitemap: [
      'https://github.gg/sitemap.xml',
      'https://github.gg/wiki-sitemap.xml',
    ],
  };
}
