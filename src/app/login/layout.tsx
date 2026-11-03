import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Sign In to Your Account | ENCLAVE',
  description: 'Access your verified ENCLAVE identity, manage room configurations, and review active security credentials.',
  alternates: {
    canonical: 'https://enclave.vercel.app/login',
  },
  openGraph: {
    title: 'Sign In to Your Account | ENCLAVE',
    description: 'Access your verified ENCLAVE identity and secure room configurations.',
    url: 'https://enclave.vercel.app/login',
    siteName: 'ENCLAVE',
    type: 'website',
    images: [
      {
        url: 'https://enclave.vercel.app/og-image.png',
        secureUrl: 'https://enclave.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'Sign In | ENCLAVE',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign In to Your Account | ENCLAVE',
    description: 'Access your verified ENCLAVE identity and secure room configurations.',
    images: ['https://enclave.vercel.app/og-image.png'],
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
