import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Create Your Account | ENCLAVE',
  description: 'Register an account on ENCLAVE with zero telemetry, client-side cryptographic keys, and Argon2id protection.',
  alternates: {
    canonical: 'https://enclave.vercel.app/signup',
  },
  openGraph: {
    title: 'Create Your Account | ENCLAVE',
    description: 'Register an account on ENCLAVE with zero telemetry and client-side cryptographic protection.',
    url: 'https://enclave.vercel.app/signup',
    siteName: 'ENCLAVE',
    type: 'website',
    images: [
      {
        url: 'https://enclave.vercel.app/og-image.png',
        secureUrl: 'https://enclave.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'Create Account | ENCLAVE',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Create Your Account | ENCLAVE',
    description: 'Register an account on ENCLAVE with zero telemetry and client-side cryptographic protection.',
    images: ['https://enclave.vercel.app/og-image.png'],
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
