import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Join Private Chamber | ENCLAVE',
  description: "You have been invited to an end-to-end encrypted, ephemeral communication chamber on ENCLAVE. Zero server logs. Completely destroyed when you leave.",
  openGraph: {
    title: 'Join Private Chamber | ENCLAVE',
    description: "You have been invited to an end-to-end encrypted, ephemeral communication chamber on ENCLAVE. Zero server logs. Completely destroyed when you leave.",
    type: 'website',
    url: 'https://enclave.vercel.app',
    siteName: 'ENCLAVE',
    images: [
      {
        url: 'https://enclave.vercel.app/og-image.png',
        secureUrl: 'https://enclave.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'ENCLAVE Private Chamber Invite',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Join Private Chamber | ENCLAVE',
    description: "You have been invited to an end-to-end encrypted, ephemeral communication chamber on ENCLAVE. Zero traces left behind.",
    images: ['https://enclave.vercel.app/og-image.png'],
    site: '@enclave',
    creator: '@enclave',
  },
};

export default function RoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
