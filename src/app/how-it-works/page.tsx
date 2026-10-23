import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AccessPassSection from '@/components/marketing/AccessPassSection';
import EphemeralSection from '@/components/marketing/EphemeralSection';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'How ENCLAVE Works | Cryptographic Protocol & Lifecycle',
  description: 'Understand the seven-phase ephemeral lifecycle of ENCLAVE: client-side room generation, out-of-band secret exchange, AES-256-GCM routing, and memory zeroization.',
  keywords: [
    'how ENCLAVE works',
    'ephemeral room lifecycle',
    'client-side encryption protocol',
    'zero-knowledge routing',
    'RAM obliteration'
  ],
  alternates: {
    canonical: 'https://enclave.vercel.app/how-it-works',
  },
  openGraph: {
    title: 'How ENCLAVE Works | Cryptographic Protocol & Lifecycle',
    description: 'Explore the seven-phase cryptographic lifecycle of private rooms.',
    url: 'https://enclave.vercel.app/how-it-works',
    siteName: 'ENCLAVE',
    type: 'website',
  },
};

export default function HowItWorksPage() {
  const numberedSections = [
    {
      num: '01',
      title: 'CREATE',
      desc: 'The creator initiates an ephemeral room. The room salt and initial state are generated client-side using cryptographic entropy.',
      tech: 'WebCrypto SubtleCrypto CSPRNG generates a 128-bit unique salt and 256-bit room secret.'
    },
    {
      num: '02',
      title: 'SHARE',
      desc: 'The room link and access pass are generated as two distinct factors and must be sent through separate communication channels.',
      tech: 'Room identifier is in the URL. Access pass is kept strictly out-of-band and never sent to server.'
    },
    {
      num: '03',
      title: 'JOIN',
      desc: 'A participant opens the room link and enters the access pass provided out-of-band.',
      tech: 'Client derives Key Wrapping Key via PBKDF2-HMAC-SHA256 (100,000 rounds).'
    },
    {
      num: '04',
      title: 'ESTABLISH',
      desc: 'The client verifies the Auth Commitment with the relay and unwraps the Room Master Secret locally in memory.',
      tech: 'Constant-time verification of auth hash. Zero cleartext pass transmitted to relay.'
    },
    {
      num: '05',
      title: 'TALK',
      desc: 'Messages are encrypted before leaving the device. The server routes opaque binary frames blindly.',
      tech: 'AES-256-GCM authenticated payload with a fresh 96-bit random IV nonce per packet.'
    },
    {
      num: '06',
      title: 'LEAVE',
      desc: 'When a user departs, key material is zeroized in memory and departure packets notify remaining sockets.',
      tech: 'CryptoKey references unpinned, memory buffers overwritten with random noise.'
    },
    {
      num: '07',
      title: 'DESTROY',
      desc: 'When the final participant disconnects or leaves, the room is permanently retired and cannot be revived.',
      tech: 'Relay purges in-transit buffers and marks room identifier as non-recoverable tombstone.'
    }
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: 'How ENCLAVE Works: Seven-Phase Ephemeral Cryptographic Lifecycle',
    description: 'A technical overview of client-side key derivation, two-factor separation, and definitive memory zeroization.',
    url: 'https://enclave.vercel.app/how-it-works',
    publisher: {
      '@type': 'Organization',
      name: 'ENCLAVE',
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
        {/* Page Hero */}
        <section className="max-w-7xl mx-auto px-6 mb-16 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#E7F0EC] border border-[#C9DDD5] text-[11px] font-mono tracking-wider text-[#174A3A] uppercase font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#174A3A]" />
            <span>SPECIFICATION & PROTOCOL</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-medium tracking-tight text-[#111111] leading-[1.08]">
            How ENCLAVE Works: <br />
            <span className="text-[#8A8A8A] font-normal">From Genesis to Obliteration</span>
          </h1>

          <p className="text-base sm:text-lg text-[#666666] max-w-3xl leading-relaxed">
            Discover the precise architectural journey that separates ENCLAVE from traditional permanent chat platforms. Seven distinct phases guarantee absolute confidentiality from inception to destruction.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-[#666666]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#174A3A]" />
              <span>PBKDF2 100,000 Rounds</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#174A3A]" />
              <span>96-bit Fresh IV Per Frame</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#174A3A]" />
              <span>Anti-Resurrection Tombstones</span>
            </span>
          </div>
        </section>

        {/* 7 Numbered Documentation Sections */}
        <section className="max-w-7xl mx-auto px-6 mb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {numberedSections.map((sec) => (
              <div
                key={sec.num}
                className="p-7 rounded-2xl bg-[#FFFFFF] border border-[#E4E4DF] flex flex-col justify-between hover:border-[#C9DDD5] hover:bg-[#F8FBF9] transition-all shadow-xs"
              >
                <div>
                  <div className="text-2xl font-mono font-medium text-[#174A3A] mb-4">
                    {sec.num}
                  </div>
                  <h3 className="text-base font-mono font-semibold tracking-wider text-[#111111] mb-2 uppercase">
                    {sec.title}
                  </h3>
                  <p className="text-sm text-[#666666] leading-relaxed mb-4">
                    {sec.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#E4E4DF] text-xs font-mono text-[#8A8A8A]">
                  <span className="text-[#174A3A] font-semibold">Tech spec: </span>
                  {sec.tech}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Dual Channel Access Pass Deep Dive */}
        <AccessPassSection />

        {/* Ephemeral Lifecycle Visualization */}
        <EphemeralSection />

        {/* Bottom CTA */}
        <section className="max-w-7xl mx-auto px-6 mt-20 pt-12 border-t border-[#E4E4DF] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-medium text-[#111111]">
              Experience it yourself
            </h3>
            <p className="text-xs text-[#666666] mt-1 font-mono">
              Create a room, share the pass, and observe the ephemeral destruction lifecycle in real time.
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
              <Link href="/services">
                <span>EXPLORE SERVICES</span>
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
