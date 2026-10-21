import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShieldCheck, Lock, EyeOff, Trash2, HeartHandshake, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About ENCLAVE | The World of Privacy & Ephemeral Messaging Manifesto',
  description: 'Learn about ENCLAVE’s mission, cryptographic principles, and team ethos. We build ephemeral, zero-knowledge communication chambers that leave no permanent trace.',
  keywords: [
    'about ENCLAVE',
    'ephemeral messaging manifesto',
    'privacy philosophy',
    'zero retention chat',
    'RAM only engineering team',
    'cryptographic privacy mission'
  ],
  alternates: {
    canonical: 'https://enclave.vercel.app/about',
  },
  openGraph: {
    title: 'About ENCLAVE — The World of Privacy',
    description: 'ENCLAVE exists because not every conversation deserves a permanent home.',
    url: 'https://enclave.vercel.app/about',
    siteName: 'ENCLAVE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About ENCLAVE — The World of Privacy',
    description: 'Private by design. Gone when you leave. The ENCLAVE philosophy.',
  },
};

export default function AboutPage() {
  const pillars = [
    {
      icon: EyeOff,
      title: 'Presence over permanence.',
      desc: 'Digital platforms turn human speech into infinite searchable archives. We believe private conversations should happen, conclude, and fade into memory naturally.'
    },
    {
      icon: Trash2,
      title: 'Privacy over accumulation.',
      desc: 'What is never stored can never be subpoenaed, breached, sold, or leaked. ENCLAVE leaves zero residual databases, plaintext logs, or search indexes.'
    },
    {
      icon: Lock,
      title: 'Security over convenience.',
      desc: 'We require a two-factor channel separation: the room link alone cannot unlock the room without the out-of-band access pass, preventing crawler intrusions.'
    },
    {
      icon: ShieldCheck,
      title: 'Deliberate endings over infinite history.',
      desc: 'When the final participant leaves, the room is permanently obliterated. There are no backups, archives, or hidden recovery mechanisms.'
    }
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About ENCLAVE',
    description: 'The cryptographic manifesto, privacy philosophy, and mission of ENCLAVE.',
    url: 'https://enclave.vercel.app/about',
    publisher: {
      '@type': 'Organization',
      name: 'ENCLAVE',
      url: 'https://enclave.vercel.app',
      sameAs: [
        'https://enclave-rust.vercel.app'
      ]
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
        {/* Hero Section */}
        <section className="max-w-4xl mx-auto px-6 mb-20 space-y-8">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#E7F0EC] border border-[#C9DDD5] text-[11px] font-mono tracking-wider text-[#174A3A] uppercase font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#174A3A]" />
            <span>MANIFESTO & MISSION</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-[#111111] leading-[1.06]">
            ENCLAVE exists because not every conversation deserves a permanent home.
          </h1>

          <p className="text-lg sm:text-xl text-[#666666] leading-relaxed font-normal">
            In classical architecture, an <span className="text-[#174A3A] font-semibold">enclave</span> was a protected sanctuary nestled inside a wider territory — defined by strong perimeter walls, controlled entryways, and deliberate quietude.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-[#666666]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#174A3A]" />
              <span>Zero Permanent Retention</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#174A3A]" />
              <span>AES-256-GCM + X25519</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#174A3A]" />
              <span>Open Protocol Architecture</span>
            </span>
          </div>
        </section>

        {/* Manifesto Content */}
        <section className="max-w-4xl mx-auto px-6 space-y-16">
          <div className="space-y-6 text-base text-[#666666] leading-relaxed">
            <h2 className="text-2xl sm:text-3xl font-medium text-[#111111] tracking-tight">
              The Fundamental Flaw of Infinite Data Accumulation
            </h2>
            <p>
              Nearly every modern chat service is built around infinite accumulation. Every message you type is indexed on remote servers, backed up across cloud availability zones, analyzed by machine intelligence, and stored for decades.
            </p>
            <p>
              This architecture creates immense vulnerability. Databases leak. Credentials are stolen. Subpoenas demand historical logs. Metadata maps relationships and habits across years.
            </p>
            <p className="text-[#111111] font-medium text-lg pt-2 bg-[#E7F0EC] p-5 rounded-xl border border-[#C9DDD5]">
              ENCLAVE takes a fundamentally different stance: <strong className="text-[#174A3A]">What is never stored can never be compromised.</strong>
            </p>
          </div>

          {/* 4 Core Pillars */}
          <div className="space-y-8 pt-8 border-t border-[#E4E4DF]">
            <div className="text-xs font-mono uppercase tracking-widest text-[#174A3A] font-semibold">
              Our Invariant Architectural Pillars
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pillars.map((pillar, idx) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={idx}
                    className="p-7 rounded-2xl bg-[#FFFFFF] border border-[#E4E4DF] space-y-3.5 shadow-xs hover:border-[#C9DDD5] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-lg bg-[#E7F0EC] text-[#174A3A] flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-mono text-[#174A3A] font-semibold">
                        PILLAR 0{idx + 1}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-[#111111]">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Engineering & Team Philosophy */}
          <div className="space-y-6 pt-8 border-t border-[#E4E4DF]">
            <div className="text-xs font-mono uppercase tracking-widest text-[#174A3A] font-semibold">
              OUR ENGINEERING ETHOS
            </div>
            <h2 className="text-2xl sm:text-3xl font-medium text-[#111111] tracking-tight">
              Designed by Cryptographers & Privacy Engineers
            </h2>
            <p className="text-sm sm:text-base text-[#666666] leading-relaxed">
              We do not track advertising IDs, sell telemetry, or train artificial intelligence models on your communications. Our code is written to verify mathematical trust, and our servers operate blindly on volatile RAM without mounting writeable message databases.
            </p>

            <div className="p-6 rounded-2xl bg-[#F4F4F0] border border-[#E4E4DF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-semibold text-[#111111]">Read our Cryptographic Specifications</h4>
                <p className="text-xs text-[#666666] mt-0.5">Explore key wrapping, nonce management, and threat model boundaries.</p>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0 text-xs font-mono">
                <Link href="/security">
                  <span>View Security Architecture &rarr;</span>
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="max-w-4xl mx-auto px-6 mt-20 pt-12 border-t border-[#E4E4DF] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-medium text-[#111111]">
              Start an ephemeral conversation
            </h3>
            <p className="text-xs text-[#666666] mt-1 font-mono">
              No phone numbers. No permanent account logs. 100% Free.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button asChild size="lg" className="px-6 h-11 text-xs font-mono tracking-wider font-semibold">
              <Link href="/signup" className="flex items-center space-x-2">
                <span>START CHATTING</span>
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
