import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.VERCEL_ENV === 'production';
  if (!isProduction) {
    return {
      rules: [
        {
          userAgent: '*',
          disallow: '/',
        },
      ],
    };
  }

  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  const baseUrl = envUrl && !envUrl.includes('localhost') ? envUrl : 'https://enclave.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/app',
          '/app/',
          '/r/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
