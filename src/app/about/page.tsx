import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShieldCheck, Lock, EyeOff, Trash2, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About ENCLAVE | Ephemeral Privacy & Architecture',
  description: 'Learn about ENCLAVE\'s mission and cryptographic principles. We build ephemeral, zero-knowledge chambers that leave no permanent trace.',
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
    title: 'About ENCLAVE | Ephemeral Privacy & Architecture',
    description: "ENCLAVE exists because conversations shouldn't be permanent.",
    url: 'https://enclave.vercel.app/about',
    siteName: 'ENCLAVE',
    type: 'website',
    images: [
      {
        url: 'https://enclave.vercel.app/og-image.png',
        secureUrl: 'https://enclave.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'About ENCLAVE',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About ENCLAVE | Ephemeral Privacy & Architecture',
    description: 'Private by design. Gone when you leave.',
    images: ['https://enclave.vercel.app/og-image.png'],
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
      desc: 'When the final participant leaves, the room is permanently dissolved. There are no message archives, historical logs, or hidden recovery mechanisms.'
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
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col selection:bg-[var(--accent-soft)] selection:text-[var(--accent)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main className="flex-1 pt-28 sm:pt-32 pb-24">
        {/* Hero Section */}
        <section className="max-w-4xl mx-auto px-6 mb-20 space-y-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[var(--surface-muted)] border border-[var(--border)] text-[11px] font-mono tracking-wider text-[var(--accent)] uppercase font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span>MANIFESTO &amp; MISSION</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif italic font-normal tracking-tight text-[var(--text-primary)] leading-[1.06]">
            ENCLAVE exists because not every conversation deserves a permanent home.
          </h1>

          <p className="text-lg sm:text-xl text-[var(--text-secondary)] leading-relaxed font-normal">
            In classical architecture, an <span className="text-[var(--accent)] font-semibold">enclave</span> was a protected sanctuary nestled inside a wider territory — defined by strong perimeter walls, controlled entryways, and deliberate quietude.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
              <span>Zero Permanent Retention</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
              <span>AES-256-GCM + X25519</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
              <span>Open Protocol Architecture</span>
            </span>
          </div>
        </section>

        {/* Manifesto Content */}
        <section className="max-w-4xl mx-auto px-6 space-y-16">
          <div className="space-y-6 text-base text-[var(--text-secondary)] leading-relaxed">
            <h2 className="text-2xl sm:text-3xl font-medium text-[var(--text-primary)] tracking-tight">
              The Fundamental Flaw of Infinite Data Accumulation
            </h2>
            <p>
              Nearly every modern chat service is built around infinite accumulation. Every message you type is indexed on remote servers, backed up across cloud availability zones, analyzed by machine intelligence, and stored for decades.
            </p>
            <p>
              This architecture creates immense vulnerability. Databases leak. Credentials are stolen. Subpoenas demand historical logs. Metadata maps relationships and habits across years.
            </p>
            <p className="text-[var(--text-primary)] font-medium text-lg pt-2 bg-[var(--accent-soft)] p-5 rounded-xl border border-[var(--accent-border)]">
              ENCLAVE takes a fundamentally different stance: <strong className="text-[var(--accent)]">What is never stored can never be compromised.</strong>
            </p>
          </div>

          {/* 4 Core Pillars */}
          <div className="space-y-8 pt-8 border-t border-[var(--border)]">
            <div className="text-xs font-mono uppercase tracking-widest text-[var(--accent)] font-semibold">
              Our Invariant Architectural Pillars
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pillars.map((pillar, idx) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={idx}
                    className="p-7 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-3.5 shadow-xs hover:border-[var(--accent-border)] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-mono text-[var(--accent)] font-semibold">
                        PILLAR 0{idx + 1}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Engineering & Team Philosophy */}
          <div className="space-y-6 pt-8 border-t border-[var(--border)]">
            <div className="text-xs font-mono uppercase tracking-widest text-[var(--accent)] font-semibold">
              OUR ENGINEERING ETHOS
            </div>
            <h2 className="text-2xl sm:text-3xl font-medium text-[var(--text-primary)] tracking-tight">
              Designed by Cryptographers &amp; Privacy Engineers
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              We do not track advertising IDs, sell telemetry, or train artificial intelligence models on your communications. Our code is written to verify mathematical trust, and our servers operate blindly on volatile RAM without mounting writeable message databases.
            </p>

            <div className="p-6 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-semibold text-[var(--text-primary)]">Read our Cryptographic Specifications</h4>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Explore key wrapping, nonce management, and threat model boundaries.</p>
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
        <section className="max-w-4xl mx-auto px-6 mt-20 pt-12 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-medium text-[var(--text-primary)]">
              Start an ephemeral conversation
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">
              No phone numbers. No permanent account logs. 100% Free.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button asChild size="lg" className="px-6 h-11 text-xs font-mono tracking-wider font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white">
              <Link href="/signup" className="flex items-center space-x-2">
                <span>START CHATTING</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="px-6 h-11 text-xs font-mono tracking-wider font-semibold border-[var(--border-strong)]">
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
