import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SecurityClientView from './SecurityClientView';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Security Architecture & Threat Model | ENCLAVE',
  description: 'Detailed cryptographic specifications and formal threat model of ENCLAVE: WebCrypto SubtleCrypto, AES-256-GCM, PBKDF2-HMAC-SHA256, and memory zeroization.',
  keywords: [
    'ENCLAVE security architecture',
    'cryptographic threat model',
    'AES-256-GCM authenticated encryption',
    'PBKDF2 key derivation',
    'zero-knowledge messaging',
    'blind relay security',
    'memory zeroization'
  ],
  alternates: {
    canonical: 'https://enclave.vercel.app/security',
  },
  openGraph: {
    title: 'Security Architecture & Threat Model | ENCLAVE',
    description: 'Cryptographic specifications, formal invariants, and adversary model of ENCLAVE.',
    url: 'https://enclave.vercel.app/security',
    siteName: 'ENCLAVE',
    type: 'website',
  },
};

export default function SecurityPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: 'ENCLAVE Security Architecture & Cryptographic Threat Model',
    description: 'Technical analysis of ENCLAVE’s client-side authenticated encryption, PBKDF2 key derivation, and memory zeroization.',
    url: 'https://enclave.vercel.app/security',
    publisher: {
      '@type': 'Organization',
      name: 'ENCLAVE Security Engineering',
      url: 'https://enclave.vercel.app'
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111111] flex flex-col selection:bg-[#E7F0EC] selection:text-[#174A3A]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main className="flex-1 pt-28 sm:pt-32 pb-24">
        {/* Header Hero */}
        <section className="max-w-7xl mx-auto px-6 mb-16 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#E7F0EC] border border-[#C9DDD5] text-[11px] font-mono tracking-wider text-[#174A3A] uppercase font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#174A3A]" />
            <span>SECURITY SPECIFICATION</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-medium tracking-tight text-[#111111] leading-[1.08]">
            Security Architecture & <br />
            <span className="text-[#8A8A8A] font-normal">Cryptographic Threat Model</span>
          </h1>

          <p className="text-base sm:text-lg text-[#666666] max-w-3xl leading-relaxed">
            ENCLAVE uses standard W3C Web Cryptography primitives to enforce a zero-knowledge, zero-persistence model. We publish our mathematical assumptions, cryptographic standards, and formal boundaries.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-[#666666]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#174A3A]" />
              <span>AES-256-GCM Authenticated Encryption</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#174A3A]" />
              <span>PBKDF2-HMAC-SHA256 (100k rounds)</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#174A3A]" />
              <span>Constant-Time Verification</span>
            </span>
          </div>
        </section>

        {/* Client Interactive Tab View */}
        <section className="max-w-7xl mx-auto px-6 mb-20">
          <SecurityClientView />
        </section>

        {/* Bottom CTA */}
        <section className="max-w-7xl mx-auto px-6 mt-20 pt-12 border-t border-[#E4E4DF] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-medium text-[#111111]">
              Ready to initialize a private chamber?
            </h3>
            <p className="text-xs text-[#666666] mt-1 font-mono">
              Zero logs. Out-of-band pass separation. Instant dissolution.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button asChild size="lg" className="px-6 h-11 text-xs font-mono tracking-wider font-semibold">
              <Link href="/signup" className="flex items-center space-x-2">
                <span>START A CHAT ROOM</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="px-6 h-11 text-xs font-mono tracking-wider font-semibold">
              <Link href="/how-it-works">
                <span>HOW IT WORKS</span>
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
