import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    // sitemap: 'https://your-domain.com/sitemap.xml', // Uncomment and update when domain is known
  };
}
