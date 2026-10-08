'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function AboutPage() {
  const pillars = [
    {
      title: 'Presence over permanence.',
      desc: 'Digital platforms turn human speech into infinite searchable archives. We believe private conversations should happen, conclude, and fade into memory naturally.'
    },
    {
      title: 'Privacy over accumulation.',
      desc: 'What is never stored can never be subpoenaed, breached, sold, or leaked. ENCLAVE leaves zero residual databases or search indexes.'
    },
    {
      title: 'Security over convenience.',
      desc: 'We require a two-factor channel separation: the room link alone cannot unlock the room without the out-of-band access pass.'
    },
    {
      title: 'Deliberate endings over infinite history.',
      desc: 'When the final participant leaves, the room is permanently obliterated. There are no backups, archives, or hidden recovery mechanisms.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111111] flex flex-col">
      <Navbar />

      <main className="flex-1 pt-32 pb-24">
        {/* Hero Section */}
        <section className="max-w-4xl mx-auto px-6 mb-20 space-y-8">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#E7F0EC] border border-[#C9DDD5] text-[11px] font-mono tracking-wider text-[#174A3A] uppercase font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#174A3A]" />
            <span>MANIFESTO</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-[#111111] leading-[1.06]">
            ENCLAVE exists because not every conversation deserves a permanent home.
          </h1>

          <p className="text-lg sm:text-xl text-[#666666] leading-relaxed font-normal">
            In classical architecture, an <span className="text-[#174A3A] font-semibold">enclave</span> was a protected sanctuary nestled inside a wider territory — defined by strong perimeter walls, controlled entryways, and deliberate quietude.
          </p>
        </section>

        {/* Manifesto Content */}
        <section className="max-w-4xl mx-auto px-6 space-y-16">
          <div className="space-y-6 text-base text-[#666666] leading-relaxed">
            <h2 className="text-2xl sm:text-3xl font-medium text-[#111111] tracking-tight">
              The Problem with Permanent Storage
            </h2>
            <p>
              Nearly every modern chat service is built around infinite accumulation. Every message you type is indexed on remote servers, backed up across cloud availability zones, analyzed by machine intelligence, and stored for decades.
            </p>
            <p>
              This architecture creates immense liability. Databases leak. Credentials are stolen. Subpoenas demand historical logs.
            </p>
            <p className="text-[#111111] font-medium text-lg pt-2">
              ENCLAVE takes a fundamentally different stance: What is never stored can never be compromised.
            </p>
          </div>

          {/* 4 Core Pillars */}
          <div className="space-y-8 pt-8 border-t border-[#E4E4DF]">
            <div className="text-xs font-mono uppercase tracking-widest text-[#174A3A] font-semibold">
              Core Tenets
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pillars.map((pillar, idx) => (
                <div
                  key={idx}
                  className="p-7 rounded-xl bg-[#FFFFFF] border border-[#E4E4DF] space-y-2.5 shadow-xs"
                >
                  <div className="text-xs font-mono text-[#174A3A] font-semibold">
                    0{idx + 1}
                  </div>
                  <h3 className="text-base font-mono font-semibold text-[#111111]">
                    {pillar.title}
                  </h3>
                  <p className="text-sm text-[#666666] leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="max-w-4xl mx-auto px-6 mt-20 pt-12 border-t border-[#E4E4DF] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-medium text-[#111111]">
              Start an ephemeral conversation
            </h3>
            <p className="text-xs text-[#666666] mt-1 font-mono">
              No phone numbers. No permanent account logs.
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
