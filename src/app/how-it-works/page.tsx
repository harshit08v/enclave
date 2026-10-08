'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AccessPassSection from '@/components/marketing/AccessPassSection';
import EphemeralSection from '@/components/marketing/EphemeralSection';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111111] flex flex-col">
      <Navbar />

      <main className="flex-1 pt-32 pb-24">
        {/* Page Hero */}
        <section className="max-w-7xl mx-auto px-6 mb-16 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#E7F0EC] border border-[#C9DDD5] text-[11px] font-mono tracking-wider text-[#174A3A] uppercase font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#174A3A]" />
            <span>SPECIFICATION & PROTOCOL</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-medium tracking-tight text-[#111111] leading-[1.08]">
            How ENCLAVE Works <br />
            <span className="text-[#8A8A8A] font-normal">From Genesis to Obliteration</span>
          </h1>

          <p className="text-base sm:text-lg text-[#666666] max-w-3xl leading-relaxed">
            Discover the precise architectural journey that separates ENCLAVE from traditional permanent chat platforms. Seven distinct phases ensure privacy by design.
          </p>
        </section>

        {/* 7 Numbered Documentation Sections */}
        <section className="max-w-7xl mx-auto px-6 mb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {numberedSections.map((sec) => (
              <div
                key={sec.num}
                className="p-7 rounded-xl bg-[#FFFFFF] border border-[#E4E4DF] flex flex-col justify-between hover:border-[#C9DDD5] hover:bg-[#F8FBF9] transition-all shadow-xs"
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
            <h3 className="text-xl font-medium text-[#111111]">
              Experience it yourself
            </h3>
            <p className="text-xs text-[#666666] mt-1 font-mono">
              Create a room, share the pass, and see the destruction lifecycle in action.
            </p>
          </div>

          <Button asChild size="lg">
            <Link href="/signup" className="flex items-center space-x-2">
              <span>START CHATTING</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </section>
      </main>

      <Footer />
    </div>
  );
}
