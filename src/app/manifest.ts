import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ENCLAVE',
    short_name: 'ENCLAVE',
    description: "Private, ephemeral, end-to-end encrypted rooms for conversations that don't need to stay.",
    start_url: '/',
    display: 'standalone',
    background_color: '#FAFAF8',
    theme_color: '#111210',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
